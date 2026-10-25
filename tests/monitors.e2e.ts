import { test } from "@e2e-dev/web"
import { describe, expect } from "e2e"
import { sessionCookies, signInWithEmailOtp } from "./support/session"

describe("endpoint monitors", { requires: ["browser"] }, () => {
  test("create an endpoint monitor through the dashboard form", async ({
    app,
    screen,
    browser,
  }) => {
    const name = `e2e-monitor-${crypto.randomUUID().slice(0, 8)}`
    const url = `https://example.com/${name}`
    const email = `e2e-${crypto.randomUUID()}@example.test`
    const cookie = await signInWithEmailOtp(email)
    await browser.setCookies(sessionCookies(cookie, app.baseUrl ?? "http://127.0.0.1:3000"))

    await app.open("/")
    await expect(screen.getByRole("button", "Create Endpoint Monitor")).toBeVisible()
    await screen.getByRole("button", "Create Endpoint Monitor").tap()
    await expect(screen.getByRole("heading", "Add Endpoint Monitor")).toBeVisible()
    await screen.getByLabel("Endpoint Monitor Name").fill(name)
    await screen.getByLabel("URL").fill(url)
    await expect(screen.getByRole("combobox", "Check Interval")).toHaveText("60 seconds")
    await expect(screen.getByLabel("Expected Status Code")).toHaveValue("200")
    await screen.getByRole("button", "Add Endpoint Monitor").tap()
    await expect(screen.getByText(name)).toBeVisible()
    await browser.reload()
    await expect(screen.getByText(name)).toBeVisible()
  })
})
