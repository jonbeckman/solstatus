import { defineConfig } from "oxlint"
import { agentToolIgnorePatterns, recommended } from "oxlint-plugin-solzero/config"

export default defineConfig({
  extends: [recommended],
  // A disable comment that suppresses nothing fails lint, so stale suppressions cannot pile up.
  options: { reportUnusedDisableDirectives: "error" },
  plugins: ["unicorn", "typescript", "oxc", "react"],
  jsPlugins: [{ name: "effect", specifier: "@mpsuesser/oxlint-plugin-effect" }],
  ignorePatterns: [
    ...agentToolIgnorePatterns,
    "**/dist/**",
    "**/node_modules/**",
    "**/.wrangler/**",
    "**/.alchemy/**",
    "**/.output/**",
    "**/*.gen.ts",
    "**/tsconfig.json",
    "nub.lock",
    "packages/app/src/registry/**",
    "packages/common/src/db/migrations/**",
    "packages/app/cloudflare-env.d.ts",
  ],
  rules: {
    // tester-army/e2e is the only runner. Reject *.test.* and *.spec.* outside a test directory.
    "solzero/no-colocated-tests": "error",
  },
  overrides: [
    {
      // TanStack Table v8 returns a new table object from useReactTable on each render, so the
      // React Compiler skips this component. The rule reports that skip, not a defect here.
      files: ["packages/app/src/components/data-table/data-table.tsx"],
      rules: { "react/incompatible-library": "off" },
    },
    {
      // Config files, scripts, the CLI entry, tests, and the Alchemy stack run in Node before an
      // Effect runtime exists. They read process.env and Node modules directly.
      files: [
        "**/*.config.ts",
        "**/scripts/**",
        "src/index.ts",
        "tests/**",
        "packages/infra/src/alchemy.run.ts",
        "packages/infra/src/stack-options.ts",
        "packages/app/infra/index.ts",
      ],
      rules: {
        "effect/avoid-process-env": "off",
        "effect/avoid-node-imports": "off",
      },
    },
  ],
})
