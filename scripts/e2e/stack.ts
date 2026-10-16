/* oxlint-disable no-console -- Redacted stack startup diagnostics only. */
import { spawn } from "node:child_process"
import { createConnection } from "node:net"
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { randomBytes } from "node:crypto"

for (const file of [".env", "packages/infra/.dev.vars"]) {
  if (existsSync(file)) process.loadEnvFile(file)
}

for (const name of ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN", "BETTER_AUTH_SECRET"]) {
  if (!process.env[name]) {
    throw new Error(
      `Missing ${name}. Configure packages/infra/.dev.vars or the CI environment before starting the SolStatus e2e stack.`,
    )
  }
}

for (const port of [3000, 8787, 8788]) {
  const occupied = await new Promise<boolean>((done) => {
    const socket = createConnection({ host: "127.0.0.1", port })
    socket.once("connect", () => {
      socket.destroy()
      done(true)
    })
    socket.once("error", () => {
      socket.destroy()
      done(false)
    })
  })
  if (occupied) {
    throw new Error(`Port ${port} is occupied; stop the existing SolStatus stack before e2e`)
  }
}

mkdirSync(".e2e/logs", { recursive: true, mode: 0o700 })
mkdirSync(".e2e/runs", { recursive: true, mode: 0o700 })

const runId = crypto.randomUUID()
const ownershipPath = resolve(".e2e/cleanup", `${runId}.json`)
mkdirSync(resolve(".e2e/cleanup"), { recursive: true, mode: 0o700 })
writeFileSync(
  ownershipPath,
  JSON.stringify({
    id: runId,
    pid: process.pid,
    stage: "test",
    startedAt: new Date().toISOString(),
  }),
  { mode: 0o600 },
)

const env: NodeJS.ProcessEnv = {
  ...process.env,
  CI: "1",
  STAGE: "test",
  APP_NAME: process.env.APP_NAME || "solstatus-e2e",
  E2E_RUN_ID: runId,
  SECRET_ALCHEMY_PASSPHRASE:
    process.env.SECRET_ALCHEMY_PASSPHRASE || randomBytes(16).toString("hex"),
}
// Never pass runner-only secrets into the application child.
delete env.CF_AI_GATEWAY_E2E_TOKEN
delete env.GH_TOKEN
delete env.GITHUB_TOKEN
delete env.NODE_CHANNEL_FD
delete env.NODE_CHANNEL_SERIALIZATION_MODE
delete env.NODE_UNIQUE_ID
delete env.WATCH_REPORT_DEPENDENCIES

const sensitiveValues = Object.entries(process.env)
  .filter(
    ([name, value]) =>
      /TOKEN|SECRET|PASSWORD|KEY|PASSPHRASE/.test(name) && value && value.length > 5,
  )
  .map(([, value]) => value!)

const redact = (chunk: Buffer) =>
  sensitiveValues.reduce((text, value) => text.replaceAll(value, "[redacted]"), chunk.toString())

const child = spawn("nub", ["run", "--cwd", "packages/infra", "infra:dev"], {
  env: { ...env, STAGE: "test" },
  detached: true,
  stdio: ["ignore", "pipe", "pipe"],
})

let stopping = false
const stop = (signal: NodeJS.Signals = "SIGTERM") => {
  if (stopping) return
  stopping = true
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
}

process.on("SIGINT", () => stop("SIGINT"))
process.on("SIGTERM", () => stop("SIGTERM"))

child.stdout?.on("data", (chunk) => process.stdout.write(redact(chunk)))
child.stderr?.on("data", (chunk) => process.stderr.write(redact(chunk)))

child.on("exit", (code, signal) => {
  process.exitCode = stopping ? 0 : (code ?? (signal ? 130 : 1))
})
child.on("error", (error) => {
  console.error(error.message)
  process.exitCode = 1
})

// Keep the launcher alive while the Alchemy child runs.
await new Promise<void>((resolvePromise) => {
  child.on("exit", () => resolvePromise())
  child.on("error", () => resolvePromise())
})
