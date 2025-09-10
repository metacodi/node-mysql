

/** Information about database table definitions obtained via:
 * 
 * ```sql
 * SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE table_schema = 'my_schema'
 * ```
 * 
 * {@link https://dev.mysql.com/doc/refman/8.4/en/information-schema-tables-table.html The INFORMATION_SCHEMA TABLES Table }
 */
export interface MySqlTableSchemaInfo {
  /** The name of the catalog to which the table belongs. This value is always 'def'. */
  TABLE_CATALOG: 'def';
  /** The name of the schema (database) to which the table belongs. */
  TABLE_SCHEMA: string;
  /** The name of the table. */
  TABLE_NAME: string;
  /** 'BASE TABLE' for a table, 'VIEW TABLE' for a view, or 'SYSTEM VIEW' for an INFORMATION_SCHEMA table.
   * 
   * The TABLES table does not list TEMPORARY tables.
   */
  TABLE_TYPE: 'BASE TABLE' | 'VIEW TABLE' | 'SYSTEM VIEW';
  /** The storage engine for the table. See Chapter 17, The InnoDB Storage Engine, and Chapter 18, Alternative Storage Engines. Ex: 'InnoDB'
   *
   *  For partitioned tables, ENGINE shows the name of the storage engine used by all partitions.
   */
  ENGINE: 'InnoDb' | 'MyISAM';
  /** This column is unused. With the removal of .frm files in MySQL 8.0, this column now reports a hardcoded value of 10, which is the last .frm file version used in MySQL 5.7. */
  VERSION: number;
  /** The row-storage format. For MyISAM tables, Dynamic corresponds to what myisamchk -dvv reports as Packed. */
  ROW_FORMAT: 'Fixed' | 'Dynamic' | 'Compressed' | 'Redundant' | 'Compact';
  /** The number of rows. Some storage engines, such as MyISAM, store the exact count. For other storage engines, such as InnoDB, this value is an approximation, and may vary from the actual value by as much as 40% to 50%. In such cases, use SELECT COUNT(*) to obtain an accurate count.
   *
   * TABLE_ROWS is NULL for INFORMATION_SCHEMA tables.
   *
   * For InnoDB tables, the row count is only a rough estimate used in SQL optimization. (This is also true if the InnoDB table is partitioned.)
   */
  TABLE_ROWS: number;
  /** The average row length. */
  AVG_ROW_LENGTH: number;
  /** For MyISAM, DATA_LENGTH is the length of the data file, in bytes.
   * 
   * For InnoDB, DATA_LENGTH is the approximate amount of space allocated for the clustered index, in bytes. Specifically, it is the clustered index size, in pages, multiplied by the InnoDB page size.
   * 
   * Refer to the notes at the end of this section for information regarding other storage engines.
   */
  DATA_LENGTH: number;
  /** For MyISAM, MAX_DATA_LENGTH is maximum length of the data file. This is the total number of bytes of data that can be stored in the table, given the data pointer size used.
   *
   * Unused for InnoDB.
   * 
   * Refer to the notes at the end of this section for information regarding other storage engines.
   */
  MAX_DATA_LENGTH: number;
  /** For MyISAM, INDEX_LENGTH is the length of the index file, in bytes.
   * 
   * For InnoDB, INDEX_LENGTH is the approximate amount of space allocated for non-clustered indexes, in bytes. Specifically, it is the sum of non-clustered index sizes, in pages, multiplied by the InnoDB page size.
   * 
   * Refer to the notes at the end of this section for information regarding other storage engines.
   */
  INDEX_LENGTH: number;
  /** The number of allocated but unused bytes.
   * 
   * InnoDB tables report the free space of the tablespace to which the table belongs. For a table located in the shared tablespace, this is the free space of the shared tablespace. If you are using multiple tablespaces and the table has its own tablespace, the free space is for only that table. Free space means the number of bytes in completely free extents minus a safety margin. Even if free space displays as 0, it may be possible to insert rows as long as new extents need not be allocated.
   * 
   * For NDB Cluster, DATA_FREE shows the space allocated on disk for, but not used by, a Disk Data table or fragment on disk. (In-memory data resource usage is reported by the DATA_LENGTH column.)
   * 
   * For partitioned tables, this value is only an estimate and may not be absolutely correct. A more accurate method of obtaining this information in such cases is to query the INFORMATION_SCHEMA PARTITIONS table, as shown in this example:
   * 
   * ```sql
   * SELECT SUM(DATA_FREE) FROM  INFORMATION_SCHEMA.PARTITIONS WHERE TABLE_SCHEMA = 'mydb' AND TABLE_NAME = 'mytable';
   * ```
   * 
   * For more information, see Section 28.3.21, “The INFORMATION_SCHEMA PARTITIONS Table”.
   */
  DATA_FREE: number;
  /** The next AUTO_INCREMENT value. */
  AUTO_INCREMENT: number;
  /** When the table was created. */
  CREATE_TIME: string;
  /** When the table was last updated. For some storage engines, this value is NULL. Even with file-per-table mode with each InnoDB table in a separate .ibd file, change buffering can delay the write to the data file, so the file modification time is different from the time of the last insert, update, or delete. For MyISAM, the data file timestamp is used; however, on Windows the timestamp is not updated by updates, so the value is inaccurate.
  * 
  * UPDATE_TIME displays a timestamp value for the last UPDATE, INSERT, or DELETE performed on InnoDB tables that are not partitioned. For MVCC, the timestamp value reflects the COMMIT time, which is considered the last update time. Timestamps are not persisted when the server is restarted or when the table is evicted from the InnoDB data dictionary cache.
  * */
  UPDATE_TIME: string;
  /** When the table was last checked. Not all storage engines update this time, in which case, the value is always NULL.
   * For partitioned InnoDB tables, CHECK_TIME is always NULL.
   * */
  CHECK_TIME: string;
  /** The table default collation. The output does not explicitly list the table default character set, but the collation name begins with the character set name. */
  TABLE_COLLATION: string;
  /** The live checksum value, if any. */
  CHECKSUM: any;
  /** Extra options used with CREATE TABLE.
   * 
   * CREATE_OPTIONS shows partitioned for a partitioned table.
   * 
   * CREATE_OPTIONS shows the ENCRYPTION clause specified for tables created in file-per-table tablespaces. It shows the encryption clause for file-per-table tablespaces if the table is encrypted or if the specified encryption differs from the schema encryption. The encryption clause is not shown for tables created in general tablespaces. To identify encrypted file-per-table and general tablespaces, query the INNODB_TABLESPACES ENCRYPTION column.
   * 
   * When creating a table with strict mode disabled, the storage engine's default row format is used if the specified row format is not supported. The actual row format of the table is reported in the ROW_FORMAT column. CREATE_OPTIONS shows the row format that was specified in the CREATE TABLE statement.
   * 
   * When altering the storage engine of a table, table options that are not applicable to the new storage engine are retained in the table definition to enable reverting the table with its previously defined options to the original storage engine, if necessary. The CREATE_OPTIONS column may show retained options.
   */
  CREATE_OPTIONS: any;
  /** The comment used when creating the table (or information as to why MySQL could not access the table information). */
  TABLE_COMMENT: string;
  MAX_INDEX_LENGTH?: number;
  TEMPORARY?: 'N' | 'Y';
}

