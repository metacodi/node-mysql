import * as mysql from 'mysql2';
import { Pool, PoolConnection, PreparedStatementInfo } from 'mysql2/promise';
import { DatabaseConnection, DatabaseEngine } from '@metacodi/api-model';
import { Table, Column, Relation, AbstractDatabase } from '@metacodi/api-model';
import { MySqlRelationSchemaInfo, MySqlTableSchemaInfo, MySqlColumnSchemaInfo } from './mysql-database.types';
/** Controls how parameter values are interpolated when generating SQL text.
 * @param sequelize use `sequelizeValue()` to produce valid SQL text for values (useful for raw rows, nulls, dates, numbers).
 * @param scape escape values with quotes via `mysql.escape`.
 * @param raw use parameter values as-is (no transformation).
 */
export type ParamsInterpolation = 'sequelize' | 'scape' | 'raw';
/** MySQL/MariaDB database access library for Node.js.
 *
 * Provides:
 * - One-off queries via pools
 * - Prepared statements with per-environment cache
 * - Multi-environment support (dev, pre, pro)
 * - Schema discovery and helpers
 */
export declare class MySqlDatabase implements AbstractDatabase {
    env: 'dev' | 'pre' | 'pro';
    engine: DatabaseEngine;
    /** Database connections */
    credentials: {
        [env: string]: DatabaseConnection;
    };
    /** Per-environment pools for one-off queries. */
    pools: {
        [env: string]: Pool;
    };
    /** Connections from the environment pool for batch queries. When finished, call closeAllConnections to release them. */
    persistentConnections: {
        [env: string]: PoolConnection[];
    };
    /** Schema table definitions in the generic @metacodi/api-model format. */
    tables: Table[];
    /** Schema table information obtained via database queries. */
    schemas: {
        table: MySqlTableSchemaInfo;
        columns: MySqlColumnSchemaInfo[];
        primaryKey: string;
        parents: MySqlRelationSchemaInfo[];
        children: MySqlRelationSchemaInfo[];
    }[];
    /** Cache of stored procedures. */
    preparedStatements: {
        [env: string]: {
            connection: PoolConnection;
            statements: {
                [key: string]: {
                    sanitizedSql: string;
                    paramsInfo: {
                        [param: string]: number;
                    };
                    statementInfo: PreparedStatementInfo;
                    execute: (values: {
                        [param: string]: any;
                    }) => ReturnType<PreparedStatementInfo['execute']>;
                    close: () => void;
                };
            };
        };
    };
    constructor(env: 'dev' | 'pre' | 'pro', credentials: DatabaseConnection | {
        [env: string]: DatabaseConnection;
    });
    /** Execute an SQL query using the pool for the selected environment.
     *
     * @param namedPlaceholders
     */
    query<T>(sql: string, options?: {
        env?: string;
        namedPlaceholders?: boolean;
    }): Promise<T>;
    /** Execute an SQL query and return the first column of the first row.
     *
     * @return The first column value of the first result row.
     */
    getValue<T>(sql: string, options?: {
        env?: string;
        throwError?: boolean;
        error?: string;
    }): Promise<T>;
    /** Execute an SQL query and return the first row from results.
     *
     * @return The first row found in the results.
     */
    getRow<T>(sql: string, options?: {
        env?: string;
        throwError?: boolean;
        error?: string;
    }): Promise<T>;
    /** {@link https://sidorares.github.io/node-mysql2/docs/documentation/prepared-statements Prepared Statements} */
    /** {@link https://github.com/mysqljs/named-placeholders GitHub package @mysqljs/named-placeholders} */
    /** Prepare a statement and store it in the environment cache by key. */
    prepare<T>(key: string, query: string | mysql.QueryOptions, options?: {
        env?: string;
        namedPlaceholders?: boolean;
    }): Promise<{
        sanitizedSql: string;
        paramsInfo: {
            [param: string]: number;
        };
        statementInfo: PreparedStatementInfo;
        execute: (values: {
            [param: string]: any;
        }) => ReturnType<PreparedStatementInfo["execute"]>;
        close: () => void;
    }>;
    /** Close a prepared statement and remove it from the cache. */
    unprepare<T>(key: string, options?: {
        env?: string;
    }): Promise<void>;
    /** Return a map of named parameters with their start positions within the SQL string.
     *
     * @param sql SQL string with named parameters.
     * @returns Literal object where keys are param names and values are their positions. Ex: { total: 21, id: 45 }
     */
    parseNamedParams(sql: string): {
        [param: string]: number;
    };
    /** Return the SQL string with named parameters replaced by native placeholders.
     *
     * @param sql SQL string with named parameters.
     * @param params Located parameters (output of `parseNamedParams`).
     * @param numbered Most engines use '?' placeholders, while Postgres uses numbered '$1'.
     */
    replaceNamedParams(sql: string, params: {
        [param: string]: number;
    }, options?: {
        numbered?: boolean;
    }): string;
    /** Get an environment pool for one-off queries (auto-managed connections). */
    getPool(options?: {
        env?: string;
        namedPlaceholders?: boolean;
    }): Promise<Pool>;
    /** Get a persistent connection from the pool for batch queries. Call `release()` when finished. */
    getPersistentConnection(options?: {
        env?: string;
        namedPlaceholders?: boolean;
    }): Promise<PoolConnection>;
    /** Convenience wrapper: acquires a persistent connection, runs the callback, and releases it. */
    withConnection<T>(fn: (conn: PoolConnection) => Promise<T>, options?: {
        env?: string;
        namedPlaceholders?: boolean;
    }): Promise<T>;
    /** Close all prepared statements, pools, and persistent connections. */
    closeAllConnections(): Promise<(void | void[])[]>;
    existsColumn(table: string | Table, field: string): boolean;
    stringifyRelation(rel: Relation, options?: {
        quoteEntityName?: boolean;
    }): string;
    sequelizeRelation(rel: Relation, options?: {
        quoteEntityName?: boolean;
    }): string;
    retrieveSchema(options?: {
        forceRefresh?: boolean;
    }): Promise<Table[]>;
    parseTableSchemaInfo(schema: MySqlTableSchemaInfo): Table;
    parseColumnSchemaInfo(schema: MySqlColumnSchemaInfo): Column;
    parseColumnType(type: MySqlColumnSchemaInfo['DATA_TYPE'] | string): Column['type'];
    parseRelationSchemaInfo(schema: MySqlRelationSchemaInfo): Relation;
    convertToColumnType(value: any, column: Column): any;
    /** Foreign-key field name for lang tables. */
    langField: string;
    /** Suffix for lang table names. */
    langTableSufix: string;
    getLangTableName(table: string | Table): string;
    getLangTable(table: string | Table): Table;
    hasLangTable(table: string | Table): boolean;
    isLangColumn(table: string | Table, field: string): boolean;
    getLangColumns(table: string | Table): Column[];
    getColumnsAndLangColumns(table: string | Table): Column[];
    existsColumnOrLangColumn(table: string | Table, field: string): boolean;
    resolveTable(table: string | Table, options?: {
        throwError?: boolean;
    }): Table;
    /** Return an array with the names of columns that are foreign keys. */
    getForeignKeys(table: string | Table): string[];
    /** Return an array with the column objects that are foreign keys. */
    getForeignColumns(table: string | Table): Column[];
    /** Upsert a row using the provided connection.
     *
     * @param primaryKey Primary key column name. @default `id`.
     * @param prefixFieldsWithTable Whether to prefix fields with the table name. @default false
     * @param selectWithAsterik Whether to use '*' in SELECT instead of explicit columns. @default false
     * @returns Metadata about the changes applied.
     */
    syncRow<T>(table: string | Table, row: any, options?: {
        conn?: PoolConnection | Pool;
        primaryKey?: string;
        prefixFieldsWithTable?: boolean;
        selectWithAsterik?: boolean;
    }): Promise<T>;
    /** Return the last update time of the given table.
     *
     * @deprecated Use `queryTableAuditTimes()` instead to get both created and updated timestamps.
    */
    queryTableLastUpdate(table: string | Table, options?: {
        conn?: PoolConnection | Pool;
    }): Promise<string>;
    /** Return created and last-updated timestamps for the given table.
     *
     * ```typescript
     * @returns { created: string; updated: string; }
     * ```
    */
    queryTableAuditTimes(table: string | Table, options?: {
        conn?: PoolConnection | Pool;
    }): Promise<{
        created: string;
        updated: string;
    }>;
    /** Return the entity name (table/field/function) wrapped in backticks. */
    quoteEntityName(name: string): string;
    /** Convert a JS value into a valid SQL literal. */
    sequelizeValue(value: any, options?: {
        scapeParamValues?: boolean;
    }): string;
    /** Replace named parameters in a parameterized query string with provided values. */
    interpolateQuery(query: string, params: {
        [param: string]: any;
    }, options?: {
        paramsInterpolation?: ParamsInterpolation;
    }): string;
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
    sequelizeCrudStatements(table: string, row: any, options?: {
        primaryKey?: string;
        prefixFieldsWithTable?: boolean;
        selectWithAsterik?: boolean;
    }): {
        parameterized: {
            select: string;
            insert: string;
            update: string;
            delete: string;
        };
        interpolated: {
            select: string;
            insert: string;
            update: string;
            delete: string;
        };
        tokens: {
            table: string;
            fields: string[];
            columns: string[];
            params: string[];
            pairs: string[];
            values: {
                [param: string]: any;
            };
            primaryKey: string;
            id: any;
        };
    };
    isArray(Type: string): boolean;
    isJsonType(Type: string): boolean;
    isBooleanType(Type: string): boolean;
    isDatetimeType(Type: string): boolean;
    isStringType(Type: string): boolean;
    isNumberType(Type: string): boolean;
    /** Format a Date/string/number into 'YYYY-MM-DD HH:mm:ss' (local time). */
    private formatDateTime;
}
//# sourceMappingURL=mysql-database.d.ts.map