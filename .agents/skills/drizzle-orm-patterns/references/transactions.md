# Transactions - Complete Reference

## Basic Transaction

```typescript
await db.transaction(async (tx) => {
  await tx.update(accounts)
    .set({ balance: sql`${accounts.balance} - 100` })
    .where(eq(accounts.userId, 1));

  await tx.update(accounts)
    .set({ balance: sql`${accounts.balance} + 100` })
    .where(eq(accounts.userId, 2));
});
```

## Transaction with Rollback

```typescript
await db.transaction(async (tx) => {
  const [account] = await tx.select()
    .from(accounts)
    .where(eq(accounts.userId, 1));

  if (account.balance < 100) {
    tx.rollback(); // Throws exception and rolls back all changes
  }

  await tx.update(accounts)
    .set({ balance: sql`${accounts.balance} - 100` })
    .where(eq(accounts.userId, 1));
});
```

## Transaction with Return Value

```typescript
const newBalance = await db.transaction(async (tx) => {
  await tx.update(accounts)
    .set({ balance: sql`${accounts.balance} - 100` })
    .where(eq(accounts.userId, 1));

  const [account] = await tx.select()
    .from(accounts)
    .where(eq(accounts.userId, 1));

  return account.balance;
});
```

## Nested Transactions (Savepoints)

```typescript
await db.transaction(async (tx) => {
  await tx.insert(users).values({ name: 'John' });

  await tx.transaction(async (tx2) => {
    await tx2.insert(posts).values({ title: 'Hello', authorId: 1 });
  });
});
```

## Transfer Funds Example

```typescript
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

## Transaction Error Handling

```typescript
try {
  await db.transaction(async (tx) => {
    // Transaction operations
    await tx.insert(users).values({ name: 'John' });
    // If any error occurs, automatic rollback
  });
} catch (error) {
  console.error('Transaction failed:', error);
}
```

## Transaction Isolation Levels

```typescript
await db.transaction(async (tx) => {
  // Operations
}, {
  isolationLevel: 'serializable', // or 'read committed', 'repeatable read'
});
```
