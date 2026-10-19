import { execFileSync } from "node:child_process"
import { describe, expect, it } from "vitest"

describe("solstatus CLI", () => {
  it("prints Effect 4 CLI help without an Effect 3 @effect/cli peer", () => {
    const output = execFileSync(process.execPath, ["--import", "tsx", "src/index.ts", "--help"], {
      encoding: "utf8",
      env: process.env,
    })

    expect(output).toMatch(/solstatus/)
    expect(output).toMatch(/phase|stage/i)
    expect(output).toMatch(/effect\/cli/)
  })
})
