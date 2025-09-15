# node-mysql

[Install](#install)
&nbsp;|&nbsp; [Quick Start](#quick-start)
&nbsp;|&nbsp; [One-off Queries](#one-off-queries)
&nbsp;|&nbsp; [Prepared Statements](#prepared-statements)
&nbsp;|&nbsp; [Environments](#environments)
&nbsp;|&nbsp; [Schema Utilities](#schema-utilities)
&nbsp;|&nbsp; [Lang Tables](#lang-tables)
&nbsp;|&nbsp; [Helpers](#helpers)
&nbsp;|&nbsp; [API Summary](#api-summary)

<br />

MySQL/MariaDB access library for Node.js with pools, prepared statements, and multi-environment support.


### Features

- Simple, typed one-off queries using `mysql2` pools.
- Efficient repeated queries using prepared statements with an internal cache per environment.
- Multi-environment support (dev, pre, pro) with one pool per environment.
- Schema discovery via `INFORMATION_SCHEMA` and conversion to a generic `@metacodi/api-model` representation.
- Utilities for generating SQL (interpolation/quoting), and for mixed language tables (`_lang`).
- Works with MySQL and MariaDB (via `mysql2`).

## [Install](#node-mysql)

Install peer dependencies in your project:

```
npm install @metacodi/node-mysql mysql2
```

Depending on your stack you may already have `@metacodi/api-model`.

## [Quick Start](#node-mysql)

```typescript
import { DatabaseConnection } from '@metacodi/api-model';
import { MySqlDatabase } from '@metacodi/node-mysql';

const env = 'dev';
const credentials: DatabaseConnection = {
  username: 'MYNAME',
  password: 'PASS123',
  hostname: 'DB.EXAMPLE.COM',
  database: 'MYDBNAME',
};

const db = new MySqlDatabase(env, credentials);
```

## [One-off Queries](#node-mysql)

Use helpers that manage pool connections for you and infer types:

```typescript
const invoices = await db.query<Invoice[]>('SELECT * FROM `invoices`;');

const invoice = await db.getRow<Invoice>(`SELECT * FROM invoices WHERE id = 42;`, {
  error: `Invoice id=42 not found.`,
});

const total = await db.getValue<number>(`SELECT SUM(total) FROM invoices WHERE date = '2025-06-01';`);
```

## [Prepared Statements](#node-mysql)

Prepare once, execute many times with named parameters:

```typescript
const sql = 'SELECT * FROM `devices` WHERE id_user = :id_user';
const stmt = await db.prepare('select-user-devices', sql);

const [ users ] = await db.query<any[]>(`SELECT * FROM users`);
for (const user of users) {
  const [ devices ] = await stmt.execute({ id_user: user.id });
  user.devices = devices;
}

stmt.close();
```

Or run batch work using a dedicated connection that is always released:

```typescript
await db.withConnection(async (conn) => {
  const [ rows ] = await conn.query('SELECT NOW() as now');
  console.log(rows[0].now);
});
```

Release everything when finished (scripts, maintenance tasks):

```typescript
await db.closeAllConnections();
```

## [Environments](#node-mysql)

The library manages one pool per environment (e.g. `dev | pre | pro`). If not specified, the constructor’s default environment is used.

```typescript
const poolDev = await db.getPool({ env: 'dev' });
const poolPro = await db.getPool({ env: 'pro' });
```

## [Schema Utilities](#node-mysql)

Discover schema from `INFORMATION_SCHEMA` and access parsed `tables` and raw `schemas`:

```typescript
await db.retrieveSchema();
console.log(db.tables);  // generic `Table[]`
```

### @metacodi/api-model types

```typescript
interface Table {
  name: string;
  columns: Column[];
  parents: Relation[];
  children: Relation[];
  primaryKey: string;
  virtual?: boolean;
}
```

```typescript
interface Column {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'polygon' | 'json';
  isNullable?: boolean;
  isPrimaryKey?: boolean;
  isUnique?: boolean;
  isVirtual?: boolean;
  schema?: any; // Raw database schema metadata exactly as returned by the engine/driver.
  default?: any;
}
```

```typescript
interface Relation {
  name: string;
  parent: {
    table: string; // Ex: `users`
    field: string; // Ex: `id`
  };
  child: {
    table: string; // Ex: `devices`
    field: string; // Ex: `id_user`
  };
  update?: 'CASCADE' | 'SET NULL';
  delete?: 'CASCADE' | 'SET NULL';
}
```

## [Lang Tables](#node-mysql)

Projects that store localized fields in `<table>_lang` can use:

- `hasLangTable(table)`
- `getLangColumns(table)`
- `existsColumnOrLangColumn(table, field)`

## [Helpers](#node-mysql)

- `existsColumn(table, field)`
- `resolveTable(table)`
- `getForeignKeys(table)`
- `getForeignColumns(table)`

SQL helpers for quoting and interpolation:

- `quoteEntityName(name)` → wraps with backticks
- `sequelizeValue(value)` → converts JS values to SQL literals
- `interpolateQuery(query, params, { paramsInterpolation })`

Generate parameterized and interpolated CRUD snippets from a row using `sequelizeCrudStatements`. This is handy for scripts and for inspecting the actual SQL that would run.

```typescript
const row = {
  id: 11575,
  id_user: 11583,
  id_company: null,
  id_provider: 100,
  id_payment: null,
  authorized: 0,
  created: '2024-04-30 16:20:28',
  updated: '2024-04-30 16:20:28',
  deleted: null,
};

const { parameterized, interpolated, tokens } = db.sequelizeCrudStatements('customers', row, {
  primaryKey: 'id',
  prefixFieldsWithTable: true,
});

// Parameterized examples
parameterized.select; // SELECT `customers`.`id`, ... FROM `customers`
parameterized.insert; // INSERT INTO `customers` (...) VALUES (:id, :id_user, ...)
parameterized.update; // UPDATE `customers` SET `customers`.`name` = :name, ... WHERE `customers`.`id` = :id

// Interpolated examples
interpolated.select;  // SELECT `customers`.`id`, ... FROM `customers` WHERE `customers`.`id` = 11575
interpolated.insert;  // INSERT INTO `customers` (...) VALUES (11575, 11583, null, 100, ...)
interpolated.update;  // UPDATE `customers` SET `customers`.`name` = 'Company, Inc.', ... WHERE `customers`.`id` = 11575

// Tokens (metadata)
tokens.primaryKey; // `customers`.`id`
tokens.fields;     // ['`id`', '`id_user`', ...]
tokens.columns;    // ['`customers`.`id`', '`customers`.`id_user`', ...]
```

## [API Summary](#node-mysql)

- `new MySqlDatabase(env, credentials)`
- `query<T>(sql, { env })`
- `getRow<T>(sql, { env, throwError, error })`
- `getValue<T>(sql, { env, throwError, error })`
- `getPool({ env, namedPlaceholders })`
- `getPersistentConnection({ env, namedPlaceholders })`
- `withConnection(fn, { env, namedPlaceholders })`
- `prepare(key, sql, { env, namedPlaceholders })`
- `unprepare(key, { env })`
- `closeAllConnections()`
- Schema: `retrieveSchema()`, `tables`, `schemas`, and helpers above

## [Contributing](#node-mysql)

Issues and PRs are welcome. Please keep changes focused and documented.

## [License](#node-mysql)
ISC
