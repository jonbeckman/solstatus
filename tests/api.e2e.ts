import { test } from "@e2e-dev/web"
import { describe, expect } from "e2e"
import { json, request } from "./support/api"
import { signInWithEmailOtp } from "./support/session"

const quotedUrl = `https://example.com/${crypto.randomUUID()}/o'reilly`

describe("app API", { requires: ["browser"] }, () => {
  test("anonymous monitor and infra requests are rejected", async () => {
    const monitors = await request("/api/endpoint-monitors")
    const infra = await request("/api/infra-metadata")
    const prefixed = await request("/api/authentication")
    const stats = await request("/api/endpoint-monitors/stats")

    expect(monitors.status).toBe(401)
    expect(await monitors.json()).toEqual({ message: "Unauthorized" })
    expect(infra.status).toBe(401)
    expect(await infra.json()).toEqual({ message: "Unauthorized" })
    expect(prefixed.status).toBe(401)
    expect(await prefixed.json()).toEqual({ message: "Unauthorized" })
    expect(stats.status).toBe(401)
    expect(await stats.json()).toEqual({ message: "Unauthorized" })
  })

  test("better-auth routes respond without a session", async () => {
    const ok = await request("/api/auth/ok")
    const session = await request("/api/auth/get-session")

    expect(ok.status).toBe(200)
    expect(await ok.json()).toEqual({ ok: true })
    expect(session.status).toBe(200)
    expect(await session.text()).toBe("null")
  })

  test("a signed-in caller can read infra metadata and reject a duplicate quoted URL", async () => {
    const email = `e2e-${crypto.randomUUID()}@example.test`
    const cookie = await signInWithEmailOtp(email)
    const headers = { cookie, origin: new URL("http://127.0.0.1:3000").origin }

    const metadata = await json<{
      cloudflareAccountId: string
      monitorExecName: string
      monitorTriggerName: string
    }>("/api/infra-metadata", { headers })

    expect(metadata.cloudflareAccountId.length).toBeGreaterThan(0)
    expect(metadata.monitorExecName.length).toBeGreaterThan(0)
    expect(metadata.monitorTriggerName.length).toBeGreaterThan(0)

    const payload = {
      name: "Quoted URL",
      url: quotedUrl,
      checkInterval: 60,
      alertThreshold: 2,
      isRunning: true,
      expectedStatusCode: 200,
    }

    const created = await request("/api/endpoint-monitors", {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify(payload),
    })

    const createdText = await created.text()
    expect(created.status, createdText).toBe(201)
    expect(JSON.parse(createdText)).toMatchObject({ url: quotedUrl })

    const conflict = await request("/api/endpoint-monitors", {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify(payload),
    })

    const conflictText = await conflict.text()
    expect(conflict.status, conflictText).toBe(409)
    expect(JSON.parse(conflictText)).toMatchObject({
      matchingEndpointMonitor: { url: quotedUrl },
    })
  })
})
