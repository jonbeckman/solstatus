/* oxlint-disable no-console -- Redacted stack startup diagnostics only. */
import { spawn } from "node:child_process"
import { randomBytes, randomUUID } from "node:crypto"
import { existsSync, mkdirSync, realpathSync, writeFileSync } from "node:fs"
import { createConnection } from "node:net"
import { resolve } from "node:path"

for (const file of [".env", "packages/infra/.dev.vars"]) {
  if (existsSync(file)) process.loadEnvFile(file)
}

if (!process.env.BETTER_AUTH_SECRET) {
  process.env.BETTER_AUTH_SECRET = randomBytes(16).toString("hex")
}

const ownedPorts = [3000, 8787, 8788]

for (const port of ownedPorts) {
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

const runId = randomUUID()
const runDir = resolve(".e2e/runs", runId)
const ownershipPath = resolve(".e2e/cleanup", `${runId}.json`)
mkdirSync(runDir, { recursive: true, mode: 0o700 })
mkdirSync(resolve(".e2e/logs"), { recursive: true, mode: 0o700 })
mkdirSync(resolve(".e2e/cleanup"), { recursive: true, mode: 0o700 })

const publishOwnership = (childPid?: number) => {
  writeFileSync(
    ownershipPath,
    JSON.stringify({
      id: runId,
      pid: process.pid,
      childPid,
      stateDir: runDir,
      ports: ownedPorts,
      stage: "dev",
      startedAt: new Date().toISOString(),
    }),
    { mode: 0o600 },
  )
}

publishOwnership()

const env: NodeJS.ProcessEnv = {
  ...process.env,
  CI: "1",
  ALCHEMY_STAGE: "dev",
  APP_NAME: process.env.APP_NAME || "solstatus-e2e",
  E2E_RUN_ID: runId,
  SECRET_ALCHEMY_PASSPHRASE:
    process.env.SECRET_ALCHEMY_PASSPHRASE || randomBytes(16).toString("hex"),
}
// Local emulation must not see a deploy token or a real account id.
delete env.CLOUDFLARE_API_TOKEN
delete env.CLOUDFLARE_ACCOUNT_ID
delete env.CF_AI_GATEWAY_E2E_TOKEN
delete env.CF_AI_GATEWAY_E2E_ID
delete env.CF_AI_GATEWAY_E2E_SKIP_CACHE
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

const alchemyBin = realpathSync(resolve("node_modules/alchemy/bin/cli.js"))
const entry = resolve("packages/infra/src/alchemy.run.ts")
console.log(
  `Alchemy dev local emulation on ports ${ownedPorts.join(", ")} with state .e2e/runs/${runId}`,
)

const child = spawn(process.execPath, [alchemyBin, "dev", entry, "--stage", "dev"], {
  cwd: runDir,
  env,
  detached: true,
  stdio: ["ignore", "pipe", "pipe"],
})
publishOwnership(child.pid)

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

await new Promise<void>((resolvePromise) => {
  child.on("exit", () => resolvePromise())
  child.on("error", () => resolvePromise())
})
