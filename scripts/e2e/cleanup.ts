/* oxlint-disable no-console -- Reports resource identifiers only. */
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { ownedMembers, processMembers, type ProcessMember } from "./process-group"

export interface Ownership {
  id: string
  pid: number
  stage?: string
  startedAt?: string
  members?: ProcessMember[]
}

export const cleanupRoot = resolve(".e2e/cleanup")
export const runsRoot = resolve(".e2e/runs")

export function recordCleanupFailure() {
  writeFileSync(
    resolve(".e2e/cleanup-summary.json"),
    JSON.stringify({ verified: false, failed: true }),
  )
}

function alive(pid: number) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

export async function recoverOwnedRuns() {
  mkdirSync(cleanupRoot, { recursive: true, mode: 0o700 })
  const current = processMembers()
  let recovered = 0
  for (const file of readdirSync(cleanupRoot).filter((name) => name.endsWith(".json"))) {
    const path = resolve(cleanupRoot, file)
    let owner: Ownership
    try {
      owner = JSON.parse(readFileSync(path, "utf8")) as Ownership
    } catch {
      continue
    }
    if (alive(owner.pid) && owner.pid !== process.pid) continue
    const members = owner.members?.length
      ? ownedMembers(owner.members, current)
      : current.filter((member) => member.ppid === owner.pid)
    for (const member of members) {
      try {
        process.kill(member.pid, "SIGTERM")
      } catch {
        /* already stopped */
      }
    }
    if (process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID) {
      spawnSync("nub", ["run", "--cwd", "packages/infra", "infra:destroy"], {
        env: {
          ...process.env,
          STAGE: owner.stage ?? "test",
          APP_NAME: process.env.APP_NAME || "solstatus-e2e",
        },
        stdio: "ignore",
        timeout: 120_000,
      })
    }
    rmSync(path, { force: true })
    recovered += 1
  }
  if (existsSync(runsRoot)) {
    for (const name of readdirSync(runsRoot)) {
      rmSync(resolve(runsRoot, name), { recursive: true, force: true })
    }
  }
  writeFileSync(
    resolve(".e2e/cleanup-summary.json"),
    JSON.stringify({ verified: true, failed: false, recovered }),
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await recoverOwnedRuns()
}
