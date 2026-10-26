# Common Patterns - Complete Reference

## Soft Delete

```typescript
import { isNull } from 'drizzle-orm';

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

// Restore soft-deleted
await db
  .update(users)
  .set({ deletedAt: null })
  .where(eq(users.id, id));
```

## Upsert (Update or Insert)

```typescript
import { onConflict } from 'drizzle-orm';

// PostgreSQL upsert
await db
  .insert(users)
  .values({ id: 1, name: 'John', email: 'john@example.com' })
  .onConflict(onConflict(users.email).doUpdateSet({
    name: excluded.name,
  }));

// MySQL upsert
await db
  .insert(users)
  .values({ id: 1, name: 'John', email: 'john@example.com' })
  .onDuplicateKeyUpdate({ set: { name: 'John Updated' } });
```

## Batch Operations

```typescript
// Batch insert with chunking
async function batchInsert(items: any[]) {
  const chunkSize = 100;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await db.insert(users).values(chunk);
  }
}

// Batch update using upsert
const updates = batch.map(item => ({
  id: item.id,
  name: item.name,
}));
await db.insert(users).values(updates).onConflictDoNothing();
```

## Pagination with Total Count

```typescript
async function paginate(page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;

  const [data, [{ count }]] = await Promise.all([
    db.select().from(users)
      .limit(pageSize)
      .offset(offset)
      .orderBy(asc(users.id)),
    db.select({ count: count() }).from(users)
  ]);

  return { data, count, page, pageSize };
}
```

## Full-Text Search

```typescript
// PostgreSQL full-text search
import { sql, tsVector } from 'drizzle-orm/pg-core';

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  searchText: tsVector('search_text').generatedAlwaysAs(
    sql`to_tsvector('english', coalesce(${posts.title}, '') || ' ' || coalesce(${posts.content}, ''))`
  ),
});

// Search query
const results = await db.select()
  .from(posts)
  .where(sql`${posts.searchText} @@ to_tsquery('english', ${searchQuery})`);
```

## Audit Trail

```typescript
export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  tableName: text('table_name').notNull(),
  recordId: integer('record_id').notNull(),
  action: text('action').notNull(), // 'insert', 'update', 'delete'
  oldValues: json('old_values'),
  newValues: json('new_values'),
  changedBy: integer('changed_by'),
  changedAt: timestamp('changed_at').defaultNow(),
});

// Usage in update
await db.transaction(async (tx) => {
  const [oldRecord] = await tx.select().from(users).where(eq(users.id, id));

  await tx.update(users).set({ name: 'New Name' }).where(eq(users.id, id));

  await tx.insert(auditLog).values({
    tableName: 'users',
    recordId: id,
    action: 'update',
    oldValues: oldRecord,
    newValues: { name: 'New Name' },
    changedBy: userId,
  });
});
```

## Conditional Updates

```typescript
import { sql } from 'drizzle-orm';

// Increment counter
await db.update(posts)
  .set({ viewCount: sql`${posts.viewCount} + 1` })
  .where(eq(posts.id, postId));

// Conditional update (only if value is greater)
await db.update(users)
  .set({ score: sql`GREATEST(${users.score}, ${newScore})` })
  .where(eq(users.id, userId));
```

## Type Inference Examples

```typescript
// Infer insert type
type NewUser = typeof users.$inferInsert;
// { id?: number; name: string; email: string; createdAt?: Date }

// Infer select type
type User = typeof users.$inferSelect;
// { id: number; name: string; email: string; createdAt: Date }

// Use in functions
async function createUser(data: typeof users.$inferInsert) {
  return db.insert(users).values(data).returning();
}

async function getUser(id: number): Promise<typeof users.$inferSelect> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}
```
