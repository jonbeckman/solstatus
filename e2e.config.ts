import { existsSync } from "node:fs"
import { web } from "@e2e-dev/web"
import { github } from "@e2e-dev/github"
import type { E2EConfig } from "e2e"
import { createClefExecutor } from "./scripts/e2e/cf-clef-executor"

// Node's dotenv loader preserves environment overrides supplied by CI.
if (existsSync("packages/infra/.dev.vars")) process.loadEnvFile("packages/infra/.dev.vars")
if (existsSync(".env")) process.loadEnvFile(".env")

const runnerMetadata = new Set([
  "NODE_CHANNEL_FD",
  "NODE_CHANNEL_SERIALIZATION_MODE",
  "NODE_UNIQUE_ID",
  "WATCH_REPORT_DEPENDENCIES",
])

const inherited = Object.fromEntries(
  Object.entries(process.env).flatMap(([name, value]) =>
    value !== undefined &&
    !runnerMetadata.has(name) &&
    /^(PATH|HOME|USER|TMPDIR|CLOUDFLARE_|BETTER_AUTH_SECRET$|SECRET_ALCHEMY_PASSPHRASE$|APP_NAME$|STAGE$|FQDN$|WRANGLER_|NODE_|CI$|ALCHEMY_)/.test(
      name,
    )
      ? [[name, value]]
      : [],
  ),
)

export default {
  projectId: "solstatus",
  tests: ["tests/**/*.e2e.ts", "!tests/lifecycle/**"],
  targets: [
    {
      name: "chromium",
      engine: web({
        browser: "chromium",
        permissions: ["clipboard-read", "clipboard-write"],
        viewport: { width: 1440, height: 900 },
      }),
      app: {
        url: "http://127.0.0.1:3000",
        readyUrl: "http://127.0.0.1:3000",
        command: {
          executable: "node",
          args: ["--import", "tsx", "scripts/e2e/stack.ts"],
          env: inherited,
          startupTimeout: 300_000,
          shutdownTimeout: 60_000,
          log: ".e2e/logs/stack.log",
        },
      },
    },
    { name: "cli", platform: "cli", trace: "off" },
  ],
  workers: 1,
  retries: 0,
  timeout: 120_000,
  assertionTimeout: 15_000,
  cache: { mode: "read-write", dir: process.env.E2E_ACTION_CACHE_DIR ?? ".e2e/cache" },
  // Raw browser traces can capture session cookies and generated secrets.
  trace: "off",
  reporters: ["list", "junit", "markdown", github({ key: "solstatus-core" })],
  credentials: {
    disposable: {
      username: "solstatus-e2e@example.test",
      password: "E2e-disposable-only-4f94dc7!",
    },
  },
  secrets: {
    "cloudflare-ai-gateway": () => process.env.CF_AI_GATEWAY_E2E_TOKEN ?? "",
    "cloudflare-api-token": () => process.env.CLOUDFLARE_API_TOKEN ?? "",
    "better-auth-secret": () => process.env.BETTER_AUTH_SECRET ?? "",
  },
  agents: {
    default: {
      executor: createClefExecutor(),
      maxSteps: 20,
      maxModelCalls: 20,
      context:
        "SolStatus is a self-hosted Cloudflare uptime monitor (better-auth + D1). Never deploy production, pay, or send external alerts. Use accessible UI names. Drive one screen goal per act; leave exact checks to expect.",
    },
  },
} satisfies E2EConfig
