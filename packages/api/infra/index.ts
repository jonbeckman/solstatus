import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import type { DBResource } from "@solstatus/common/infra"
import type { InfraMetadata } from "@solstatus/common/utils/types"
import * as Cloudflare from "alchemy/Cloudflare"
import * as Effect from "effect/Effect"
import * as Redacted from "effect/Redacted"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export function createApi(
  resPrefix: string,
  stage: string,
  db: DBResource,
  cloudflareAccountId: string,
) {
  return Effect.gen(function* () {
    const infraMetadata = {
      cloudflareAccountId,
      monitorExecName: `${resPrefix}-monitor-exec`,
      monitorTriggerName: `${resPrefix}-monitor-trigger`,
    }
    const monitorExecWorker = yield* createMonitorExecWorker(infraMetadata, stage, db)
    const monitorTriggerWorker = yield* createMonitorTriggerWorker(
      infraMetadata,
      db,
      monitorExecWorker,
    )
    return {
      monitorExecWorker,
      monitorTriggerWorker,
    }
  })
}

export function createMonitorExecWorker(
  infraMetadata: InfraMetadata,
  stage: string,
  db: DBResource,
) {
  const entrypoint = resolve(__dirname, "../src/monitor-exec.ts")
  return Cloudflare.Worker("monitor-exec", {
    name: infraMetadata.monitorExecName,
    main: entrypoint,
    compatibility: {
      date: "2026-07-21",
      flags: ["nodejs_compat"],
    },
    observability: {
      enabled: true,
    },
    env: {
      DB: db,
      OPSGENIE_API_KEY: Redacted.make(process.env.OPSGENIE_API_KEY || ""),
      APP_ENV: stage,
      MONITOR_EXEC_NAME: infraMetadata.monitorExecName,
      MONITOR_TRIGGER_NAME: infraMetadata.monitorTriggerName,
      CLOUDFLARE_ACCOUNT_ID: infraMetadata.cloudflareAccountId,
    },
  })
}

export function createMonitorTriggerWorker(
  infraMetadata: InfraMetadata,
  db: DBResource,
  monitorExecWorker: Effect.Success<ReturnType<typeof createMonitorExecWorker>>,
) {
  const entrypoint = resolve(__dirname, "../src/monitor-trigger.ts")
  const monitorTriggerDo = Cloudflare.DurableObject("monitor-trigger-do", {
    className: "MonitorTrigger",
  })
  return Cloudflare.Worker("monitor-trigger", {
    name: infraMetadata.monitorTriggerName,
    main: entrypoint,
    compatibility: {
      date: "2026-07-21",
      flags: ["nodejs_compat"],
    },
    observability: {
      enabled: true,
    },
    env: {
      DB: db,
      MONITOR_EXEC: monitorExecWorker,
      MONITOR_TRIGGER: monitorTriggerDo,
      MONITOR_EXEC_NAME: infraMetadata.monitorExecName,
      MONITOR_TRIGGER_NAME: infraMetadata.monitorTriggerName,
      CLOUDFLARE_ACCOUNT_ID: infraMetadata.cloudflareAccountId,
    },
  })
}

export type MonitorExecWorkerResource = Effect.Success<ReturnType<typeof createMonitorExecWorker>>
export type MonitorTriggerWorkerResource = Effect.Success<
  ReturnType<typeof createMonitorTriggerWorker>
>
