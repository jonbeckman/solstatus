# Relations - Complete Reference

## One-to-Many (v1 syntax)

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

## One-to-One

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

export const usersRelations = relations(users, ({ one }) => ({
  profile: one(profiles),
}));
```

## Many-to-Many (v2 syntax with defineRelations)

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

## Many-to-Many (v1 syntax)

```typescript
import { relations } from 'drizzle-orm';

export const usersRelations = relations(users, ({ many }) => ({
  usersToGroups: many(usersToGroups),
}));

export const groupsRelations = relations(groups, ({ many }) => ({
  usersToGroups: many(usersToGroups),
}));

export const usersToGroupsRelations = relations(usersToGroups, ({ one }) => ({
  user: one(users, {
    fields: [usersToGroups.userId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [usersToGroups.groupId],
    references: [groups.id],
  }),
}));
```

## Self-Referential Relation

```typescript
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  invitedBy: integer('invited_by').references((): AnyPgColumn => users.id),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  invitee: one(users, {
    fields: [users.invitedBy],
    references: [users.id],
  }),
  invitedUsers: many(users),
}));
```

## Querying with Relations

```typescript
// Query with nested relations
const usersWithPosts = await db.query.users.findMany({
  with: {
    posts: true,
  },
});

// Query with specific fields
const usersWithPostCount = await db.query.users.findMany({
  with: {
    posts: {
      columns: {
        id: true,
        title: true,
      },
    },
  },
});

// Nested relations
const usersWithPostsAndComments = await db.query.users.findMany({
  with: {
    posts: {
      with: {
        comments: true,
      },
    },
  },
});
```
