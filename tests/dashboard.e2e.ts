import { test } from "@e2e-dev/web"
import { describe, expect } from "e2e"

describe("dashboard", { requires: ["browser"] }, () => {
  test("dashboard shows endpoint monitors heading and create action", async ({
    app,
    screen,
    agent,
  }) => {
    await app.open("/")
    await expect(screen.getByText("Endpoint Monitors")).toBeVisible()
    await expect(screen.getByRole("button", "Create Endpoint Monitor")).toBeVisible()
    await agent.act("open the create endpoint monitor dialog")
    await expect(screen.getByText("Endpoint Monitor Name")).toBeVisible()
    await expect(screen.getByLabel("URL")).toBeVisible()
  })

  test("sidebar exposes Monitors navigation", async ({ app, screen }) => {
    await app.open("/")
    await expect(screen.getByText("Monitors")).toBeVisible()
    await expect(screen.getByText("Endpoint")).toBeVisible()
  })
})
