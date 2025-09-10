import * as mysql from 'mysql2';
import { Pool, PoolConnection, PreparedStatementInfo } from 'mysql2/promise';
import { DatabaseConnection, DatabaseEngine } from '@metacodi/api-model';
import { Table, Column, Relation, AbstractDatabase } from '@metacodi/api-model';
import { MySqlRelationSchemaInfo, MySqlTableSchemaInfo, MySqlColumnSchemaInfo } from './mysql-database.types';
export type ParamsInterpolation = 'sequelize' | 'scape' | 'raw';
export declare class MySqlDatabase implements AbstractDatabase {
    env: 'dev' | 'pre' | 'pro';
    engine: DatabaseEngine;
    credentials: {
        [env: string]: DatabaseConnection;
    };
    pools: {
        [env: string]: Pool;
    };
    persistentConnections: {
        [env: string]: PoolConnection[];
    };
    tables: Table[];
    schemas: {
        table: MySqlTableSchemaInfo;
        columns: MySqlColumnSchemaInfo[];
        primaryKey: string;
        parents: MySqlRelationSchemaInfo[];
        children: MySqlRelationSchemaInfo[];
    }[];
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
    query<T>(sql: string, options?: {
        env?: string;
        namedPlaceholders?: boolean;
    }): Promise<T>;
    getValue<T>(sql: string, options?: {
        env?: string;
        throwError?: boolean;
        error?: string;
    }): Promise<T>;
    getRow<T>(sql: string, options?: {
        env?: string;
        throwError?: boolean;
        error?: string;
    }): Promise<T>;
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
    unprepare<T>(key: string, options?: {
        env?: string;
    }): Promise<void>;
    parseNamedParams(sql: string): {
        [param: string]: number;
    };
    replaceNamedParams(sql: string, params: {
        [param: string]: number;
    }, options?: {
        numbered?: boolean;
    }): string;
    getPool(options?: {
        env?: string;
        namedPlaceholders?: boolean;
    }): Promise<Pool>;
    getPersistentConnection(options?: {
        env?: string;
        namedPlaceholders?: boolean;
    }): Promise<PoolConnection>;
    withConnection<T>(fn: (conn: PoolConnection) => Promise<T>, options?: {
        env?: string;
        namedPlaceholders?: boolean;
    }): Promise<T>;
    closeAllConnections(): Promise<(void | void[])[]>;
    existsColumn(table: string | Table, field: string): boolean;
    stringifyRelation(rel: Relation): string;
    sequelizeRelation(rel: Relation): string;
    retrieveSchema(options?: {
        forceRefresh?: boolean;
    }): Promise<Table[]>;
    parseTableSchemaInfo(schema: MySqlTableSchemaInfo): Table;
    parseColumnSchemaInfo(schema: MySqlColumnSchemaInfo): Column;
    parseColumnType(type: MySqlColumnSchemaInfo['DATA_TYPE'] | string): Column['type'];
    parseRelationSchemaInfo(schema: MySqlRelationSchemaInfo): Relation;
    convertToColumnType(value: any, column: Column): any;
    langField: string;
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
    getForeignKeys(table: string | Table): string[];
    getForeignColumns(table: string | Table): Column[];
    syncRow<T>(table: string | Table, row: any, options?: {
        conn?: PoolConnection | Pool;
        primaryKey?: string;
        prefixFieldsWithTable?: boolean;
        selectWithAsterik?: boolean;
    }): Promise<T>;
    queryTableLastUpdate(table: string | Table, options?: {
        conn?: PoolConnection | Pool;
    }): Promise<string>;
    queryTableAuditTimes(table: string | Table, options?: {
        conn?: PoolConnection | Pool;
    }): Promise<{
        created: string;
        updated: string;
    }>;
    quoteEntityName(name: string): string;
    sequelizeValue(value: any, options?: {
        scapeParamValues?: boolean;
    }): string;
    interpolateQuery(query: string, params: {
        [param: string]: any;
    }, options?: {
        paramsInterpolation?: ParamsInterpolation;
    }): string;
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
    private formatDateTime;
}
//# sourceMappingURL=mysql-database.d.ts.map