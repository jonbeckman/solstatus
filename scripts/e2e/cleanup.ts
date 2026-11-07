/* oxlint-disable no-console -- Reports resource identifiers only. */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { resolve, sep } from "node:path"
import { pathToFileURL } from "node:url"
import { ownedMembers, processMembers, type ProcessMember } from "./process-group"

export interface Ownership {
  id: string
  pid: number
  childPid?: number
  stateDir?: string
  ports?: number[]
  stage?: string
  startedAt?: string
  members?: ProcessMember[]
}

export const cleanupRoot = resolve(".e2e/cleanup")
export const runsRoot = resolve(".e2e/runs")

const runIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function ownedRunDirectory(id: string) {
  if (!runIdPattern.test(id)) {
    throw new Error("Refusing cleanup outside the recorded suite namespace")
  }

  const directory = resolve(runsRoot, id)
  const rootPrefix = runsRoot.endsWith(sep) ? runsRoot : `${runsRoot}${sep}`

  if (!directory.startsWith(rootPrefix)) {
    throw new Error("Refusing cleanup outside the recorded suite namespace")
  }

  return directory
}

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

function sleep(ms: number) {
  return new Promise((done) => setTimeout(done, ms))
}

function signalProcess(pid: number, signal: NodeJS.Signals) {
  if (pid <= 0 || pid === process.pid) return

  try {
    process.kill(-pid, signal)
  } catch {
    try {
      process.kill(pid, signal)
    } catch {
      /* already stopped */
    }
  }
}

export async function recoverOwnedRuns() {
  mkdirSync(cleanupRoot, { recursive: true, mode: 0o700 })
  mkdirSync(".e2e", { recursive: true })
  const current = processMembers()
  let recovered = 0
  let localStorageDirectoriesRemoved = 0

  const files = existsSync(cleanupRoot)
    ? readdirSync(cleanupRoot).filter((name) => name.endsWith(".json"))
    : []

  for (const file of files) {
    const path = resolve(cleanupRoot, file)
    let owner: Ownership

    try {
      // SAFETY: Ownership files are written by this suite as JSON objects with an id.
      owner = JSON.parse(readFileSync(path, "utf8")) as Ownership
    } catch {
      continue
    }

    const id = file.replace(/\.json$/, "")

    if (owner.id !== id) throw new Error("Invalid cleanup ownership record")
    const directory = ownedRunDirectory(owner.id)

    if (owner.stateDir && resolve(owner.stateDir) !== directory) {
      throw new Error("Refusing cleanup outside the recorded suite namespace")
    }

    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (!alive(owner.pid) || owner.pid === process.pid) break
      await sleep(100)
    }

    if (alive(owner.pid) && owner.pid !== process.pid) {
      throw new Error(`Suite ${owner.id} is active; retain cleanup record`)
    }

    const members = owner.members?.length
      ? ownedMembers(owner.members, current)
      : current.filter((member) => member.ppid === owner.pid)

    for (const member of members) signalProcess(member.pid, "SIGTERM")

    if (owner.childPid) signalProcess(owner.childPid, "SIGTERM")

    for (let attempt = 0; attempt < 50; attempt += 1) {
      const childAlive = owner.childPid ? alive(owner.childPid) || alive(-owner.childPid) : false
      const membersAlive = members.some((member) => alive(member.pid))

      if (!childAlive && !membersAlive) break

      if (attempt === 30) {
        for (const member of members) signalProcess(member.pid, "SIGKILL")

        if (owner.childPid) signalProcess(owner.childPid, "SIGKILL")
      }

      await sleep(100)
    }

    if (owner.childPid && (alive(owner.childPid) || alive(-owner.childPid))) {
      throw new Error(`Owned processes remain for ${owner.id}; retain cleanup record`)
    }

    const storageExisted = existsSync(directory)
    rmSync(directory, { recursive: true, force: true })

    if (existsSync(directory)) throw new Error(`Owned storage remains for ${owner.id}`)
    rmSync(path, { force: true })

    if (storageExisted) localStorageDirectoriesRemoved += 1
    recovered += 1
    console.log(`Cleaned suite ${owner.id}: private local state absent`)
  }

  writeFileSync(
    resolve(".e2e/cleanup-summary.json"),
    JSON.stringify({
      verified: true,
      failed: false,
      recovered,
      containersRemoved: 0,
      localStorageDirectoriesRemoved,
    }),
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    await recoverOwnedRuns()
  } catch (error) {
    recordCleanupFailure()
    console.error(
      "Suite ownership unresolved; cleanup record retained.",
      error instanceof Error ? error.message : error,
    )
    process.exitCode = 1
  }
}
