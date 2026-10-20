import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const root = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: [
      { find: /^zod$/, replacement: resolve(root, "packages/common/node_modules/zod/index.js") },
      { find: /^@\//, replacement: `${resolve(root, "packages/app/src")}/` },
      {
        find: "cloudflare:workers",
        replacement: resolve(root, "tests/cloudflare-workers-mock.ts"),
      },
    ],
  },
})
