import { test, expect } from "e2e"
import * as Schema from "effect/Schema"
import { UpdateEndpointMonitor } from "../packages/app/src/server/api/schemas"
import { PRE_ID, createId } from "../packages/common/src/utils/ids"

const quotedUrl = "https://example.com/o'reilly"

test(
  "createId prefixes endpoint monitor ids and keeps them distinct",
  { platforms: ["cli"] },
  async () => {
    const id = createId(PRE_ID.endpointMonitor)
    expect(id.startsWith("endp_")).toBe(true)
    expect(id.length).toBeGreaterThan(10)
    expect(createId(PRE_ID.endpointMonitor)).not.toBe(createId(PRE_ID.endpointMonitor))
  },
)

test("UpdateEndpointMonitor validates url and drops id", { platforms: ["cli"] }, async () => {
  const decode = Schema.decodeUnknownSync(UpdateEndpointMonitor)

  const parsed = decode({
    id: "endp_should_not_stick",
    name: "Renamed",
    url: quotedUrl,
  })

  expect(parsed).toEqual({
    name: "Renamed",
    url: quotedUrl,
  })
  expect(Schema.is(UpdateEndpointMonitor)({ url: "not a url" })).toBe(false)
})