/** Information about database table column definitions obtained via:
 *
 * ```sql
 * SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE table_schema = 'my_schema'
 * ```
 * 
 * {@link https://dev.mysql.com/doc/refman/8.4/en/information-schema-columns-table.html The INFORMATION_SCHEMA COLUMNS Table }
 */
export interface MySqlColumnSchemaInfo {
  /** The name of the catalog to which the table containing the column belongs. This value is always 'def'. */
  TABLE_CATALOG: 'def';
  /** The name of the schema (database) to which the table containing the column belongs. */
  TABLE_SCHEMA: string;
  /** The name of the table containing the column. */
  TABLE_NAME: string;
  /** The name of the column. */
  COLUMN_NAME: string;
  /** The position of the column within the table. `ORDINAL_POSITION` is necessary because you might want to say ORDER BY `ORDINAL_POSITION`. Unlike `SHOW COLUMNS`, SELECT from the COLUMNS table does not have automatic ordering. */
  ORDINAL_POSITION: number;
  /** The default value for the column. This is NULL if the column has an explicit default of NULL, or if the column definition includes no DEFAULT clause. */
  COLUMN_DEFAULT: string | null;
  /** The column nullability. The value is YES if NULL values can be stored in the column, NO if not. */
  IS_NULLABLE: 'YES' | 'NO';
  /** The column data type.
   * 
   * The `DATA_TYPE` value is the type name only with no other information. The `COLUMN_TYPE` value contains the type name and possibly other information such as the precision or length.
   */
  DATA_TYPE: 'bigint' | 'char' | 'date' | 'datetime' | 'decimal' | 'double' | 'float' | 'int' | 'integer' | 'json' | 'longtext' | 'mediumint' | 'numeric' | 'polygon' | 'real' | 'smallint' | 'text' | 'time' | 'tinyint' | 'varchar';
  /** For string columns, the maximum length in characters. */
  CHARACTER_MAXIMUM_LENGTH: number | null;
  /** For string columns, the maximum length in bytes. */
  CHARACTER_OCTET_LENGTH: number | null;  
  /** For numeric columns, the numeric precision. */
  NUMERIC_PRECISION: number | null;
  /** For numeric columns, the numeric scale. */
  NUMERIC_SCALE: number | null;
  /** For temporal columns, the fractional seconds precision. */
  DATETIME_PRECISION: number | null;
  /** For character string columns, the character set name. */
  CHARACTER_SET_NAME: string | null;
  /** For character string columns, the collation name. Ex: 'utf8_general_ci' | 'utf8mb4_bin */
  COLLATION_NAME: string | null;
  /** The column data type.
   * 
   * The DATA_TYPE value is the type name only with no other information. The COLUMN_TYPE value contains the type name and possibly other information such as the precision or length.
   */
  COLUMN_TYPE: string;
  /** Whether the column is indexed:
   * 
   * If COLUMN_KEY is empty, the column either is not indexed or is indexed only as a secondary column in a multiple-column, nonunique index.
   * 
   * If COLUMN_KEY is PRI, the column is a PRIMARY KEY or is one of the columns in a multiple-column PRIMARY KEY.
   * 
   * If COLUMN_KEY is UNI, the column is the first column of a UNIQUE index. (A UNIQUE index permits multiple NULL values, but you can tell whether the column permits NULL by checking the Null column.)
   * 
   * If COLUMN_KEY is MUL, the column is the first column of a nonunique index in which multiple occurrences of a given value are permitted within the column.
   * 
   * If more than one of the COLUMN_KEY values applies to a given column of a table, COLUMN_KEY displays the one with the highest priority, in the order PRI, UNI, MUL.
   * 
   * A UNIQUE index may be displayed as PRI if it cannot contain NULL values and there is no PRIMARY KEY in the table. A UNIQUE index may display as MUL if several columns form a composite UNIQUE index; although the combination of the columns is unique, each column can still hold multiple occurrences of a given value.
   */
  COLUMN_KEY: 'PRI' | 'UNI' | 'MUL' | '';
  /** Any additional information that is available about a given column. The value is nonempty in these cases:
   * 
   * auto_increment for columns that have the AUTO_INCREMENT attribute.
   * 
   * on update CURRENT_TIMESTAMP for TIMESTAMP or DATETIME columns that have the ON UPDATE CURRENT_TIMESTAMP attribute.
   * 
   * STORED GENERATED or VIRTUAL GENERATED for generated columns.
   * 
   * DEFAULT_GENERATED for columns that have an expression default value.
   */
  EXTRA: string;
  /** The privileges you have for the column. */
  PRIVILEGES: string;
  /** Any comment included in the column definition. */
  COLUMN_COMMENT: string;
  /** GENERATION_EXPRESSION
   * 
   * For generated columns, displays the expression used to compute column values. Empty for nongenerated columns. For information about generated columns, see Section 15.1.20.8, “CREATE TABLE and Generated Columns”.
   */
  IS_GENERATED: 'NEVER' | 'ALWAYS';
  /** This value applies to spatial columns. It contains the column SRID value that indicates the spatial reference system for values stored in the column. See Section 13.4.1, “Spatial Data Types”, and Section 13.4.5, “Spatial Reference System Support”. The value is NULL for nonspatial columns and spatial columns with no SRID attribute. */
  SRS_ID: any;
}

