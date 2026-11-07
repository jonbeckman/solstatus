# Drizzle Kit Migrations - Complete Reference

## Configuration (drizzle.config.ts)

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

## Configuration for Different Databases

### PostgreSQL
```typescript
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### MySQL
```typescript
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT!),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
  },
});
```

### SQLite
```typescript
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: './local-db.sqlite',
  },
});
```

## package.json Scripts

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:pull": "drizzle-kit pull",
    "db:studio": "drizzle-kit studio"
  }
}
```

## CLI Commands

```bash
# Generate migration files from schema changes
npx drizzle-kit generate

# Apply pending migrations to database
npx drizzle-kit migrate

# Push schema directly to DB (development only - no migration files)
npx drizzle-kit push

# Pull schema from existing database (reverse engineer)
npx drizzle-kit pull

# Open Drizzle Studio (database GUI)
npx drizzle-kit studio
```

## Programmatic Migration

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const db = drizzle(process.env.DATABASE_URL);

// Run migrations
await migrate(db, { migrationsFolder: './drizzle' });
```

## Migration File Structure

```
drizzle/
├── 0001_create_users.sql
├── 0002_create_posts.sql
├── 0003_add_verified_column.sql
└── meta/
    └── 0001.json
```

## Custom Migration SQL

```sql
-- 0001_create_users.sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 0002_add_verified_column.sql
ALTER TABLE users ADD COLUMN verified BOOLEAN DEFAULT FALSE;
```

## Migration Best Practices

1. **Always review generated migrations** before committing
2. **Test migrations in development** before running in production
3. **Use `generate` + `migrate`** for production workflow
4. **Use `push`** only for rapid prototyping/development
5. **Back up production database** before running migrations
6. **Never modify existing migration files** - create new ones
7. **Use descriptive migration names** for easier tracking
