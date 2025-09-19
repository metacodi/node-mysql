"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MySqlDatabase = void 0;
const mysql = __importStar(require("mysql2"));
const api_model_1 = require("@metacodi/api-model");
/** MySQL/MariaDB database access library for Node.js.
 *
 * Provides:
 * - One-off queries via pools
 * - Prepared statements with per-environment cache
 * - Multi-environment support (dev, pre, pro)
 * - Schema discovery and helpers
 */
class MySqlDatabase {
    constructor(env, credentials) {
        this.env = env;
        this.engine = 'MySQL';
        /** Per-environment pools for one-off queries. */
        this.pools = {};
        /** Connections from the environment pool for batch queries. When finished, call closeAllConnections to release them. */
        this.persistentConnections = {};
        /** Schema table definitions in the generic @metacodi/api-model format. */
        this.tables = [];
        /** Schema table information obtained via database queries. */
        this.schemas = [];
        /** Cache of stored procedures. */
        this.preparedStatements = {};
        // ---------------------------------------------------------------------------------------------------
        //  Lang tables
        // ---------------------------------------------------------------------------------------------------
        /** Foreign-key field name for lang tables. */
        this.langField = 'idLang';
        /** Suffix for lang table names. */
        this.langTableSufix = '_lang';
        // If no environment is specified, we use the one from initialization.
        this.credentials = ((0, api_model_1.isDatabaseConnection)(credentials) ? { [env]: credentials } : credentials);
    }
    // ---------------------------------------------------------------------------------------------------
    //  Queries
    // ---------------------------------------------------------------------------------------------------
    /** Execute an SQL query using the pool for the selected environment.
     *
     * @param namedPlaceholders
     */
    async query(sql, options) {
        const pool = await this.getPool(options);
        const [rows, def] = await pool.query(sql);
        return rows;
    }
    /** Execute an SQL query and return the first column of the first row.
     *
     * @return The first column value of the first result row.
     */
    async getValue(sql, options) {
        if (!options) {
            options = {};
        }
        const env = options.env === undefined ? this.env : options.env;
        const throwError = options.throwError === undefined ? false : !!options.throwError;
        const pool = await this.getPool({ env });
        const [rows, def] = await pool.query(sql);
        // If no rows were found, optionally throw.
        if (throwError && (!Array.isArray(rows) || !rows.length)) {
            throw options.error || `No rows found for the given criteria.`;
        }
        // Take the value of the first column (first property) of the first row.
        const getFirstValue = (obj) => { for (const prop in obj) {
            return obj[prop];
        } };
        // Return first value.
        return Array.isArray(rows) && rows.length > 0 ? getFirstValue(rows[0]) : undefined;
    }
    /** Execute an SQL query and return the first row from results.
     *
     * @return The first row found in the results.
     */
    async getRow(sql, options) {
        if (!options) {
            options = {};
        }
        const env = options.env === undefined ? this.env : options.env;
        const throwError = options.throwError === undefined ? true : !!options.throwError;
        const pool = await this.getPool({ env });
        const [rows, def] = await pool.query(sql);
        // If no rows were found, optionally throw.
        if (throwError && (!Array.isArray(rows) || !rows.length)) {
            throw options.error || `No rows found for the given criteria.`;
        }
        // Return first row.
        return Array.isArray(rows) && rows.length > 0 ? rows[0] : undefined;
    }
    // ---------------------------------------------------------------------------------------------------
    //  Prepared Statements
    // ---------------------------------------------------------------------------------------------------
    /** {@link https://sidorares.github.io/node-mysql2/docs/documentation/prepared-statements Prepared Statements} */
    /** {@link https://github.com/mysqljs/named-placeholders GitHub package @mysqljs/named-placeholders} */
    /** Prepare a statement and store it in the environment cache by key. */
    async prepare(key, query, options) {
        if (!options) {
            options = {};
        }
        const env = options.env === undefined ? this.env : options.env;
        const namedPlaceholders = options.namedPlaceholders === undefined ? true : options.namedPlaceholders;
        // Prepare the environment.
        if (!this.preparedStatements[env]) {
            this.preparedStatements[env] = { connection: await this.getPersistentConnection(options), statements: {} };
        }
        const { connection, statements } = this.preparedStatements[env];
        // If it already exists in the cache, return it.
        if (statements[key]) {
            return statements[key];
        }
        // Prepare the statement to execute.
        const sql = typeof query === 'string' ? query : query.sql;
        // Obtain parameter info and the sanitized statement.
        const paramsInfo = namedPlaceholders ? this.parseNamedParams(sql) : undefined;
        const sanitizedSql = namedPlaceholders ? this.replaceNamedParams(sql, paramsInfo) : sql;
        // Prepare the sanitized query.
        const statementInfo = await connection.prepare(sanitizedSql);
        // Store all the info in the cache.
        statements[key] = { sanitizedSql, paramsInfo, statementInfo, close: () => this.unprepare(key), execute: async (values) => {
                // NOTE: Build an array with values in the same order they were parsed.
                const preparedValues = Object.keys(paramsInfo).map(param => values[param]);
                return statementInfo.execute(preparedValues);
            } };
        return statements[key];
    }
    /** Close a prepared statement and remove it from the cache. */
    async unprepare(key, options) {
        if (!options) {
            options = {};
        }
        const env = options.env === undefined ? this.env : options.env;
        // Prepare the environment, providing a connection for each environment.
        if (!this.preparedStatements[env]) {
            this.preparedStatements[env] = { connection: await this.getPersistentConnection(options), statements: {} };
        }
        const { statements } = this.preparedStatements[env];
        // Check if it exists.
        if (statements[key]) {
            try {
                statements[key].statementInfo.close();
            }
            catch (error) {
                // NOTE: We do nothing.
            }
            delete statements[key];
        }
    }
    /** Return a map of named parameters with their start positions within the SQL string.
     *
     * @param sql SQL string with named parameters.
     * @returns Literal object where keys are param names and values are their positions. Ex: { total: 21, id: 45 }
     */
    parseNamedParams(sql) {
        const DQUOTE = 34;
        const SQUOTE = 39;
        const BSLASH = 92;
        const stack = {};
        let paramName = ""; // Text accumulator.
        let paramPos; // Indicates the starting position of the parameter.
        let inParam = false; // We are capturing a parameter name.
        let inQuote = false; // Control for string literals.
        let quoteChar; // Indicates the quote character used to start the string (to detect when it ends).
        let escape = false; // Indicates when the next character is escaped (preceded by a backslash).
        for (let i = 0; i < sql.length; i++) {
            const chr = sql[i];
            const code = sql.charCodeAt(i);
            if (code === BSLASH) {
                escape = !escape;
                continue;
            }
            else if (escape) {
                escape = false;
                continue;
            }
            else {
                if (inQuote) {
                    if (code === quoteChar) {
                        if (sql.charCodeAt(i + 1) === quoteChar) {
                            // quote escaped via "" or ''
                            ++i;
                            continue;
                        }
                        inQuote = false;
                        quoteChar = '';
                    }
                }
                else if (inParam) {
                    if (/[a-zA-Z0-9_]/.test(chr)) {
                        paramName += chr;
                    }
                    else {
                        if (paramName.length > 0) {
                            stack[paramName] = paramPos;
                            paramName = '';
                        }
                        else {
                            throw `No s'ha pogut recuperar el nom del paràmetre a la posició ${paramPos}`;
                        }
                        inParam = chr === ':'; // Accept two consecutive parameters (e.g., ':total:resta') if the new char starts a parameter.
                        paramPos = inParam ? i : -1;
                    }
                }
                else if (code === DQUOTE || code === SQUOTE) {
                    inQuote = true;
                    quoteChar = code;
                }
                else if (chr === ':') {
                    inParam = true;
                    paramPos = i;
                }
            }
        }
        // If the last character is a parameter, process it now.
        if (inParam) {
            if (paramName.length > 0) {
                stack[paramName] = paramPos;
                paramName = '';
            }
            else {
                throw `No s'ha pogut recuperar el nom del paràmetre a la posició ${paramPos}`;
            }
        }
        return stack;
    }
    /** Return the SQL string with named parameters replaced by native placeholders.
     *
     * @param sql SQL string with named parameters.
     * @param params Located parameters (output of `parseNamedParams`).
     * @param numbered Most engines use '?' placeholders, while Postgres uses numbered '$1'.
     */
    replaceNamedParams(sql, params, options) {
        if (!options) {
            options = {};
        }
        const numbered = options.numbered === undefined ? false : options.numbered;
        Object.keys(params).reverse().map((key, idx) => {
            const i = params[key];
            const p = numbered ? `\$${Object.keys(params).length - idx}` : '?';
            sql = sql.substring(0, i) + p + sql.substring(i + 1 + key.length, sql.length);
        });
        return sql;
    }
    // ---------------------------------------------------------------------------------------------------
    //  Database connections
    // ---------------------------------------------------------------------------------------------------
    /** Get an environment pool for one-off queries (auto-managed connections). */
    getPool(options) {
        if (!options) {
            options = {};
        }
        const env = options.env === undefined ? this.env : options.env;
        // Enable named placeholders so we can use :id instead of '?'.
        const namedPlaceholders = options.namedPlaceholders === undefined ? true : options.namedPlaceholders;
        return new Promise((resolve, reject) => {
            if (!this.pools[env]) {
                // Read credentials for the environment.
                const { hostname: host, username: user, password, database } = this.credentials[env];
                // Create a new pool and store it in the collection.
                const config = { connectionLimit: 10, host, user, password, database, namedPlaceholders };
                try {
                    const pool = mysql.createPool(config).promise();
                    this.pools[env] = pool;
                }
                catch (error) {
                    reject(error);
                    return;
                }
            }
            resolve(this.pools[env]);
        });
    }
    /** Get a persistent connection from the pool for batch queries. Call `release()` when finished. */
    async getPersistentConnection(options) {
        if (!options) {
            options = {};
        }
        const env = options.env === undefined ? this.env : options.env;
        // Enable named placeholders so we can use :id instead of '?'.
        const namedPlaceholders = options.namedPlaceholders === undefined ? true : options.namedPlaceholders;
        const pool = await this.getPool({ env, namedPlaceholders });
        // @ts-ignore
        if (!pool) {
            return undefined;
        }
        const conn = await pool.getConnection();
        if (!Array.isArray(this.persistentConnections[env])) {
            this.persistentConnections[env] = [];
        }
        this.persistentConnections[env].push(conn);
        return conn;
    }
    /** Convenience wrapper: acquires a persistent connection, runs the callback, and releases it. */
    async withConnection(fn, options) {
        const conn = await this.getPersistentConnection(options);
        try {
            return await fn(conn);
        }
        finally {
            try {
                conn.release();
            }
            catch ( /* ignore */_a) { /* ignore */ }
        }
    }
    /** Close all prepared statements, pools, and persistent connections. */
    closeAllConnections() {
        return Promise.all([
            // Close all prepared statements.
            ...Object.keys(this.pools).map(env => Object.keys(this.preparedStatements[env].statements).map(key => { try {
                this.preparedStatements[env].statements[key].statementInfo.close();
            }
            catch (ex) { /* ignore error */ } })),
            // Close each environment pool.
            ...Object.keys(this.pools).map(env => { try {
                return this.pools[env].end();
            }
            catch (ex) { /* ignore error */ } }),
            // End all persistent connections.
            ...Object.keys(this.persistentConnections).reduce((all, env) => [...all, ...this.persistentConnections[env].map(conn => { try {
                    return conn.end();
                }
                catch (ex) { /* ignore error */ } })], []),
        ]);
    }
    // ---------------------------------------------------------------------------------------------------
    //  Schemas
    // ---------------------------------------------------------------------------------------------------
    existsColumn(table, field) {
        table = this.resolveTable(table);
        // Check if the field belongs to the table.
        const column = table.columns.find(c => c.name === field);
        return !!column;
    }
    stringifyRelation(rel, options) {
        if (!options) {
            options = {};
        }
        const quoteEntityName = options.quoteEntityName === undefined ? true : options.quoteEntityName;
        return quoteEntityName ?
            `${this.quoteEntityName(rel.child.table)}.${this.quoteEntityName(rel.child.field)}=${this.quoteEntityName(rel.parent.table)}.${this.quoteEntityName(rel.parent.field)}` :
            `${rel.child.table}.${rel.child.field}=${rel.parent.table}.${rel.parent.field}`;
    }
    sequelizeRelation(rel, options) {
        if (!options) {
            options = {};
        }
        const quoteEntityName = options.quoteEntityName === undefined ? true : options.quoteEntityName;
        return quoteEntityName ?
            `ON ${this.quoteEntityName(rel.child.table)}.${this.quoteEntityName(rel.child.field)} = ${this.quoteEntityName(rel.parent.table)}.${this.quoteEntityName(rel.parent.field)}` :
            `ON ${rel.child.table}.${rel.child.field} = ${rel.parent.table}.${rel.parent.field}`;
    }
    /** Retrieve schema metadata from INFORMATION_SCHEMA. */
    async retrieveSchema(options) {
        if (!options) {
            options = {};
        }
        const forceRefresh = options.forceRefresh === undefined ? false : options.forceRefresh;
        // If we already have tables and no refresh requested, return cached tables.
        if (this.tables.length > 0 && !forceRefresh) {
            return this.tables;
        }
        // Retrieve schema metadata from INFORMATION_SCHEMA.
        const { database } = this.credentials[this.env];
        const tables = await this.query(`SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE table_schema = '${database}';`);
        const columns = await this.query(`SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE table_schema = '${database}';`);
        const relations = await this.query(`SELECT DISTINCT TC.TABLE_NAME, TC.CONSTRAINT_NAME, KCU.COLUMN_NAME, RC.REFERENCED_TABLE_NAME, KCU.REFERENCED_COLUMN_NAME, RC.UPDATE_RULE, RC.DELETE_RULE 
      FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS RC 
        INNER JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS TC ON RC.CONSTRAINT_NAME = TC.CONSTRAINT_NAME 
        INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE KCU ON KCU.CONSTRAINT_NAME = TC.CONSTRAINT_NAME
      WHERE TC.CONSTRAINT_TYPE = 'FOREIGN KEY' AND TC.CONSTRAINT_SCHEMA = '${database}'
      ORDER BY TABLE_NAME
    ;`);
        // Reset collection.
        this.tables.splice(0);
        // Parse raw schema into generic structures.
        for (const schemaTable of tables) {
            const schemaColumns = columns.filter(c => c.TABLE_NAME === schemaTable.TABLE_NAME);
            const schemaPrimaryKey = schemaColumns.find(c => c.COLUMN_KEY === 'PRI');
            const schemaParentRelations = relations.filter(r => r.TABLE_NAME === schemaTable.TABLE_NAME);
            const schemaChildRelations = relations.filter(r => r.REFERENCED_TABLE_NAME === schemaTable.TABLE_NAME);
            this.schemas.push({
                table: schemaTable,
                columns: schemaColumns,
                primaryKey: schemaPrimaryKey === null || schemaPrimaryKey === void 0 ? void 0 : schemaPrimaryKey.COLUMN_NAME,
                parents: schemaParentRelations,
                children: schemaChildRelations,
            });
            const table = this.parseTableSchemaInfo(schemaTable);
            table.columns.push(...schemaColumns.map(c => this.parseColumnSchemaInfo(c)));
            table.primaryKey = schemaPrimaryKey === null || schemaPrimaryKey === void 0 ? void 0 : schemaPrimaryKey.COLUMN_NAME;
            table.parents.push(...schemaParentRelations.map(r => this.parseRelationSchemaInfo(r)));
            table.children.push(...schemaChildRelations.map(r => this.parseRelationSchemaInfo(r)));
            this.tables.push(table);
        }
    }
    parseTableSchemaInfo(schema) {
        const { TABLE_NAME } = schema;
        const table = {
            name: TABLE_NAME,
            columns: [],
            primaryKey: undefined,
            parents: [],
            children: [],
            virtual: false,
        };
        return table;
    }
    parseColumnSchemaInfo(schema) {
        const { COLUMN_NAME, COLUMN_TYPE, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, IS_GENERATED } = schema;
        const column = {
            name: COLUMN_NAME,
            type: COLUMN_TYPE.toLowerCase() === 'tinyint(1)' ? 'boolean' : this.parseColumnType(DATA_TYPE),
            isNullable: IS_NULLABLE === 'YES',
            isPrimaryKey: COLUMN_KEY === 'PRI',
            isUnique: COLUMN_KEY === 'PRI' || COLUMN_KEY === 'UNI',
            isVirtual: IS_GENERATED === 'ALWAYS',
            schema,
        };
        return column;
    }
    parseColumnType(type) {
        switch (type) {
            case 'int':
            case 'decimal':
            case 'double':
            case 'float':
            case 'smallint':
            case 'tinyint':
                return 'number';
            case 'date':
            case 'datetime':
            case 'time':
                return 'string';
            case 'char':
            case 'varchar':
            case 'text':
                return 'string';
            case 'longtext':
                return 'json';
            case 'polygon':
                return 'polygon';
            default:
                throw `Unrecognized MySQL data type '${type}' for conversion to TypeScript.`;
        }
    }
    parseRelationSchemaInfo(schema) {
        const { CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME, TABLE_NAME, COLUMN_NAME, UPDATE_RULE, DELETE_RULE } = schema;
        const relation = {
            name: CONSTRAINT_NAME,
            parent: {
                table: REFERENCED_TABLE_NAME,
                field: REFERENCED_COLUMN_NAME,
            },
            child: {
                table: TABLE_NAME,
                field: COLUMN_NAME,
            },
            update: UPDATE_RULE,
            delete: DELETE_RULE,
        };
        return relation;
    }
    convertToColumnType(value, column) {
        if (value === null)
            return null;
        switch (column.schema.DATA_TYPE) {
            case 'json':
            case 'longtext':
                return JSON.parse(value);
            case 'varchar':
            case 'text':
            case 'char':
                return `${value}`;
            case 'tinyint':
            // $value = (int) $value;
            // if ($typeColumn === 'tinyint(1)' && ($value === 1 || $value === 0)) { $value = (bool) $value; }
            // return $value;
            case 'smallint':
            case 'int':
            case 'integer':
            case 'mediumint':
            case 'bigint':
                return +value;
            case 'float':
            case 'double':
            case 'real':
            case 'decimal':
            case 'numeric':
                return +value;
            case 'date':
            case 'time':
            case 'datetime':
                return `${value}`;
            default:
                throw `Unrecognized MySQL data type '${column.type}' for conversion to TypeScript.`;
        }
    }
    getLangTableName(table) {
        const tableName = typeof table === 'string' ? table : table.name;
        return `${tableName}${this.langTableSufix}`;
    }
    getLangTable(table) {
        const langTableName = this.getLangTableName(table);
        const langTable = this.tables.find(t => t.name !== 'localize' && t.name === langTableName);
        return langTable;
    }
    hasLangTable(table) {
        const langTable = this.getLangTable(table);
        return !!langTable;
    }
    isLangColumn(table, field) {
        table = this.resolveTable(table);
        // Check if the _lang table exists.
        const langTable = this.getLangTable(table);
        if (!langTable) {
            return false;
        }
        // Check if the field belongs to the table.
        const langColumn = langTable.columns.find(c => c.name === field);
        return !!langColumn;
    }
    getLangColumns(table) {
        const tableName = typeof table === 'string' ? table : table.name;
        const langTable = this.getLangTable(table);
        if (!langTable) {
            return [];
        }
        // [ idLocalize, idLang ]
        const foreignKeys = this.getForeignKeys(langTable);
        const langColumns = langTable.columns.filter(fk => 
        // If it is `localize`, allow the 'idLang' column because it is required.
        (tableName === 'localize' && fk.name === this.langField /* idLang */) ||
            // Do not include foreign-key fields (idLocalize, idLang) nor the primary key.
            (!foreignKeys.includes(fk.name) && fk.name !== langTable.primaryKey));
        return langColumns;
    }
    getColumnsAndLangColumns(table) {
        table = this.resolveTable(table);
        const langColumns = this.hasLangTable(table.name) ? this.getLangColumns(table) : [];
        const allColumns = [...table.columns, ...langColumns];
        return allColumns;
    }
    existsColumnOrLangColumn(table, field) {
        table = this.resolveTable(table);
        // Check if the field belongs to the table.
        const column = table.columns.find(c => c.name === field);
        if (column) {
            return true;
        }
        // Check if the _lang table exists.
        const langTable = this.getLangTable(table);
        if (!langTable) {
            return false;
        }
        // Check if the field belongs to the table.
        const langColumn = langTable.columns.find(c => c.name === field);
        return !!langColumn;
    }
    // ---------------------------------------------------------------------------------------------------
    //  Helpers
    // ---------------------------------------------------------------------------------------------------
    resolveTable(table, options) {
        if (!options) {
            options = {};
        }
        const throwError = options.throwError === undefined ? true : options.throwError;
        table = typeof table === 'string' ? this.tables.find(t => t.name === table) : table;
        if (!table && throwError) {
            throw `Table '${table}' was not found in the database.`;
        }
        return table;
    }
    /** Return an array with the names of columns that are foreign keys. */
    getForeignKeys(table) {
        table = this.resolveTable(table);
        const foreignKeys = table.parents.map(relation => relation.child.field);
        return foreignKeys;
    }
    /** Return an array with the column objects that are foreign keys. */
    getForeignColumns(table) {
        table = this.resolveTable(table);
        const foreignKeys = table.parents.map(relation => table.columns.find(c => c.name === relation.child.field));
        return foreignKeys;
    }
    /** Upsert a row using the provided connection.
     *
     * @param primaryKey Primary key column name. @default `id`.
     * @param prefixFieldsWithTable Whether to prefix fields with the table name. @default false
     * @param selectWithAsterik Whether to use '*' in SELECT instead of explicit columns. @default false
     * @returns Metadata about the changes applied.
     */
    async syncRow(table, row, options) {
        if (!options) {
            options = {};
        }
        const conn = options.conn === undefined ? await this.getPool() : options.conn;
        const tableName = typeof table === 'string' ? table : table.name;
        // Build SQL statements for the current row.
        const crud = this.sequelizeCrudStatements(tableName, row, options);
        const { select, insert, update } = crud.interpolated;
        // Check if the row to update exists.
        const [checked, fields] = await conn.query(select);
        const result = Array.isArray(checked) ? checked : [checked];
        const query = result.length ? update : insert;
        // if (Prompt.verbose) { console.log(chalk.blueBright(query)); }
        const [rows] = await conn.query(query);
        return rows;
    }
    /** Return the last update time of the given table.
     *
     * @deprecated Use `queryTableAuditTimes()` instead to get both created and updated timestamps.
    */
    async queryTableLastUpdate(table, options) {
        if (!options) {
            options = {};
        }
        const conn = options.conn === undefined ? await this.getPool() : options.conn;
        table = this.resolveTable(table);
        const [rows] = await conn.query(`SELECT UPDATE_TIME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '${table.name}'`);
        const result = Array.isArray(rows) ? rows : [rows];
        return Promise.resolve(result.length ? this.formatDateTime(result[0].UPDATE_TIME) : undefined);
    }
    /** Return created and last-updated timestamps for the given table.
     *
     * ```typescript
     * @returns { created: string; updated: string; }
     * ```
    */
    async queryTableAuditTimes(table, options) {
        if (!options) {
            options = {};
        }
        const conn = options.conn === undefined ? await this.getPool() : options.conn;
        table = this.resolveTable(table);
        const [rows] = await conn.query(`SELECT CREATE_TIME, UPDATE_TIME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '${table.name}'`);
        const result = Array.isArray(rows) ? rows : [rows];
        if (result.length) {
            const response = {
                created: this.formatDateTime(result[0].CREATE_TIME),
                updated: this.formatDateTime(result[0].UPDATE_TIME),
            };
            return response;
        }
        else {
            return undefined;
        }
    }
    // ---------------------------------------------------------------------------------------------------
    //  sequelize
    // ---------------------------------------------------------------------------------------------------
    /** Return the entity name (table/field/function) wrapped in backticks. */
    quoteEntityName(name) { return name ? (name.startsWith('`') ? name : `\`${name}\``) : ''; }
    /** Convert a JS value into a valid SQL literal. */
    // return value instanceof Date && !isNaN(value as any) ? this.formatDateTime(value) : `${value}`;
    sequelizeValue(value, options) {
        if (!options) {
            options = {};
        }
        const scapeParamValues = options.scapeParamValues === undefined ? true : options.scapeParamValues;
        if (value instanceof Date && !isNaN(value)) {
            const date = this.formatDateTime(value);
            return scapeParamValues ? mysql.escape(date) : date;
        }
        else if (value === undefined || value === null) {
            return 'null';
        }
        else if (typeof value === 'number') {
            return `${value}`;
        }
        else {
            return scapeParamValues ? mysql.escape(`${value}`) : `${value}`;
        }
    }
    /** Replace named parameters in a parameterized query string with provided values. */
    interpolateQuery(query, params, options) {
        if (!params || typeof params !== 'object')
            return query;
        if (!options) {
            options = {};
        }
        if (options.paramsInterpolation === undefined) {
            options.paramsInterpolation = 'raw';
        }
        const paramsInterpolation = options.paramsInterpolation === undefined ? 'raw' : options.paramsInterpolation;
        const scapeParamValues = paramsInterpolation === 'scape';
        const sequelizeParamValues = paramsInterpolation === 'sequelize';
        const interpolated = query.replace(/\:(\w+)/g, (txt, name) => params.hasOwnProperty(name) ?
            (sequelizeParamValues ? this.sequelizeValue(params[name], { scapeParamValues: true }) :
                (scapeParamValues ? mysql.escape(params[name]) : params[name])) : txt);
        return interpolated;
    }
    /** Generate parameterized and interpolated SQL statements for the given row.
     *
     * @param primaryKey Primary key column name. default `id`.
     * @param prefixFieldsWithTable Whether to prefix fields with the table name. default `false`.
     * @param selectWithAsterik Whether to use '*' in the select. default `false`.
     * @returns
     * ```typescript
     * {
     *   parameterized: {
     *     select: 'SELECT * FROM `customers`',
     *     insert: 'INSERT INTO `customers` (`id`, `id_user`, `id_company`, `id_provider`, `id_payment`, `is_authorized`, `created`, `updated`, `deleted`) VALUES (:id, :id_user, :id_company, :id_provider, :id_payment, :is_authorized, :created, :updated, :deleted)',
     *     update: 'UPDATE `customers` SET `customers`.`id` = :id, `customers`.`id_user` = :id_user, `customers`.`id_company` = :id_company, `customers`.`id_provider` = :id_provider, `customers`.`id_payment` = :id_payment, `customers`.`is_authorized` = :is_authorized, `customers`.`created` = :created, `customers`.`updated` = :updated, `customers`.`deleted` = :deleted WHERE `customers`.`id` = 11575',
     *     delete: 'DELETE FROM `customers`',
     *   }
     *   interpolated: {
     *     select: 'SELECT * FROM `customers` WHERE `customers`.`id` = 11575',
     *     insert: 'INSERT INTO `customers` (`id`, `id_user`, `id_company`, `id_provider`, `id_payment`, `is_authorized`, `created`, `updated`, `deleted`) VALUES (11575, 11583, null, 100, null, 0, '2024-04-30 16:20:28', '2024-04-30 16:20:28', null)',
     *     update: 'UPDATE `customers` SET `customers`.`id` = 11575, `customers`.`id_user` = 11583, `customers`.`id_company` = null, `customers`.`id_provider` = 100, `customers`.`id_payment` = null, `customers`.`is_authorized` = 0, `customers`.`created` = '2024-04-30 16:20:28', `customers`.`updated` = '2024-04-30 16:20:28', `customers`.`deleted` = null WHERE `customers`.`id` = 11575',
     *     delete: 'DELETE FROM `customers` `customers` WHERE `customers`.`id` = 11575',
     *   },
     *   tokens: {
     *     table: '`customers`',
     *     fields: [
     *       '`id`',
     *       '`id_user`',
     *       '`id_company`',
     *       '`id_provider`',
     *       '`id_payment`',
     *       '`is_authorized`',
     *       '`created`',
     *       '`updated`',
     *       '`deleted`',
     *     ],
     *     columns: [
     *       '`customers`.`id`',
     *       '`customers`.`id_user`',
     *       '`customers`.`id_company`',
     *       '`customers`.`id_provider`',
     *       '`customers`.`id_payment`',
     *       '`customers`.`is_authorized`',
     *       '`customers`.`created`',
     *       '`customers`.`updated`',
     *       '`customers`.`deleted`',
     *     ],
     *     params: [
     *       ':id',
     *       ':id_user',
     *       ':id_company',
     *       ':id_provider',
     *       ':id_payment',
     *       ':is_authorized',
     *       ':created',
     *       ':updated',
     *       ':deleted',
     *     ],
     *     pairs: [
     *       '`customers`.`id` = :id',
     *       '`customers`.`id_user` = :id_user',
     *       '`customers`.`id_company` = :id_company',
     *       '`customers`.`id_provider` = :id_provider',
     *       '`customers`.`id_payment` = :id_payment',
     *       '`customers`.`is_authorized` = :is_authorized',
     *       '`customers`.`created` = :created',
     *       '`customers`.`updated` = :updated',
     *       '`customers`.`deleted` = :deleted',
     *     ],
     *     values: {
     *       id: '11575',
     *       id_user: '11583',
     *       id_company: 'null',
     *       id_provider: '100',
     *       id_payment: 'null',
     *       is_authorized: '0',
     *       created: '2024-04-30 16:20:28',
     *       updated: '2024-04-30 16:20:28',
     *       deleted: 'null',
     *     },
     *     primaryKey: '`customers`.`id`',
     *     id: 11575,
     *   }
     * ```
     */
    sequelizeCrudStatements(table, row, options) {
        if (!options) {
            options = {};
        }
        const primaryKey = options.primaryKey === undefined ? 'id' : options.primaryKey;
        const prefixFieldsWithTable = options.prefixFieldsWithTable === undefined ? false : options.prefixFieldsWithTable;
        const selectWithAsterik = options.selectWithAsterik === undefined ? false : options.selectWithAsterik;
        const quoteField = (table, field) => prefixFieldsWithTable ? `${this.quoteEntityName(table)}.${this.quoteEntityName(field)}` : this.quoteEntityName(field);
        table = this.quoteEntityName(table);
        const pk = quoteField(table, primaryKey);
        const id = row[primaryKey];
        const fields = [];
        const columns = [];
        const params = [];
        const pairs = [];
        const values = {};
        for (const field of Object.keys(row)) {
            fields.push(this.quoteEntityName(field));
            columns.push(quoteField(table, field));
            params.push(`:${field}`);
            pairs.push(`${quoteField(table, field)} = :${field}`);
            // NOTE: Escape parameter values before interpolation.
            values[field] = this.sequelizeValue(row[field], { scapeParamValues: true });
        }
        const parameterized = {
            select: `SELECT ${selectWithAsterik ? '*' : columns.join(', ')} FROM ${table}`,
            insert: `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${params.join(', ')})`,
            update: `UPDATE ${table} SET ${pairs.join(', ')} WHERE ${pk} = ${id}`,
            delete: `DELETE FROM ${table}`,
        };
        const interpolated = {
            select: `SELECT ${selectWithAsterik ? '*' : columns.join(', ')} FROM ${table} WHERE ${pk} = ${id}`,
            insert: this.interpolateQuery(parameterized.insert, values),
            update: this.interpolateQuery(parameterized.update, values),
            delete: `DELETE FROM ${table} WHERE ${pk} = ${id}`,
        };
        const tokens = { table, fields, columns, params, pairs, values, primaryKey: pk, id };
        return { parameterized, interpolated, tokens };
    }
    // ---------------------------------------------------------------------------------------------------
    //  Typescript types conversion
    // ---------------------------------------------------------------------------------------------------
    isArray(Type) { return /^\[[^\]]*\]$/.test(Type) || /^[^\]]*\[\]$/.test(Type); }
    isJsonType(Type) { return Type === 'json' || Type.startsWith('longtext'); }
    isBooleanType(Type) { return Type === 'boolean' || Type.startsWith('tinyint(1)') || Type.startsWith('bool'); }
    isDatetimeType(Type) { return Type.startsWith('datetime') || Type.startsWith('date') || Type.startsWith('time'); }
    isStringType(Type) { return Type === 'string' || Type.startsWith('varchar') || Type.startsWith('char') || Type.startsWith('text'); }
    isNumberType(Type) {
        return Type === 'number' ||
            Type.startsWith('int') || Type.startsWith('integer') || Type.startsWith('smallint') || Type.startsWith('mediumint') || Type.startsWith('bigint') ||
            Type.startsWith('float') || Type.startsWith('double') || Type.startsWith('decimal') || Type.startsWith('dec') || Type.startsWith('numeric') ||
            (Type.startsWith('tinyint') && !Type.startsWith('tinyint(1)'));
    }
    // -----------------------------------------------------------------------------------------------
    //  Internal helpers
    // -----------------------------------------------------------------------------------------------
    /** Format a Date/string/number into 'YYYY-MM-DD HH:mm:ss' (local time). */
    formatDateTime(input) {
        const d = (input instanceof Date) ? input : new Date(input);
        if (isNaN(d.getTime())) {
            return `${input}`;
        }
        const pad = (n) => (n < 10 ? '0' : '') + n;
        const yyyy = d.getFullYear();
        const MM = pad(d.getMonth() + 1);
        const dd = pad(d.getDate());
        const HH = pad(d.getHours());
        const mm = pad(d.getMinutes());
        const ss = pad(d.getSeconds());
        return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}`;
    }
}
exports.MySqlDatabase = MySqlDatabase;
//# sourceMappingURL=mysql-database.js.map