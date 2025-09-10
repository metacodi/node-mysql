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
class MySqlDatabase {
    constructor(env, credentials) {
        this.env = env;
        this.engine = 'MySQL';
        this.pools = {};
        this.persistentConnections = {};
        this.tables = [];
        this.schemas = [];
        this.preparedStatements = {};
        this.langField = 'idLang';
        this.langTableSufix = '_lang';
        this.credentials = ((0, api_model_1.isDatabaseConnection)(credentials) ? { [env]: credentials } : credentials);
    }
    async query(sql, options) {
        const pool = await this.getPool(options);
        const [rows, def] = await pool.query(sql);
        return rows;
    }
    async getValue(sql, options) {
        if (!options) {
            options = {};
        }
        const env = options.env === undefined ? this.env : options.env;
        const throwError = options.throwError === undefined ? false : !!options.throwError;
        const pool = await this.getPool({ env });
        const [rows, def] = await pool.query(sql);
        if (throwError && (!Array.isArray(rows) || !rows.length)) {
            throw options.error || `No rows found for the given criteria.`;
        }
        const getFirstValue = (obj) => { for (const prop in obj) {
            return obj[prop];
        } };
        return Array.isArray(rows) && rows.length > 0 ? getFirstValue(rows[0]) : undefined;
    }
    async getRow(sql, options) {
        if (!options) {
            options = {};
        }
        const env = options.env === undefined ? this.env : options.env;
        const throwError = options.throwError === undefined ? true : !!options.throwError;
        const pool = await this.getPool({ env });
        const [rows, def] = await pool.query(sql);
        if (throwError && (!Array.isArray(rows) || !rows.length)) {
            throw options.error || `No rows found for the given criteria.`;
        }
        return Array.isArray(rows) && rows.length > 0 ? rows[0] : undefined;
    }
    async prepare(key, query, options) {
        if (!options) {
            options = {};
        }
        const env = options.env === undefined ? this.env : options.env;
        const namedPlaceholders = options.namedPlaceholders === undefined ? true : options.namedPlaceholders;
        if (!this.preparedStatements[env]) {
            this.preparedStatements[env] = { connection: await this.getPersistentConnection(options), statements: {} };
        }
        const { connection, statements } = this.preparedStatements[env];
        if (statements[key]) {
            return statements[key];
        }
        const sql = typeof query === 'string' ? query : query.sql;
        const paramsInfo = namedPlaceholders ? this.parseNamedParams(sql) : undefined;
        const sanitizedSql = namedPlaceholders ? this.replaceNamedParams(sql, paramsInfo) : sql;
        const statementInfo = await connection.prepare(sanitizedSql);
        statements[key] = { sanitizedSql, paramsInfo, statementInfo, close: () => this.unprepare(key), execute: async (values) => {
                const preparedValues = Object.keys(paramsInfo).map(param => values[param]);
                return statementInfo.execute(preparedValues);
            } };
        return statements[key];
    }
    async unprepare(key, options) {
        if (!options) {
            options = {};
        }
        const env = options.env === undefined ? this.env : options.env;
        if (!this.preparedStatements[env]) {
            this.preparedStatements[env] = { connection: await this.getPersistentConnection(options), statements: {} };
        }
        const { statements } = this.preparedStatements[env];
        if (statements[key]) {
            try {
                statements[key].statementInfo.close();
            }
            catch (error) {
            }
            delete statements[key];
        }
    }
    parseNamedParams(sql) {
        const DQUOTE = 34;
        const SQUOTE = 39;
        const BSLASH = 92;
        const stack = {};
        let paramName = "";
        let paramPos;
        let inParam = false;
        let inQuote = false;
        let quoteChar;
        let escape = false;
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
                        inParam = chr === ':';
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
    getPool(options) {
        if (!options) {
            options = {};
        }
        const env = options.env === undefined ? this.env : options.env;
        const namedPlaceholders = options.namedPlaceholders === undefined ? true : options.namedPlaceholders;
        return new Promise((resolve, reject) => {
            if (!this.pools[env]) {
                const { hostname: host, username: user, password, database } = this.credentials[env];
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
    async getPersistentConnection(options) {
        if (!options) {
            options = {};
        }
        const env = options.env === undefined ? this.env : options.env;
        const namedPlaceholders = options.namedPlaceholders === undefined ? true : options.namedPlaceholders;
        const pool = await this.getPool({ env, namedPlaceholders });
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
    async withConnection(fn, options) {
        const conn = await this.getPersistentConnection(options);
        try {
            return await fn(conn);
        }
        finally {
            try {
                conn.release();
            }
            catch (_a) { }
        }
    }
    closeAllConnections() {
        return Promise.all([
            ...Object.keys(this.pools).map(env => Object.keys(this.preparedStatements[env].statements).map(key => { try {
                this.preparedStatements[env].statements[key].statementInfo.close();
            }
            catch (ex) { } })),
            ...Object.keys(this.pools).map(env => { try {
                return this.pools[env].end();
            }
            catch (ex) { } }),
            ...Object.keys(this.persistentConnections).reduce((all, env) => [...all, ...this.persistentConnections[env].map(conn => { try {
                    return conn.end();
                }
                catch (ex) { } })], []),
        ]);
    }
    existsColumn(table, field) {
        table = this.resolveTable(table);
        const column = table.columns.find(c => c.name === field);
        return !!column;
    }
    stringifyRelation(rel) { return `${rel.child.table}.${rel.child.field}=${rel.parent.table}.${rel.parent.field}`; }
    sequelizeRelation(rel) { return `ON ${rel.child.table}.${rel.child.field} = ${rel.parent.table}.${rel.parent.field}`; }
    async retrieveSchema(options) {
        if (!options) {
            options = {};
        }
        const forceRefresh = options.forceRefresh === undefined ? false : options.forceRefresh;
        if (this.tables.length > 0 && !forceRefresh) {
            return this.tables;
        }
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
        this.tables.splice(0);
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
        const langTable = this.getLangTable(table);
        if (!langTable) {
            return false;
        }
        const langColumn = langTable.columns.find(c => c.name === field);
        return !!langColumn;
    }
    getLangColumns(table) {
        const tableName = typeof table === 'string' ? table : table.name;
        const langTable = this.getLangTable(table);
        if (!langTable) {
            return [];
        }
        const foreignKeys = this.getForeignKeys(langTable);
        const langColumns = langTable.columns.filter(fk => (tableName === 'localize' && fk.name === this.langField) ||
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
        const column = table.columns.find(c => c.name === field);
        if (column) {
            return true;
        }
        const langTable = this.getLangTable(table);
        if (!langTable) {
            return false;
        }
        const langColumn = langTable.columns.find(c => c.name === field);
        return !!langColumn;
    }
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
    getForeignKeys(table) {
        table = this.resolveTable(table);
        const foreignKeys = table.parents.map(relation => relation.child.field);
        return foreignKeys;
    }
    getForeignColumns(table) {
        table = this.resolveTable(table);
        const foreignKeys = table.parents.map(relation => table.columns.find(c => c.name === relation.child.field));
        return foreignKeys;
    }
    async syncRow(table, row, options) {
        if (!options) {
            options = {};
        }
        const conn = options.conn === undefined ? await this.getPool() : options.conn;
        const tableName = typeof table === 'string' ? table : table.name;
        const crud = this.sequelizeCrudStatements(tableName, row, options);
        const { select, insert, update } = crud.interpolated;
        const [checked, fields] = await conn.query(select);
        const result = Array.isArray(checked) ? checked : [checked];
        const query = result.length ? update : insert;
        const [rows] = await conn.query(query);
        return rows;
    }
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
    quoteEntityName(name) { return name ? (name.startsWith('`') ? name : `\`${name}\``) : ''; }
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