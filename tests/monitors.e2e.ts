import { test } from "@e2e-dev/web"
import { describe, expect } from "e2e"

describe("endpoint monitors", { requires: ["browser"] }, () => {
  test("create an endpoint monitor through the dashboard form", async ({
    app,
    screen,
    agent,
    browser,
  }) => {
    const name = `e2e-monitor-${crypto.randomUUID().slice(0, 8)}`
    const url = `https://example.com/${name}`

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
