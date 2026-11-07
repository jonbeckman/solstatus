import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import type { MonitorExecWorkerResource, MonitorTriggerWorkerResource } from "@solstatus/api/infra"
import type { DBResource, SessionsStorageKVResource } from "@solstatus/common/infra"
import * as Cloudflare from "@alchemy.run/cloudflare"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const appRoot = resolve(__dirname, "..")

// Better Auth signs sessions with this value. An empty secret is not safe, so the stack stops.
function requiredEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(
      `${name} is not set. Generate one with \`openssl rand -hex 32\` and add it to .env.`,
    )
  }

  return value
}

export function createApp(
  resPrefix: string,
  db: DBResource,
  sessionsStorageKV: SessionsStorageKVResource,
  monitorExecWorker: MonitorExecWorkerResource,
  monitorTriggerWorker: MonitorTriggerWorkerResource,
  fqdn: string | undefined,
  cloudflareAccountId: string,
) {
  const appName = `${resPrefix}-app`

  const website = {
    name: appName,
    rootDir: appRoot,
    compatibility: {
      date: "2026-07-21",
      flags: ["nodejs_compat"],
    },
    observability: {
      enabled: true,
    },
    dev: {
      port: 3000,
      strictPort: true,
    },
    env: {
      DB: db,
      SESSIONS_KV: sessionsStorageKV,
      BETTER_AUTH_SECRET: requiredEnv("BETTER_AUTH_SECRET"),
      MONITOR_EXEC: monitorExecWorker,
      MONITOR_TRIGGER_RPC: monitorTriggerWorker,
      MONITOR_EXEC_NAME: `${resPrefix}-monitor-exec`,
      MONITOR_TRIGGER_NAME: `${resPrefix}-monitor-trigger`,
      CLOUDFLARE_ACCOUNT_ID: cloudflareAccountId,
      VITE_APP_VERSION: process.env.VITE_APP_VERSION || "2.1.0-dev",
    },
  }

  if (fqdn === undefined) {
    return Cloudflare.Website.Vite("app", website)
  }

  return Cloudflare.Website.Vite("app", {
    ...website,
    domain: {
      name: fqdn,
    },
    workersDev: false,
  })
}

export type AppResource = Awaited<ReturnType<typeof createApp>>
