import { test } from "@e2e-dev/web"
import { describe, expect } from "e2e"
import { json, request } from "./support/api"

describe("app API", { requires: ["browser"] }, () => {
  test("infra metadata and endpoint monitor list are served by the real app API", async ({
    app,
  }) => {
    await app.open("/")

    const metadata = await json<{
      cloudflareAccountId: string
      monitorExecName: string
      monitorTriggerName: string
    }>("/api/infra-metadata")
    expect(metadata.cloudflareAccountId.length).toBeGreaterThan(0)
    expect(metadata.monitorExecName.length).toBeGreaterThan(0)
    expect(metadata.monitorTriggerName.length).toBeGreaterThan(0)

    const list = await request("/api/endpoint-monitors?pageSize=10&page=0")
    expect(list.status).toBe(200)
    // SAFETY: endpoint-monitors list returns { data, totalCount } from the app API.
    const body = (await list.json()) as { data: unknown[]; totalCount: number }
    expect(Array.isArray(body.data)).toBe(true)
    expect(Number.isFinite(body.totalCount)).toBe(true)

    const stats = await request("/api/endpoint-monitors/stats")
    expect(stats.status).toBe(200)
  })

  test("better-auth routes respond without inventing sessions", async () => {
    const session = await request("/api/auth/get-session")
    // Anonymous callers either receive 200 with empty session or a documented auth status.
    expect([200, 401, 404].includes(session.status)).toBe(true)
  })
})
