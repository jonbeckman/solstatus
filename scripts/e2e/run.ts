/* oxlint-disable no-console -- Reports cleanup status without private state. */
import { spawn } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { processMembers } from "./process-group"

const mcp = process.argv[2] === "--mcp"
const forwarded = process.argv.slice(mcp ? 3 : 2)
if (mcp) process.env.E2E_MCP_PROTOCOL = "1"

mkdirSync(".e2e", { recursive: true })
if (process.env.E2E_CLEANUP_APPEND !== "1") {
  writeFileSync(
    ".e2e/cleanup-summary.json",
    JSON.stringify({ verified: false, failed: false, pending: true }),
  )
}

const runner = processMembers().find((member) => member.pid === process.pid)
let interrupted = false
const child = spawn("nub", ["exec", "e2e", mcp ? "mcp" : "run", ...forwarded], {
  detached: true,
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_E2E_RUNNER_PID: String(process.pid),
    NODE_E2E_RUNNER_BIRTH: runner?.birth ?? "",
    NODE_E2E_RUNNER_GROUP: String(runner?.pgid ?? process.pid),
    E2E_TELEMETRY_DISABLED: process.env.E2E_TELEMETRY_DISABLED ?? "1",
    E2E_AI_USAGE: process.env.E2E_AI_USAGE ?? "1",
  },
})

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    interrupted = true
    if (child.pid) {
      try {
        process.kill(-child.pid, signal)
      } catch {
        try {
          child.kill(signal)
        } catch {
          /* already stopped */
        }
      }
    }
  })
}

const code = await new Promise<number | null>((accept) => {
  child.on("exit", (exitCode) => accept(exitCode))
  child.on("error", () => accept(1))
})

process.exitCode = interrupted ? 130 : (code ?? 1)

try {
  const { recoverOwnedRuns } = await import("./cleanup")
  await recoverOwnedRuns()
  writeFileSync(
    ".e2e/cleanup-summary.json",
    JSON.stringify({ verified: true, failed: false, containersRemoved: 0 }),
  )
} catch (error) {
  writeFileSync(".e2e/cleanup-summary.json", JSON.stringify({ verified: false, failed: true }))
  console.error(
    "Owned suite cleanup incomplete; retry nub run test:e2e:cleanup.",
    error instanceof Error ? error.message : error,
  )
  process.exitCode = 1
}
