import { spawnSync } from "node:child_process"

export interface ProcessMember {
  pid: number
  ppid: number
  pgid: number
  birth: string
}
// Process birth is stable across exec; command-line text is not identity.
export function processMembers(): ProcessMember[] {
  const result = spawnSync("ps", ["-axo", "pid=,ppid=,pgid=,lstart="], { encoding: "utf8" })
  if (result.status !== 0) throw new Error("Cannot verify suite process ownership")
  return result.stdout.split("\n").flatMap((line) => {
    const match = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.+?)\s*$/.exec(line)
    if (!match) return []
    return [
      { pid: Number(match[1]), ppid: Number(match[2]), pgid: Number(match[3]), birth: match[4]! },
    ]
  })
}
export function ownedMembers(recorded: readonly ProcessMember[], current = processMembers()) {
  return current.filter((member) =>
    recorded.some((previous) => previous.pid === member.pid && previous.birth === member.birth),
  )
}
export function processDescendants(roots: readonly number[], current = processMembers()) {
  const ids = new Set(roots)
  for (let changed = true; changed;) {
    changed = false
    for (const member of current) {
      if (ids.has(member.ppid) && !ids.has(member.pid)) {
        ids.add(member.pid)
        changed = true
      }
    }
  }
  return current.filter((member) => ids.has(member.pid))
}

export function stableGroups(recorded: readonly ProcessMember[], current = processMembers()) {
  const matching = ownedMembers(recorded, current)
  if (
    matching.some((member) =>
      recorded.some(
        (previous) =>
          previous.pid === member.pid &&
          previous.birth === member.birth &&
          previous.pgid !== member.pgid,
      ),
    )
  )
    throw new Error("Owned process changed group; retain cleanup record")
  return matching
}
