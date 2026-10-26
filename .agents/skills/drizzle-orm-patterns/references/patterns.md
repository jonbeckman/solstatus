# Drizzle ORM Patterns - Detailed Reference

This file contains detailed patterns for Drizzle ORM operations. For basic usage, see the main [../SKILL.md](../SKILL.md).

## Table of Contents

- [Schema Definition](#schema-definition)
- [Relations](#relations)
- [CRUD Operations](#crud-operations)
- [Query Operators](#query-operators)
- [Pagination](#pagination)
- [Joins](#joins)
- [Aggregations](#aggregations)
- [Transactions](#transactions)
- [Drizzle Kit Migrations](#drizzle-kit-migrations)
- [Type Inference](#type-inference)
- [Common Patterns](#common-patterns)

---

## Schema Definition

### PostgreSQL Table

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

### MySQL Table

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

### SQLite Table

```typescript
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
});
```

### Indexes and Constraints

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

### Composite Primary Key

```typescript
export const usersToGroups = pgTable('users_to_groups', {
  userId: integer('user_id').notNull().references(() => users.id),
  groupId: integer('group_id').notNull().references(() => groups.id),
}, (table) => [
  primaryKey({ columns: [table.userId, table.groupId] }),
]);
```

---

## Relations

### One-to-Many (v1 syntax)

```typescript
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  authorId: integer('author_id').references(() => users.id),
});

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));
```

### One-to-One

```typescript
export const profiles = pgTable('profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).unique(),
  bio: text('bio'),
});

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}));
```

### Many-to-Many (v2 syntax)

```typescript
import { defineRelations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
});

export const groups = pgTable('groups', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
});

export const usersToGroups = pgTable('users_to_groups', {
  userId: integer('user_id').notNull().references(() => users.id),
  groupId: integer('group_id').notNull().references(() => groups.id),
}, (t) => [primaryKey({ columns: [t.userId, t.groupId] })]);

export const relations = defineRelations({ users, groups, usersToGroups }, (r) => ({
  users: {
    groups: r.many.groups({
      from: r.users.id.through(r.usersToGroups.userId),
      to: r.groups.id.through(r.usersToGroups.groupId),
    }),
  },
  groups: {
    participants: r.many.users(),
  },
}));
```

### Self-Referential Relation

```typescript
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  invitedBy: integer('invited_by').references((): AnyPgColumn => users.id),
});

export const usersRelations = relations(users, ({ one }) => ({
  invitee: one(users, {
    fields: [users.invitedBy],
    references: [users.id],
  }),
}));
```

---

## CRUD Operations

### Insert

```typescript
import { eq } from 'drizzle-orm';

// Single insert
await db.insert(users).values({
  name: 'John',
  email: 'john@example.com',
});

// Multiple inserts
await db.insert(users).values([
  { name: 'John', email: 'john@example.com' },
  { name: 'Jane', email: 'jane@example.com' },
]);

// Returning inserted row
const [newUser] = await db.insert(users).values({
  name: 'John',
  email: 'john@example.com',
}).returning();
```

### Select

```typescript
// Select all
const allUsers = await db.select().from(users);

// Select specific columns
const result = await db.select({
  id: users.id,
  name: users.name,
}).from(users);

// Select with where
const user = await db.select().from(users).where(eq(users.id, 1));

// Select first match
const [user] = await db.select().from(users).where(eq(users.id, 1));

// $count shorthand
const count = await db.$count(users);
const activeCount = await db.$count(users, eq(users.verified, true));
```

### Update

```typescript
await db.update(users)
  .set({ name: 'John Updated' })
  .where(eq(users.id, 1));

// With returning
const [updatedUser] = await db.update(users)
  .set({ verified: true })
  .where(eq(users.email, 'john@example.com'))
  .returning();
```

### Delete

```typescript
await db.delete(users).where(eq(users.id, 1));

// With returning
const [deletedUser] = await db.delete(users)
  .where(eq(users.email, 'john@example.com'))
  .returning();
```

---

## Query Operators

```typescript
import { eq, ne, gt, gte, lt, lte, like, ilike, inArray, isNull, isNotNull, and, or, between, exists, notExists } from 'drizzle-orm';

// Comparison
eq(users.id, 1)
ne(users.name, 'John')
gt(users.age, 18)
gte(users.age, 18)
lt(users.age, 65)
lte(users.age, 65)

// String matching
like(users.name, '%John%')      // case-sensitive
ilike(users.name, '%john%')     // case-insensitive

// Null checks
isNull(users.deletedAt)
isNotNull(users.deletedAt)

// Array
inArray(users.id, [1, 2, 3])

// Range
between(users.createdAt, startDate, endDate)

// Combining conditions
and(
  gte(users.age, 18),
  eq(users.verified, true)
)

or(
  eq(users.role, 'admin'),
  eq(users.role, 'moderator')
)
```

---

## Pagination

```typescript
import { asc, desc } from 'drizzle-orm';

// Basic pagination
const page = 1;
const pageSize = 10;

const users = await db
  .select()
  .from(users)
  .orderBy(asc(users.id))
  .limit(pageSize)
  .offset((page - 1) * pageSize);

// Cursor-based pagination (more efficient)
const lastId = 100;
const users = await db
  .select()
  .from(users)
  .where(gt(users.id, lastId))
  .orderBy(asc(users.id))
  .limit(10);
```

---

## Joins

```typescript
import { eq } from 'drizzle-orm';

// Left join
const result = await db
  .select()
  .from(users)
  .leftJoin(posts, eq(users.id, posts.authorId));

// Inner join
const result = await db
  .select()
  .from(users)
  .innerJoin(posts, eq(users.id, posts.authorId));

// Multiple joins
const result = await db
  .select()
  .from(users)
  .leftJoin(posts, eq(users.id, posts.authorId))
  .leftJoin(comments, eq(posts.id, comments.postId));

// Partial select with join
const usersWithPosts = await db
  .select({
    userId: users.id,
    userName: users.name,
    postTitle: posts.title,
  })
  .from(users)
  .leftJoin(posts, eq(users.id, posts.authorId));

// Self-join with alias
import { alias } from 'drizzle-orm';
const parent = alias(users, 'parent');
const result = await db
  .select()
  .from(users)
  .leftJoin(parent, eq(parent.id, users.parentId));
```

---

## Aggregations

```typescript
import { count, sum, avg, min, max, sql, gt } from 'drizzle-orm';

// Count all
const [{ value }] = await db.select({ value: count() }).from(users);

// Count with condition
const [{ value }] = await db
  .select({ value: count(users.id) })
  .from(users)
  .where(gt(users.age, 18));

// Sum, Avg
const [stats] = await db
  .select({
    totalAge: sum(users.age),
    avgAge: avg(users.age),
  })
  .from(users);

// Min, Max
const [extremes] = await db
  .select({
    oldest: min(users.age),
    youngest: max(users.age),
  })
  .from(users);

// Group by with having
const ageGroups = await db
  .select({
    age: users.age,
    count: sql<number>`cast(count(${users.id}) as int)`,
  })
  .from(users)
  .groupBy(users.age)
  .having(({ count }) => gt(count, 1));
```

---

## Transactions

```typescript
// Basic transaction
await db.transaction(async (tx) => {
  await tx.update(accounts)
    .set({ balance: sql`${accounts.balance} - 100` })
    .where(eq(accounts.userId, 1));

  await tx.update(accounts)
    .set({ balance: sql`${accounts.balance} + 100` })
    .where(eq(accounts.userId, 2));
});

// Transaction with rollback
await db.transaction(async (tx) => {
  const [account] = await tx.select()
    .from(accounts)
    .where(eq(accounts.userId, 1));

  if (account.balance < 100) {
    tx.rollback(); // Throws exception
  }

  await tx.update(accounts)
    .set({ balance: sql`${accounts.balance} - 100` })
    .where(eq(accounts.userId, 1));
});

// Transaction with return value
const newBalance = await db.transaction(async (tx) => {
  await tx.update(accounts)
    .set({ balance: sql`${accounts.balance} - 100` })
    .where(eq(accounts.userId, 1));

  const [account] = await tx.select()
    .from(accounts)
    .where(eq(accounts.userId, 1));

  return account.balance;
});

// Nested transactions (savepoints)
await db.transaction(async (tx) => {
  await tx.insert(users).values({ name: 'John' });

  await tx.transaction(async (tx2) => {
    await tx2.insert(posts).values({ title: 'Hello', authorId: 1 });
  });
});
```

---

## Drizzle Kit Migrations

### Configuration (drizzle.config.ts)

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### package.json Scripts

```json
{
  "scripts": {
    "generate": "drizzle-kit generate",
    "migrate": "drizzle-kit migrate",
    "push": "drizzle-kit push",
    "pull": "drizzle-kit pull"
  }
}
```

### CLI Commands

```bash
# Generate migration files from schema
npx drizzle-kit generate

# Apply pending migrations
npx drizzle-kit migrate

# Push schema directly to DB (for development)
npx drizzle-kit push

# Pull schema from existing database
npx drizzle-kit pull
```

### Programmatic Migration

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const db = drizzle(process.env.DATABASE_URL);
await migrate(db, { migrationsFolder: './drizzle' });
```

---

## Type Inference

```typescript
// Infer insert type
type NewUser = typeof users.$inferInsert;
// { id: number; name: string; email: string; ... }

// Infer select type
type User = typeof users.$inferSelect;
// { id: number; name: string; email: string; ... }

// Use in functions
async function createUser(data: typeof users.$inferInsert) {
  return db.insert(users).values(data).returning();
}

async function getUser(id: number): Promise<typeof users.$inferSelect> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}
```

---

## Common Patterns

### Soft Delete

```typescript
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  deletedAt: timestamp('deleted_at'),
});

// Query non-deleted only
const activeUsers = await db
  .select()
  .from(users)
  .where(isNull(users.deletedAt));

// Soft delete
await db
  .update(users)
  .set({ deletedAt: new Date() })
  .where(eq(users.id, id));
```

### Upsert

```typescript
import { onConflict } from 'drizzle-orm';

await db
  .insert(users)
  .values({ id: 1, name: 'John', email: 'john@example.com' })
  .onConflict(onConflict(users.email).doUpdateSet({
    name: excluded.name,
  }));
```

### Batch Operations

```typescript
// Batch insert
await db.insert(users).values(batch).returning();

// Batch update
const updates = batch.map(item => ({
  id: item.id,
  name: item.name,
}));
await db.insert(users).values(updates).onConflictDoNothing();
```