/** Information about foreign-key relations across database tables.
 *
 * ```typescript
 * export interface MySqlRelationSchemaInfo {
 *   // Constraint name. Ex: `FK_devices_users`
 *   CONSTRAINT_NAME: string;
 *   // Ex: `devices`
 *   TABLE_NAME: string;
 *   // Ex: `id_user`
 *   COLUMN_NAME: string;
 *   // Ex: `users`
 *   REFERENCED_TABLE_NAME: string;
 *   // Ex: `id`
 *   REFERENCED_COLUMN_NAME: string;
 * }
 * ```
 * 
 * Schema query to obtain the relationships between tables in the database.
 *
 * ```sql
 * SELECT DISTINCT
 *   TC.CONSTRAINT_NAME,
 *   TC.TABLE_NAME,
 *   KCU.COLUMN_NAME,
 *   RC.REFERENCED_TABLE_NAME,
 *   KCU.REFERENCED_COLUMN_NAME,
 *   RC.UPDATE_RULE,
 *   RC.DELETE_RULE 
 * FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS RC 
 *   INNER JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS TC ON RC.CONSTRAINT_NAME = TC.CONSTRAINT_NAME 
 *   INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE KCU ON KCU.CONSTRAINT_NAME = TC.CONSTRAINT_NAME
 * WHERE TC.CONSTRAINT_TYPE = 'FOREIGN KEY' AND TC.CONSTRAINT_SCHEMA = '${database}'
 * ORDER BY TABLE_NAME; 
 * ```
 */
export interface MySqlRelationSchemaInfo {
  /** Constraint name. Ex:  `FK_devices_users` */ 
  CONSTRAINT_NAME: string;
  /** Ex: `devices` */
  TABLE_NAME: string;
  /** Ex: `id_user` */
  COLUMN_NAME: string;
  /** Ex: `users` */
  REFERENCED_TABLE_NAME: string;
  /** Ex: `id` */
  REFERENCED_COLUMN_NAME: string;
  UPDATE_RULE: 'CASCADE' |'SET NULL';
  DELETE_RULE: 'CASCADE' |'SET NULL';
}
