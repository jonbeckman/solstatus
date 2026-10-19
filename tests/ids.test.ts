import { describe, expect, it } from "vitest"
import { PRE_ID, createId } from "../packages/common/src/utils/ids"

describe("createId", () => {
  it("prefixes an endpoint monitor id", () => {
    const id = createId(PRE_ID.endpointMonitor)
    expect(id.startsWith("endp_")).toBe(true)
    expect(id.length).toBeGreaterThan(10)
  })

  it("creates distinct ids", () => {
    expect(createId(PRE_ID.endpointMonitor)).not.toBe(createId(PRE_ID.endpointMonitor))
  })
})
