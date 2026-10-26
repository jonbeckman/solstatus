# Drizzle ORM Patterns - Best Practices

Best practices, constraints, and warnings for using Drizzle ORM effectively.

## Table of Contents

- [Best Practices](#best-practices)
- [Constraints and Warnings](#constraints-and-warnings)
- [Performance Tips](#performance-tips)
- [Security Considerations](#security-considerations)

---

## Best Practices

### 1. Type Safety

Always use TypeScript and leverage `$inferInsert` / `$inferSelect` for complete type safety.

```typescript
// Infer types from schema
type NewUser = typeof users.$inferInsert;
type User = typeof users.$inferSelect;

// Use in function signatures
async function createUser(data: typeof users.$inferInsert) {
  return db.insert(users).values(data).returning();
}

async function getUser(id: number): Promise<typeof users.$inferSelect | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}
```

### 2. Relations

Define relations using the `relations()` API to enable nested queries and maintain referential integrity.

```typescript
// Good: Define both sides of the relation
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));
```

### 3. Transactions

Use transactions for multi-step operations that must succeed together.

```typescript
// Good: Transfer with transaction
await db.transaction(async (tx) => {
  await tx.update(accounts).set({ balance: fromBalance - amount }).where(eq(accounts.id, fromId));
  await tx.update(accounts).set({ balance: toBalance + amount }).where(eq(accounts.id, toId));
});

// Bad: No transaction - partial failure possible
await db.update(accounts).set({ balance: fromBalance - amount }).where(eq(accounts.id, fromId));
await db.update(accounts).set({ balance: toBalance + amount }).where(eq(accounts.id, toId));
```

### 4. Migrations

Use the appropriate migration strategy for each environment:

| Environment | Command | Use Case |
|-------------|---------|----------|
| Development | `drizzle-kit push` | Quick schema sync |
| Production | `drizzle-kit generate` + `drizzle-kit migrate` | Versioned migrations |
| Recovery | `drizzle-kit pull` | Recreate schema from DB |

```typescript
// drizzle.config.ts
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

### 5. Indexes

Add indexes on frequently queried columns and foreign keys.

```typescript
export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  authorId: integer('author_id').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('author_idx').on(table.authorId),    // For filtering by author
  index('created_idx').on(table.createdAt),  // For sorting by date
]);
```

### 6. Soft Deletes

Use `deletedAt` timestamp instead of hard deletes when data retention is required.

```typescript
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  deletedAt: timestamp('deleted_at'),
});

// Always filter deleted records
const activeUsers = await db
  .select()
  .from(users)
  .where(isNull(users.deletedAt));
```

### 7. Pagination

Use cursor-based pagination for large datasets to avoid OFFSET performance issues.

```typescript
// Good: Cursor-based (efficient for large datasets)
const users = await db
  .select()
  .from(users)
  .where(gt(users.id, lastId))
  .orderBy(asc(users.id))
  .limit(10);

// Acceptable: OFFSET-based (okay for small datasets)
const users = await db
  .select()
  .from(users)
  .orderBy(asc(users.id))
  .limit(pageSize)
  .offset((page - 1) * pageSize);
```

### 8. Query Optimization

Use `.limit()` and `.where()` to fetch only needed data.

```typescript
// Good: Specific columns and limit
const userNames = await db
  .select({ name: users.name })
  .from(users)
  .where(eq(users.verified, true))
  .limit(10);

// Bad: Selecting all columns and rows
const allUsers = await db.select().from(users);
```

---

## Constraints and Warnings

### Foreign Key Constraints

**Always** define references using arrow functions `() => table.column` to avoid circular dependency issues.

```typescript
// Good: Arrow function prevents circular dependency
authorId: integer('author_id').references(() => users.id),

// Bad: Direct reference can cause issues
authorId: integer('author_id').references(users.id),
```

### Transaction Rollback

Calling `tx.rollback()` throws an exception. Use try/catch if you need to handle this gracefully.

```typescript
// Rollback throws - handle if needed
try {
  await db.transaction(async (tx) => {
    if (insufficientFunds) {
      tx.rollback();
    }
  });
} catch (error) {
  // Transaction was rolled back
}
```

### Returning Clauses

Not all databases support `.returning()`. Check your dialect compatibility:

| Database | Returning Support |
|----------|-------------------|
| PostgreSQL | Full support |
| MySQL | Limited (8.0.19+) |
| SQLite | Limited (3.35.0+) |
| MSSQL | Use `OUTPUT` clause |

### Type Inference

For newer type-safe patterns, use `InferSelectModel` and `InferInsertModel` from `drizzle-orm`:

```typescript
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

type User = InferSelectModel<typeof users>;
type NewUser = InferInsertModel<typeof users>;
```

### Batch Operations

Large batch inserts may hit database limits. Chunk into smaller batches:

```typescript
// Good: Chunked batch insert
const BATCH_SIZE = 1000;
for (let i = 0; i < users.length; i += BATCH_SIZE) {
  const batch = users.slice(i, i + BATCH_SIZE);
  await db.insert(users).values(batch);
}

// Bad: Single large batch may fail
await db.insert(users).values(veryLargeArray);
```

### Migrations in Production

Always test migrations in staging before applying to production:

```bash
# 1. Backup database first
pg_dump $DATABASE_URL > backup.sql

# 2. Test migration in staging
npx drizzle-kit migrate

# 3. Verify application compatibility
npm run test

# 4. Apply to production during maintenance window
npx drizzle-kit migrate
```

### Soft Delete Queries

Remember to always filter `deletedAt IS NULL` in queries:

```typescript
// Good: Explicitly filter soft-deleted
const activeUsers = await db
  .select()
  .from(users)
  .where(isNull(users.deletedAt));

// Bad: Returns all including deleted
const allUsers = await db.select().from(users);
```

---

## Performance Tips

### Connection Pooling

Use connection pooling for production workloads:

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum pool size
});

const db = drizzle(pool);
```

### Prepared Statements

Drizzle automatically uses prepared statements. Avoid dynamic query building when possible:

```typescript
// Good: Static query (prepared statement)
await db.select().from(users).where(eq(users.id, userId));

// Acceptable: Dynamic with caution
const conditions = [eq(users.active, true)];
if (name) conditions.push(like(users.name, `%${name}%`));
await db.select().from(users).where(and(...conditions));
```

### Select Only Needed Columns

```typescript
// Good: Select specific columns
const { name, email } = await db
  .select({ name: users.name, email: users.email })
  .from(users)
  .where(eq(users.id, 1));

// Bad: Select all columns
const [user] = await db.select().from(users).where(eq(users.id, 1));
```

---

## Security Considerations

### SQL Injection Prevention

Drizzle ORM prevents SQL injection through parameterized queries. Never concatenate user input:

```typescript
// Safe: Parameterized query
await db.select().from(users).where(eq(users.name, userInput));

// Dangerous: Never do this
await db.execute(`SELECT * FROM users WHERE name = '${userInput}'`);
```

### Environment Variables

Never commit database credentials to version control:

```typescript
// drizzle.config.ts
export default defineConfig({
  dbCredentials: {
    url: process.env.DATABASE_URL!, // Use env var
  },
});

// NOT: url: 'postgres://user:password@localhost/db'
```

### Row Level Security (PostgreSQL)

For multi-tenant applications, consider PostgreSQL RLS:

```sql
-- Enable RLS on table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.current_tenant')::int);
```
