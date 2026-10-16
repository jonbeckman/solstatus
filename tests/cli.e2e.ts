import { spawnSync } from "node:child_process"
import { test, expect } from "e2e"

test("solstatus CLI prints Effect unstable help", { platforms: ["cli"] }, async () => {
  const result = spawnSync(process.execPath, ["--import", "tsx", "src/index.ts", "--help"], {
    encoding: "utf8",
    env: process.env,
    timeout: 30_000,
  })
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`
  expect(result.status).toBe(0)
  expect(output).toMatch(/solstatus/)
  expect(output).toMatch(/phase|stage/i)
  expect(output).toMatch(/effect\/unstable\/cli/)
})
