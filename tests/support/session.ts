import { existsSync, readFileSync, statSync } from "node:fs"
import { expect } from "e2e"
import { apiUrl } from "./api"

const stackLogPath = ".e2e/logs/stack.log"

function stackLogFrom(offset: number) {
  if (!existsSync(stackLogPath)) return ""

  return readFileSync(stackLogPath, "utf8").slice(offset)
}

function otpForEmail(text: string, email: string) {
  let from = 0
  let otp: string | undefined

  while (from < text.length) {
    const at = text.indexOf(email, from)

    if (at < 0) break
    const window = text.slice(at, at + 240)
    const match = /otp["']?\s*[:=]\s*["']?(\d{6})/.exec(window)

    if (match?.[1]) otp = match[1]
    from = at + email.length
  }

  return otp ?? ""
}

function cookieHeader(response: Response) {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .filter((cookie) => cookie.includes("="))
    .join("; ")
}

export function sessionCookies(header: string, url: string) {
  return header.split("; ").flatMap((part) => {
    const index = part.indexOf("=")

    if (index <= 0) return []

    return [{ name: part.slice(0, index), value: part.slice(index + 1), url }]
  })
}

export async function signInWithEmailOtp(email: string) {
  const offset = existsSync(stackLogPath) ? statSync(stackLogPath).size : 0
  const origin = new URL(apiUrl("/")).origin
  const headers = { "content-type": "application/json", origin }

  const sent = await fetch(apiUrl("/api/auth/email-otp/send-verification-otp"), {
    method: "POST",
    headers,
    body: JSON.stringify({ email, type: "sign-in" }),
  })

  const sentText = await sent.text()
  expect(sent.status, sentText).toBe(200)

  let otp = ""
  await expect
    .poll(
      () => {
        otp = otpForEmail(stackLogFrom(offset), email)

        return otp
      },
      { timeout: 20_000 },
    )
    .toMatch(/^\d{6}$/)

  const signedIn = await fetch(apiUrl("/api/auth/sign-in/email-otp"), {
    method: "POST",
    headers,
    body: JSON.stringify({ email, otp }),
  })

  const signedInText = await signedIn.text()
  expect(signedIn.status, signedInText).toBe(200)
  const cookie = cookieHeader(signedIn)
  expect(cookie).toContain("=")

  return cookie
}
