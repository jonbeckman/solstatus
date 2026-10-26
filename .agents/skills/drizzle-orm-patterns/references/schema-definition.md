# Schema Definition - Complete Reference

## PostgreSQL Table

```typescript
import { pgTable, serial, text, integer, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';

// Enum definition
export const rolesEnum = pgEnum('roles', ['guest', 'user', 'admin']);

// Table with all column types
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: rolesEnum().default('user'),
  verified: boolean('verified').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

## MySQL Table

```typescript
import { mysqlTable, serial, text, int, tinyint, datetime } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  verified: tinyint('verified').notNull().default(0),
  createdAt: datetime('created_at').notNull().defaultNow(),
});
```

## SQLite Table

```typescript
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
});
```

## Indexes and Constraints

```typescript
import { uniqueIndex, index, primaryKey } from 'drizzle-orm/pg-core';

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  authorId: integer('author_id').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('slug_idx').on(table.slug),
  index('author_idx').on(table.authorId),
  index('created_idx').on(table.createdAt),
]);
```

## Composite Primary Key

```typescript
export const usersToGroups = pgTable('users_to_groups', {
  userId: integer('user_id').notNull().references(() => users.id),
  groupId: integer('group_id').notNull().references(() => groups.id),
}, (table) => [
  primaryKey({ columns: [table.userId, table.groupId] }),
]);
```

## Column Types Reference

### PostgreSQL
- `serial`, `bigserial` - Auto-incrementing integers
- `text`, `varchar(n)` - Text columns
- `integer`, `bigint`, `smallint` - Integer types
- `boolean` - True/false
- `timestamp`, `date`, `time` - Date/time types
- `numeric(p, s)` - Precision numbers
- `json`, `jsonb` - JSON data
- `uuid` - UUID columns
- `pgEnum` - Custom enums

### MySQL
- `serial`, `bigserial` - Auto-increment
- `text`, `varchar(n)` - Text
- `int`, `bigint`, `tinyint` - Integers
- `tinyint(1)` - Boolean
- `datetime`, `date`, `time` - Date/time
- `decimal(p, s)` - Precision numbers
- `json` - JSON data

### SQLite
- `integer` - Auto-increment primary key
- `text` - Text
- `integer` - All integers
- No native boolean (use integer 0/1)
- No native date/time (store as text or integer)
