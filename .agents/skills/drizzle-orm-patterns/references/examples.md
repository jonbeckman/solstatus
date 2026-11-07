# Drizzle ORM Patterns - Examples

Complete working examples for common Drizzle ORM use cases. For detailed patterns, see [patterns.md](patterns.md).

## Table of Contents

- [Complete Schema with Relations](#example-1-complete-schema-with-relations)
- [CRUD Operations](#example-2-crud-operations)
- [Transaction with Rollback](#example-3-transaction-with-rollback)

---

## Example 1: Complete Schema with Relations

A complete example showing how to define tables with foreign keys and set up bidirectional relations.

```typescript
import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define tables
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  authorId: integer('author_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
}));
```

### Usage with Relations

```typescript
// Get user with their posts
const userWithPosts = await db.query.users.findFirst({
  where: eq(users.id, 1),
  with: {
    posts: true,
  },
});

// Get posts with their author
const postsWithAuthor = await db.query.posts.findMany({
  with: {
    author: true,
  },
});
```

---

## Example 2: CRUD Operations

Basic Create, Read, Update, Delete operations with Drizzle ORM.

```typescript
import { eq } from 'drizzle-orm';

// Insert a new user
const [newUser] = await db.insert(users).values({
  name: 'John',
  email: 'john@example.com',
}).returning();

// Select user by email
const [user] = await db.select().from(users).where(eq(users.email, 'john@example.com'));

// Update user name
const [updated] = await db.update(users)
  .set({ name: 'John Updated' })
  .where(eq(users.id, 1))
  .returning();

// Delete user
await db.delete(users).where(eq(users.id, 1));
```

### Bulk Operations

```typescript
// Insert multiple users
const newUsers = await db.insert(users).values([
  { name: 'John', email: 'john@example.com' },
  { name: 'Jane', email: 'jane@example.com' },
  { name: 'Bob', email: 'bob@example.com' },
]).returning();

// Select multiple users with filter
const activeUsers = await db
  .select()
  .from(users)
  .where(eq(users.verified, true));
```

---

## Example 3: Transaction with Rollback

A money transfer example demonstrating transaction rollback on insufficient funds.

```typescript
import { eq, sql } from 'drizzle-orm';

async function transferFunds(fromId: number, toId: number, amount: number) {
  await db.transaction(async (tx) => {
    const [from] = await tx.select().from(accounts).where(eq(accounts.userId, fromId));

    if (from.balance < amount) {
      tx.rollback(); // Rolls back all changes
    }

    await tx.update(accounts)
      .set({ balance: sql`${accounts.balance} - ${amount}` })
      .where(eq(accounts.userId, fromId));

    await tx.update(accounts)
      .set({ balance: sql`${accounts.balance} + ${amount}` })
      .where(eq(accounts.userId, toId));
  });
}
```

### Transaction with Error Handling

```typescript
async function safeTransfer(fromId: number, toId: number, amount: number) {
  try {
    const result = await db.transaction(async (tx) => {
      const [fromAccount] = await tx
        .select()
        .from(accounts)
        .where(eq(accounts.userId, fromId));

      if (!fromAccount || fromAccount.balance < amount) {
        tx.rollback();
        return { success: false, error: 'Insufficient funds' };
      }

      await tx.update(accounts)
        .set({ balance: sql`${accounts.balance} - ${amount}` })
        .where(eq(accounts.userId, fromId));

      await tx.update(accounts)
        .set({ balance: sql`${accounts.balance} + ${amount}` })
        .where(eq(accounts.userId, toId));

      return { success: true };
    });

    return result;
  } catch (error) {
    return { success: false, error: 'Transaction failed' };
  }
}
```

---

## Example 4: Complex Query with Joins

Retrieving users with their posts using joins.

```typescript
import { eq } from 'drizzle-orm';

const usersWithPosts = await db
  .select({
    userId: users.id,
    userName: users.name,
    postId: posts.id,
    postTitle: posts.title,
  })
  .from(users)
  .leftJoin(posts, eq(users.id, posts.authorId));

// Result structure:
// [
//   { userId: 1, userName: 'John', postId: 1, postTitle: 'Hello' },
//   { userId: 1, userName: 'John', postId: 2, postTitle: 'World' },
//   { userId: 2, userName: 'Jane', postId: null, postTitle: null },
// ]
```

---

## Example 5: Pagination Implementation

Implementing cursor-based pagination for large datasets.

```typescript
import { gt, asc } from 'drizzle-orm';

async function getUsersPaginated(cursor?: number, limit = 10) {
  const query = db
    .select()
    .from(users)
    .orderBy(asc(users.id))
    .limit(limit + 1); // Get one extra to check if there's a next page

  if (cursor) {
    query.where(gt(users.id, cursor));
  }

  const results = await query;
  const hasNextPage = results.length > limit;
  const items = hasNextPage ? results.slice(0, -1) : results;
  const nextCursor = hasNextPage ? items[items.length - 1].id : null;

  return {
    items,
    nextCursor,
    hasNextPage,
  };
}

// Usage
const firstPage = await getUsersPaginated();
const secondPage = await getUsersPaginated(firstPage.nextCursor);
```

---

## Example 6: Aggregation Query

Calculating user statistics with aggregations.

```typescript
import { count, avg, sql, gt } from 'drizzle-orm';

const stats = await db
  .select({
    totalUsers: count(users.id),
    averageAge: avg(users.age),
    verifiedUsers: sql<number>`cast(count(case when ${users.verified} then 1 end) as int)`,
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

## Example 7: Soft Delete Pattern

Implementing soft delete to preserve data integrity.

```typescript
import { isNull } from 'drizzle-orm';

// Schema with deletedAt
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  deletedAt: timestamp('deleted_at'),
});

// Always query non-deleted users
const activeUsers = await db
  .select()
  .from(users)
  .where(isNull(users.deletedAt));

// Soft delete instead of hard delete
await db
  .update(users)
  .set({ deletedAt: new Date() })
  .where(eq(users.id, userId));

// Restore soft-deleted user
await db
  .update(users)
  .set({ deletedAt: null })
  .where(eq(users.id, userId));
```

---

## Example 8: Full-Featured Repository Pattern

A complete repository class using Drizzle ORM.

```typescript
import { eq, ilike, desc } from 'drizzle-orm';

class UserRepository {
  constructor(private db: typeof db) {}

  async create(data: typeof users.$inferInsert) {
    const [user] = await this.db.insert(users).values(data).returning();
    return user;
  }

  async findById(id: number) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id));
    return user;
  }

  async findByEmail(email: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user;
  }

  async search(query: string, limit = 10) {
    return this.db
      .select()
      .from(users)
      .where(ilike(users.name, `%${query}%`))
      .limit(limit);
  }

  async update(id: number, data: Partial<typeof users.$inferInsert>) {
    const [user] = await this.db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async delete(id: number) {
    await this.db.delete(users).where(eq(users.id, id));
  }

  async list(options: { page?: number; pageSize?: number } = {}) {
    const { page = 1, pageSize = 10 } = options;
    return this.db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
  }
}
```
