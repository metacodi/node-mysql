export interface MySqlTableSchemaInfo {
    TABLE_CATALOG: 'def';
    TABLE_SCHEMA: string;
    TABLE_NAME: string;
    TABLE_TYPE: 'BASE TABLE' | 'VIEW TABLE' | 'SYSTEM VIEW';
    ENGINE: 'InnoDb' | 'MyISAM';
    VERSION: number;
    ROW_FORMAT: 'Fixed' | 'Dynamic' | 'Compressed' | 'Redundant' | 'Compact';
    TABLE_ROWS: number;
    AVG_ROW_LENGTH: number;
    DATA_LENGTH: number;
    MAX_DATA_LENGTH: number;
    INDEX_LENGTH: number;
    DATA_FREE: number;
    AUTO_INCREMENT: number;
    CREATE_TIME: string;
    UPDATE_TIME: string;
    CHECK_TIME: string;
    TABLE_COLLATION: string;
    CHECKSUM: any;
    CREATE_OPTIONS: any;
    TABLE_COMMENT: string;
    MAX_INDEX_LENGTH?: number;
    TEMPORARY?: 'N' | 'Y';
}
export interface MySqlColumnSchemaInfo {
    TABLE_CATALOG: 'def';
    TABLE_SCHEMA: string;
    TABLE_NAME: string;
    COLUMN_NAME: string;
    ORDINAL_POSITION: number;
    COLUMN_DEFAULT: string | null;
    IS_NULLABLE: 'YES' | 'NO';
    DATA_TYPE: 'bigint' | 'char' | 'date' | 'datetime' | 'decimal' | 'double' | 'float' | 'int' | 'integer' | 'json' | 'longtext' | 'mediumint' | 'numeric' | 'polygon' | 'real' | 'smallint' | 'text' | 'time' | 'tinyint' | 'varchar';
    CHARACTER_MAXIMUM_LENGTH: number | null;
    CHARACTER_OCTET_LENGTH: number | null;
    NUMERIC_PRECISION: number | null;
    NUMERIC_SCALE: number | null;
    DATETIME_PRECISION: number | null;
    CHARACTER_SET_NAME: string | null;
    COLLATION_NAME: string | null;
    COLUMN_TYPE: string;
    COLUMN_KEY: 'PRI' | 'UNI' | 'MUL' | '';
    EXTRA: string;
    PRIVILEGES: string;
    COLUMN_COMMENT: string;
    IS_GENERATED: 'NEVER' | 'ALWAYS';
    SRS_ID: any;
}
export interface MySqlRelationSchemaInfo {
    CONSTRAINT_NAME: string;
    TABLE_NAME: string;
    COLUMN_NAME: string;
    REFERENCED_TABLE_NAME: string;
    REFERENCED_COLUMN_NAME: string;
    UPDATE_RULE: 'CASCADE' | 'SET NULL';
    DELETE_RULE: 'CASCADE' | 'SET NULL';
}
//# sourceMappingURL=mysql-database.types.d.ts.map