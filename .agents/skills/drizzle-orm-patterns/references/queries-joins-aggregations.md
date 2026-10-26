# Queries, Joins, and Aggregations - Complete Reference

## CRUD Operations

### Insert

```typescript
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

## Query Operators

```typescript
import { eq, ne, gt, gte, lt, lte, like, ilike, inArray, isNull, isNotNull, and, or, between, exists, notExists } from 'drizzle-orm';

// Comparison
eq(users.id, 1)           // id = 1
ne(users.name, 'John')    // name != 'John'
gt(users.age, 18)         // age > 18
gte(users.age, 18)        // age >= 18
lt(users.age, 65)         // age < 65
lte(users.age, 65)        // age <= 65

// String matching
like(users.name, '%John%')   // case-sensitive
ilike(users.name, '%john%')  // case-insensitive

// Null checks
isNull(users.deletedAt)       // deleted_at IS NULL
isNotNull(users.deletedAt)    // deleted_at IS NOT NULL

// Array
inArray(users.id, [1, 2, 3])  // id IN (1, 2, 3)

// Range
between(users.createdAt, startDate, endDate)  // created_at BETWEEN start AND end

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

## Pagination

```typescript
import { asc, desc } from 'drizzle-orm';

// Basic pagination (offset-based)
const page = 1;
const pageSize = 10;

const users = await db
  .select()
  .from(users)
  .orderBy(asc(users.id))
  .limit(pageSize)
  .offset((page - 1) * pageSize);

// Cursor-based pagination (more efficient for large datasets)
const lastId = 100;
const users = await db
  .select()
  .from(users)
  .where(gt(users.id, lastId))
  .orderBy(asc(users.id))
  .limit(10);
```

## Joins

```typescript
import { eq, alias } from 'drizzle-orm';

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
const parent = alias(users, 'parent');
const result = await db
  .select()
  .from(users)
  .leftJoin(parent, eq(parent.id, users.parentId));
```

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
