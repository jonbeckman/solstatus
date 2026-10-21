import { beforeEach, describe, expect, it } from "vitest"
import { z } from "zod"
import { endpointMonitorsPatchSchema } from "../packages/common/src/db/index"
import { dispatchApi } from "../packages/app/src/lib/dispatch-api"
import { queryRows, resetApiTestState } from "./cloudflare-workers-mock"

const unauthorizedBody = z.object({ message: z.literal("Unauthorized") })
const authOkBody = z.object({ ok: z.literal(true) })
const createdMonitorBody = z.object({ url: z.string() })
const conflictBody = z.object({
  matchingEndpointMonitor: z.object({ url: z.string() }),
})
const otpLog = z.object({ otp: z.string() })

const quotedUrl = "https://example.com/o'reilly"
const origin = "http://localhost"

beforeEach(() => {
  resetApiTestState()
})

function request(pathname: string, init?: RequestInit) {
  return new Request(`${origin}${pathname}`, init)
}

function cookieHeader(response: Response) {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .filter((cookie) => cookie.includes("="))
    .join("; ")
}

async function responseText(response: Response) {
  const text = await response.text()
  return { status: response.status, text }
}

async function signIn() {
  const email = "api-security@example.com"
  const logs: unknown[][] = []
  const originalLog = console.log
  console.log = (...args: unknown[]) => {
    logs.push(args)
    if (otpLog.safeParse(args[0]).success) {
      return
    }
    originalLog(...args)
  }

  try {
    const sendResponse = await dispatchApi(
      request("/api/auth/email-otp/send-verification-otp", {
        method: "POST",
        headers: { "content-type": "application/json", origin },
        body: JSON.stringify({ email, type: "sign-in" }),
      }),
    )
    const sent = await responseText(sendResponse)
    expect(sent.status, sent.text).toBe(200)

    const otp = logs.map((args) => otpLog.safeParse(args[0])).find((result) => result.success)
      ?.data.otp
    expect(otp).toEqual(expect.any(String))

    const signInResponse = await dispatchApi(
      request("/api/auth/sign-in/email-otp", {
        method: "POST",
        headers: { "content-type": "application/json", origin },
        body: JSON.stringify({ email, otp }),
      }),
    )
    const signedIn = await responseText(signInResponse)
    expect(signedIn.status, signedIn.text).toBe(200)
    const cookie = cookieHeader(signInResponse)
    expect(cookie).toContain("=")
    return cookie
  } finally {
    console.log = originalLog
  }
}

describe("API session gate", () => {
  it("returns 401 for anonymous monitor and infra requests", async () => {
    const monitors = await responseText(await dispatchApi(request("/api/endpoint-monitors")))
    const infra = await responseText(await dispatchApi(request("/api/infra-metadata")))
    const prefixed = await responseText(await dispatchApi(request("/api/authentication")))

    expect(monitors.status).toBe(401)
    expect(unauthorizedBody.parse(JSON.parse(monitors.text))).toEqual({ message: "Unauthorized" })
    expect(infra.status).toBe(401)
    expect(unauthorizedBody.parse(JSON.parse(infra.text))).toEqual({ message: "Unauthorized" })
    expect(prefixed.status).toBe(401)
    expect(unauthorizedBody.parse(JSON.parse(prefixed.text))).toEqual({ message: "Unauthorized" })
  })

  it("keeps Better Auth routes available without a session", async () => {
    const ok = await responseText(await dispatchApi(request("/api/auth/ok")))
    const session = await responseText(await dispatchApi(request("/api/auth/get-session")))

    expect(ok.status).toBe(200)
    expect(authOkBody.parse(JSON.parse(ok.text))).toEqual({ ok: true })
    expect(session.status).toBe(200)
    expect(session.text).toBe("null")
  })
})

describe("endpoint monitor URL lookup", () => {
  it("stores and matches a URL that contains a single quote", async () => {
    const cookie = await signIn()
    const infra = await responseText(
      await dispatchApi(request("/api/infra-metadata", { headers: { cookie } })),
    )
    expect(infra.status, infra.text).toBe(200)

    const payload = {
      name: "Quoted URL",
      url: quotedUrl,
      checkInterval: 60,
      alertThreshold: 2,
      isRunning: true,
      expectedStatusCode: 200,
    }

    const created = await responseText(
      await dispatchApi(
        request("/api/endpoint-monitors", {
          method: "POST",
          headers: { "content-type": "application/json", cookie, origin },
          body: JSON.stringify(payload),
        }),
      ),
    )
    expect(created.status, created.text).toBe(201)
    expect(createdMonitorBody.parse(JSON.parse(created.text)).url).toBe(quotedUrl)
    expect(queryRows("select url from endpointMonitors").map((row) => row.url)).toEqual([quotedUrl])

    const conflict = await responseText(
      await dispatchApi(
        request("/api/endpoint-monitors", {
          method: "POST",
          headers: { "content-type": "application/json", cookie, origin },
          body: JSON.stringify(payload),
        }),
      ),
    )
    expect(conflict.status, conflict.text).toBe(409)
    expect(conflictBody.parse(JSON.parse(conflict.text)).matchingEndpointMonitor.url).toBe(
      quotedUrl,
    )
  })
})

describe("endpointMonitorsPatchSchema", () => {
  it("validates url and drops id", () => {
    const parsed = endpointMonitorsPatchSchema.parse({
      id: "endp_should_not_stick",
      name: "Renamed",
      url: quotedUrl,
    })

    expect(parsed).toEqual({
      name: "Renamed",
      url: quotedUrl,
    })
    expect(endpointMonitorsPatchSchema.safeParse({ url: "not a url" }).success).toBe(false)
  })
})
