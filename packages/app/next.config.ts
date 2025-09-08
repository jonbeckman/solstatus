import { execSync } from "node:child_process"
import type { NextConfig } from "next"

// x-release-please-start-version
const APP_VERSION = "2.1.1"
// x-release-please-end-version

let gitCommitSHA = "dev"
console.log(`APP_ENV: ${process.env.APP_ENV}`)
if (process.env.APP_ENV !== "dev") {
  try {
    gitCommitSHA = execSync("git rev-parse --short HEAD")
      .toString()
      .trim()
      .substring(0, 7)
  } catch (error) {
    console.error("Error getting git commit SHA:", error)
  }
}
const fqAppVersion = `v${APP_VERSION}-${gitCommitSHA}`
console.log(`NEXT_PUBLIC_APP_VERSION: ${fqAppVersion}`)

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: fqAppVersion,
    NEXT_PUBLIC_APP_ENV: process.env.APP_ENV,
  },
  outputFileTracingIncludes: {
    "/*": ["./registry/**/*"],
  },
  experimental: {
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
    serverSourceMaps: true,
    typedRoutes: true,
    reactCompiler: true,
  },
}

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
})

export default withBundleAnalyzer(nextConfig)

// added by create cloudflare to enable calling `getCloudflareContext()` in `next dev`
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare"

// FYI, .dev.vars are loaded from the infra package because of this
initOpenNextCloudflareForDev({
  configPath: "../infra/wrangler.jsonc",
  persist: {
    path: "../infra/.wrangler/state/v3",
  },
})
