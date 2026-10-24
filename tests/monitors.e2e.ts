import { test } from "@e2e-dev/web"
import { describe, expect } from "e2e"
import { sessionCookies, signInWithEmailOtp } from "./support/session"

describe("endpoint monitors", { requires: ["browser"] }, () => {
  test("create an endpoint monitor through the dashboard form", async ({
    app,
    screen,
    agent,
    browser,
  }) => {
    const name = `e2e-monitor-${crypto.randomUUID().slice(0, 8)}`
    const url = `https://example.com/${name}`
    const email = `e2e-${crypto.randomUUID()}@example.test`
    const cookie = await signInWithEmailOtp(email)
    await browser.setCookies(sessionCookies(cookie, app.baseUrl ?? "http://127.0.0.1:3000"))

    await app.open("/")
    await expect(screen.getByRole("button", "Create Endpoint Monitor")).toBeVisible()
    await agent.act(
      "create an endpoint monitor named {name} that checks {url} every 60 seconds expecting status 200",
      { params: { name, url } },
    )
    await expect(screen.getByText(name)).toBeVisible()
    await browser.reload()
    await expect(screen.getByText(name)).toBeVisible()
  })
})
