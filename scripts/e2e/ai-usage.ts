import { appendFileSync, mkdirSync } from "node:fs"

export type AiUsage = {
  schemaVersion: 1
  source: "executor"
  model: "@cf/cloudflare/clef"
  cache: "hit" | "miss" | "bypass" | "unknown"
  cacheLayer: "gateway"
  requests: 1
  operations: 0
  inputTokens: number | null
  outputTokens: number | null
  cachedInputTokens: null
  status: "success" | "error"
  httpStatus: number | null
  startedAt: string
}

export function gatewayCache(headers: Headers, bypass: boolean): AiUsage["cache"] {
  const status = headers.get("cf-aig-cache-status")?.toUpperCase()
  if (status === "HIT") return "hit"
  if (bypass) return "bypass"
  return status === "MISS" ? "miss" : "unknown"
}

export function measuredTokens(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null
}

/** Private ledger contains only counters, never request or response content. */
export function recordAiUsage(record: AiUsage): void {
  if (process.env.E2E_AI_USAGE !== "1") return
  try {
    mkdirSync(".e2e/ai-usage", { recursive: true, mode: 0o700 })
    appendFileSync(".e2e/ai-usage/executor.jsonl", `${JSON.stringify(record)}\n`, {
      mode: 0o600,
    })
  } catch {
    // Accounting must not change the tested flow or suppress its original error.
    // The summary reconciles this ledger against the SDK's model-call count.
    process.stderr.write("E2E AI accounting could not write a usage record.\n")
  }
}
