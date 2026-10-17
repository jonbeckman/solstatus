import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import * as Cloudflare from "alchemy/Cloudflare"
import * as Effect from "effect/Effect"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const migrationsDir = resolve(__dirname, "../src/db/migrations")

export function createSessionsStorageKV(resPrefix: string) {
  const kvName = `${resPrefix}-sessions-storage`
  return Cloudflare.KV.Namespace("sessions-storage", {
    title: kvName,
  })
}

export function createDB(resPrefix: string) {
  return Cloudflare.D1.Database("db", {
    name: resPrefix,
    migrations: migrationsDir,
  })
}

export type SessionsStorageKVResource = Effect.Success<ReturnType<typeof createSessionsStorageKV>>
export type DBResource = Effect.Success<ReturnType<typeof createDB>>
