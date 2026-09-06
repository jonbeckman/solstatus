import { afterEach, describe, expect, it, vi } from "vitest"
import { createEndpointMonitorDownAlert } from "../packages/api/src/utils/opsgenie"

describe("createEndpointMonitorDownAlert", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("points monitorRepo at jonbeckman/solstatus", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ result: "Request accepted", took: 1, requestId: "req-1" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    )
    vi.stubGlobal("fetch", fetchMock)

    await createEndpointMonitorDownAlert(
      "test-key",
      {
        id: "endp_test",
        url: "https://example.com/health",
        name: "Example",
        checkInterval: 60,
        isRunning: true,
        expectedStatusCode: 200,
        consecutiveFailures: 2,
        alertThreshold: 2,
        activeAlert: false,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      },
      {
        cloudflareAccountId: "acct",
        monitorExecName: "exec",
        monitorTriggerName: "trigger",
      },
      503,
    )

    expect(fetchMock).toHaveBeenCalledOnce()
    const [, init] = fetchMock.mock.calls[0] ?? []
    const body = JSON.parse(String(init?.body)) as { details: { monitorRepo: string } }
    expect(body.details.monitorRepo).toBe("https://github.com/jonbeckman/solstatus")
  })
})
