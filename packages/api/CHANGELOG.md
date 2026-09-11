## @solstatus/api@3.0.0

### Align the published toolchain with Shared Project DNA

Package consumers now get Nub 0.4.11, TypeScript 7.0.2, Effect 4.0.0-beta.107,
Drizzle ORM 1.0.0-rc.5, Zod 4.4.3, and Alchemy 2.0.0-beta.72. The dashboard is
TanStack Start on Cloudflare instead of Next.js + OpenNext. The CLI stays on
Effect 4 `effect/unstable/cli` because `@effect/cli` still peers Effect 3.

Install with `nub install`. The previous `pnpm` workspace, Biome lint/format
path, and Next.js app entrypoints are gone.

### Remove unfinished synthetic monitor types

`InitPayload` is endpoint-only. It no longer accepts `monitorType: "synthetic"`,
`timeoutSeconds`, or `runtime`. `PRE_ID.syntheticMonitor` is removed. Endpoint
monitor init, alarm, pause, and resume are unchanged. App callers may keep
passing `monitorType: "endpoint"`.

### Keep monitor alarms running after a failed first check

Durable Object alarm retries now reschedule the next check instead of
returning without an alarm. Unused monitor-exec response bodies are
cancelled. Opsgenie down-alert details point at jonbeckman/solstatus.
Alchemy binds OPSGENIE_API_KEY as a Worker secret.

### Reconcile Alchemy production deploy with leftover Wrangler

Production deploy is the Alchemy CLI (`nub run cli -- --stage prod`). Wrangler
configs in `@solstatus/infra` are local D1 and local monitor-worker dev only;
OpenNext worker keys and the unused `wrangler:gen` script are gone. `db:seed`
reads the same `packages/infra/.wrangler` persist directory that
`nub run dev:api` uses.

# Changelog

## [2.1.0](https://github.com/unibeck/solstatus/compare/@solstatus/api@v2.0.0...@solstatus/api@v2.1.0) (2025-07-09)


### Features

* release v2 ([8d09d77](https://github.com/unibeck/solstatus/commit/8d09d77f92ceec9bd7cba2e9fb4a514a406b588d))
