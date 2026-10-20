import { readdirSync, readFileSync } from "node:fs"
import { DatabaseSync, type SQLInputValue } from "node:sqlite"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

process.env.BETTER_AUTH_URL ??= "http://localhost"

const migrationsDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../packages/common/src/db/migrations",
)

const database = new DatabaseSync(":memory:")

for (const fileName of readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort()) {
  database.exec(readFileSync(resolve(migrationsDir, fileName), "utf8"))
}

type SqlParam = SQLInputValue
type Row = Record<string, unknown>

type D1Result = {
  results: Row[]
  success: true
  meta: {
    duration: number
    changes: number
    last_row_id: number
    changed_db: boolean
    size_after: number
    rows_read: number
    rows_written: number
  }
}

function normalizeParam(value: unknown): SqlParam {
  if (value === undefined || value === null) {
    return null
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0
  }
  if (value instanceof Date) {
    return value.getTime()
  }
  if (typeof value === "number" || typeof value === "bigint" || typeof value === "string") {
    return value
  }
  if (value instanceof Uint8Array) {
    return value
  }
  return String(value)
}

function isRowQuery(sqlText: string) {
  const trimmed = sqlText.trim().toLowerCase()
  return (
    trimmed.startsWith("select") ||
    trimmed.startsWith("with") ||
    trimmed.startsWith("pragma") ||
    trimmed.includes(" returning ")
  )
}

function execute(sqlText: string, params: SqlParam[]): D1Result {
  const statement = database.prepare(sqlText)
  const bound = params.map((value) => normalizeParam(value))
  if (isRowQuery(sqlText)) {
    const results = statement.all(...bound) as Row[]
    return {
      results,
      success: true,
      meta: {
        duration: 0,
        changes: 0,
        last_row_id: 0,
        changed_db: false,
        size_after: 0,
        rows_read: results.length,
        rows_written: 0,
      },
    }
  }

  const info = statement.run(...bound)
  const changes = Number(info.changes)
  return {
    results: [],
    success: true,
    meta: {
      duration: 0,
      changes,
      last_row_id: Number(info.lastInsertRowid),
      changed_db: changes > 0,
      size_after: 0,
      rows_read: 0,
      rows_written: changes,
    },
  }
}

class PreparedStatement {
  constructor(
    private readonly sqlText: string,
    private readonly params: SqlParam[],
  ) {}

  bind(...params: SqlParam[]) {
    return new PreparedStatement(this.sqlText, params)
  }

  all() {
    return Promise.resolve(execute(this.sqlText, this.params))
  }

  run() {
    return Promise.resolve(execute(this.sqlText, this.params))
  }

  first(column?: string) {
    const result = execute(this.sqlText, this.params)
    const row = result.results[0]
    if (!row) {
      return Promise.resolve(null)
    }
    if (column) {
      return Promise.resolve(row[column] ?? null)
    }
    return Promise.resolve(row)
  }

  raw() {
    const result = execute(this.sqlText, this.params)
    return Promise.resolve(result.results.map((row) => Object.values(row)))
  }
}

const d1 = {
  prepare(sqlText: string) {
    return new PreparedStatement(sqlText, [])
  },
  batch(statements: PreparedStatement[]) {
    return Promise.all(statements.map((statement) => statement.all()))
  },
  exec(sqlText: string) {
    database.exec(sqlText)
    return Promise.resolve({ count: 0, duration: 0 })
  },
}

type KvEntry = {
  value: string
  expiresAt?: number
}

const kvStore = new Map<string, KvEntry>()

const sessionsKv = {
  async get(key: string) {
    const entry = kvStore.get(key)
    if (!entry) {
      return null
    }
    if (entry.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
      kvStore.delete(key)
      return null
    }
    return entry.value
  },
  async put(key: string, value: string, options?: { expirationTtl?: number }) {
    const expiresAt =
      options?.expirationTtl === undefined ? undefined : Date.now() + options.expirationTtl * 1000
    kvStore.set(key, { value, expiresAt })
  },
  async delete(key: string) {
    kvStore.delete(key)
  },
}

export const env = {
  DB: d1,
  SESSIONS_KV: sessionsKv,
  BETTER_AUTH_SECRET: "test-better-auth-secret-with-32b",
  MONITOR_EXEC: {
    async executeCheck() {},
  },
  MONITOR_TRIGGER_RPC: {
    async init() {},
    async updateCheckInterval() {},
    async deleteDo() {},
    async pauseDo() {},
    async resumeDo() {},
  },
  MONITOR_EXEC_NAME: "solstatus-test-monitor-exec",
  MONITOR_TRIGGER_NAME: "solstatus-test-monitor-trigger",
  CLOUDFLARE_ACCOUNT_ID: "00000000000000000000000000000000",
  VITE_APP_VERSION: "3.0.0",
}

export function resetApiTestState() {
  const tables = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .all() as { name: string }[]
  for (const table of tables) {
    database.exec(`DELETE FROM "${table.name}"`)
  }
  kvStore.clear()
}

export function queryRows(sqlText: string, ...params: SqlParam[]) {
  return execute(sqlText, params).results
}
