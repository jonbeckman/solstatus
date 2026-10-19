import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, expect, it } from "vitest"
import { unstable_dev, type Unstable_DevWorker } from "wrangler"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Alchemy 2.0.0-beta.81's `alchemy/Test/Vitest` imports `vitest` from Alchemy's
// isolated nub store path, which cannot resolve the workspace vitest package.
// wrangler `unstable_dev` still boots workerd locally without a production deploy.

let worker: Unstable_DevWorker | undefined

afterAll(async () => {
  await worker?.stop()
})

it("monitor-exec answers locally on workerd without a production deploy", async () => {
  worker = await unstable_dev(resolve(__dirname, "../packages/api/src/monitor-exec.ts"), {
    config: resolve(__dirname, "wrangler-monitor-exec.workerd.jsonc"),
    ip: "127.0.0.1",
    experimental: { disableExperimentalWarning: true },
  })
  const response = await worker.fetch("/")
  const text = await response.text()
  expect(response.status).toBe(200)
  expect(text).toContain("MonitorExec")
}, 120_000)
