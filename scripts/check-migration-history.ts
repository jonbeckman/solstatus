/* oxlint-disable no-console -- The check reports filenames and exits. It does not print SQL or secrets. */
import { execFileSync } from "node:child_process"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

const migrationsDir = "packages/common/src/db/migrations"
const sqlName = /^[0-9]{4}_[A-Za-z0-9][A-Za-z0-9_-]*\.sql$/

const baseRef = process.argv[2] ?? process.env.MIGRATIONS_BASE ?? "origin/master"

function git(args: string[], encoding: "utf8"): string
function git(args: string[]): Buffer
function git(args: string[], encoding?: "utf8"): string | Buffer {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    maxBuffer: 16 * 1024 * 1024,
    ...(encoding === undefined ? {} : { encoding }),
  })
}

function fail(message: string): never {
  console.error(`migrations:check: ${message}`)
  process.exit(1)
}

try {
  git(["rev-parse", "--verify", "--quiet", `${baseRef}^{commit}`], "utf8")
} catch {
  fail(`cannot resolve ${baseRef}. Fetch it, then run migrations:check again.`)
}

if (statExists(join(migrationsDir, "meta", "_journal.json"))) {
  fail(
    `${migrationsDir}/meta/_journal.json is drizzle-kit's pre-v1 journal. Alchemy rejects that layout. Keep flat SQL files.`,
  )
}

const worktree = listFlatSql(migrationsDir)
const basePaths = git(["ls-tree", "-r", "--name-only", baseRef, "--", migrationsDir], "utf8")
  .split("\n")
  .filter((path) => path.endsWith(".sql"))

const baseNames = new Map<string, string>()
for (const path of basePaths) {
  const name = path.slice(migrationsDir.length + 1)
  if (name.includes("/")) {
    fail(`${path} on ${baseRef} is not a flat SQL file.`)
  }
  baseNames.set(name, path)
}

const problems: string[] = []
for (const [name, path] of baseNames) {
  const current = worktree.get(name)
  if (current === undefined) {
    problems.push(`${name} was removed. Applied migrations stay append-only.`)
    continue
  }
  const previous = git(["show", `${baseRef}:${path}`])
  if (!current.equals(previous)) {
    problems.push(`${name} changed. Applied SQL bytes stay the same.`)
  }
}

const maxBasePrefix = [...baseNames.keys()].reduce((max, name) => {
  return Math.max(max, prefixOf(name))
}, -1)

for (const name of worktree.keys()) {
  if (baseNames.has(name)) continue
  if (!sqlName.test(name)) {
    problems.push(`${name} is not a flat NNNN_name.sql migration.`)
    continue
  }
  if (prefixOf(name) <= maxBasePrefix) {
    problems.push(`${name} does not append after ${String(maxBasePrefix).padStart(4, "0")}.`)
  }
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`migrations:check: ${problem}`)
  process.exit(1)
}

console.log(
  `migrations:check: ${worktree.size} flat SQL files. ${baseNames.size} applied files match ${baseRef}.`,
)

function statExists(path: string): boolean {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

function prefixOf(name: string): number {
  return Number(name.slice(0, 4))
}

function listFlatSql(dir: string): Map<string, Buffer> {
  const found = new Map<string, Buffer>()
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    fail(`missing ${dir}.`)
  }
  for (const entry of entries) {
    const path = join(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      if (hasSql(path)) {
        fail(`${path} contains SQL. Keep migrations as flat files in ${dir}.`)
      }
      continue
    }
    if (!entry.endsWith(".sql")) {
      fail(`${path} is not a migration SQL file.`)
    }
    if (!sqlName.test(entry)) {
      fail(`${entry} must match NNNN_name.sql.`)
    }
    if (found.has(entry)) fail(`${entry} is listed twice.`)
    found.set(entry, readFileSync(path))
  }
  return found
}

function hasSql(dir: string): boolean {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory() && hasSql(path)) return true
    if (entry.endsWith(".sql")) return true
  }
  return false
}
