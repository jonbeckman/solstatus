---
name: drizzle-orm-patterns
description: Provides comprehensive Drizzle ORM patterns for schema definition, CRUD operations, relations, queries, transactions, and migrations. Proactively use for any Drizzle ORM development including defining database schemas, writing type-safe queries, implementing relations, managing transactions, and setting up migrations with Drizzle Kit. Supports PostgreSQL, MySQL, SQLite, MSSQL, and CockroachDB.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Drizzle ORM Patterns

## Overview

Expert guide for building type-safe database applications with Drizzle ORM. Covers schema definition, relations, queries, transactions, and migrations for all supported databases.

## When to Use

- Defining database schemas with tables, columns, and constraints
- Creating relations between tables (one-to-one, one-to-many, many-to-many)
- Writing type-safe CRUD queries
- Implementing complex joins and aggregations
- Managing database transactions with rollback
- Setting up migrations with Drizzle Kit
- Working with PostgreSQL, MySQL, SQLite, MSSQL, or CockroachDB

## Quick Reference

| Database | Table Function | Import |
|----------|---------------|--------|
| PostgreSQL | `pgTable()` | `drizzle-orm/pg-core` |
| MySQL | `mysqlTable()` | `drizzle-orm/mysql-core` |
| SQLite | `sqliteTable()` | `drizzle-orm/sqlite-core` |
| MSSQL | `mssqlTable()` | `drizzle-orm/mssql-core` |

| Operation | Method | Example |
|-----------|--------|---------|
| Insert | `db.insert()` | `db.insert(users).values({...})` |
| Select | `db.select()` | `db.select().from(users).where(eq(...))` |
| Update | `db.update()` | `db.update(users).set({...}).where(...)` |
| Delete | `db.delete()` | `db.delete(users).where(...)` |
| Transaction | `db.transaction()` | `db.transaction(async (tx) => {...})` |

## Instructions

1. **Identify your database dialect** - Choose PostgreSQL, MySQL, SQLite, MSSQL, or CockroachDB
2. **Define your schema** - Use the appropriate table function (pgTable, mysqlTable, etc.)
3. **Set up relations** - Define relations using `relations()` or `defineRelations()`
4. **Initialize the database client** - Create your Drizzle client with proper credentials
5. **Write queries** - Use the query builder for type-safe CRUD operations
6. **Handle transactions** - Wrap multi-step operations in transactions when needed
7. **Set up migrations** - Configure Drizzle Kit for schema management

## Examples

### Example 1: Basic Schema and Query

```typescript
import { pgTable, serial, text } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
});

const db = drizzle(process.env.DATABASE_URL);

const [user] = await db.select().from(users).where(eq(users.id, 1));
```

### Example 2: CRUD Operations

```typescript
import { eq } from 'drizzle-orm';

// Insert
const [newUser] = await db.insert(users).values({
  name: 'John',
  email: 'john@example.com',
}).returning();

// Update
await db.update(users)
  .set({ name: 'John Updated' })
  .where(eq(users.id, 1));

// Delete
await db.delete(users).where(eq(users.id, 1));
```

### Example 3: Transaction with Rollback

```typescript
await db.transaction(async (tx) => {
  const [from] = await tx.select().from(accounts)
    .where(eq(accounts.userId, fromId));

  if (from.balance < amount) {
    tx.rollback();
  }

  await tx.update(accounts)
    .set({ balance: sql`${accounts.balance} - ${amount}` })
    .where(eq(accounts.userId, fromId));
});
```

See [references/transactions.md](references/transactions.md) for advanced transaction patterns.

## Best Practices

1. **Type Safety**: Always use TypeScript and leverage `$inferInsert` / `$inferSelect`
2. **Relations**: Define relations using the relations() API for nested queries
3. **Transactions**: Use transactions for multi-step operations that must succeed together
4. **Migrations**: Use `generate` + `migrate` in production, `push` for development
5. **Indexes**: Add indexes on frequently queried columns and foreign keys
6. **Soft Deletes**: Use `deletedAt` timestamp instead of hard deletes when possible
7. **Pagination**: Use cursor-based pagination for large datasets
8. **Query Optimization**: Use `.limit()` and `.where()` to fetch only needed data

## Constraints and Warnings

- **Foreign Key Constraints**: Always define references using arrow functions `() => table.column` to avoid circular dependency issues
- **Transaction Rollback**: Calling `tx.rollback()` throws an exception - use try/catch if needed
- **Returning Clauses**: Not all databases support `.returning()` - check your dialect compatibility
- **Batch Operations**: Large batch inserts may hit database limits - chunk into smaller batches
- **Migrations in Production**: Always test migrations in staging before applying to production

## References

### Core Concepts
- **[references/schema-definition.md](references/schema-definition.md)** - Complete schema definition for all databases (PostgreSQL, MySQL, SQLite), column types, indexes, and constraints
- **[references/relations.md](references/relations.md)** - One-to-one, one-to-many, many-to-many relations with v1 and v2 syntax
- **[references/queries-joins-aggregations.md](references/queries-joins-aggregations.md)** - CRUD operations, query operators, joins, aggregations, and pagination

### Advanced Topics
- **[references/transactions.md](references/transactions.md)** - Transaction patterns, rollback handling, nested transactions
- **[references/migrations.md](references/migrations.md)** - Drizzle Kit configuration, CLI commands, migration workflow
- **[references/common-patterns.md](references/common-patterns.md)** - Soft delete, upsert, batch operations, full-text search, audit trails
