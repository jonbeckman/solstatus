import { createApi } from "@solstatus/api/infra"
import { createApp } from "@solstatus/app/infra"
import { createDB, createSessionsStorageKV } from "@solstatus/common/infra"
import * as Effect from "effect/Effect"

export interface SolStatusConfig {
  stage: string
  fqdn?: string
  cloudflareAccountId: string
}

export function SolStatus(name: string, config: SolStatusConfig) {
  const { stage, fqdn, cloudflareAccountId } = config
  return Effect.gen(function* () {
    const sessionsStorageKV = yield* createSessionsStorageKV(name)
    const db = yield* createDB(name)
    const { monitorExecWorker, monitorTriggerWorker } = yield* createApi(
      name,
      stage,
      db,
      cloudflareAccountId,
    )
    const app = yield* createApp(
      name,
      db,
      sessionsStorageKV,
      monitorExecWorker,
      monitorTriggerWorker,
      fqdn,
      cloudflareAccountId,
    )
    return {
      sessionsStorageKV,
      db,
      monitorExecWorker,
      monitorTriggerWorker,
      app,
    }
  })
}

export type SolStatusOutput = Effect.Success<ReturnType<typeof SolStatus>>
