# End-to-end validation

SolStatus uses [tester-army/e2e](https://github.com/tester-army/e2e) `0.17.0` with
`@e2e-dev/web@0.12.0` and `@e2e-dev/github@0.3.3` as its only automated test runner.
`nub run test` executes `tests/**/*.e2e.ts` against the real Alchemy development stack
(TanStack Start app on port 3000, monitor workers, local D1, better-auth). Vitest unit
suites have been removed. Do not restore mocks, request interception, or a second runner.

Permanent SolStatus DNA exceptions that remain intentional:

- better-auth (not Clerk)
- Cloudflare D1 (not PlanetScale)
- no turbo (direct Nub scripts)
- CLI may use `effect/unstable/cli` as the repository already does
- deploy-on-release for pre/prod on published non-prerelease GitHub Release SHA
- Tegami go/no-go unchanged

## Coverage map

Feature recipes live under
[`.cursor/skills/verify-solstatus/features/`](../.cursor/skills/verify-solstatus/features/README.md).
Each file links to the canonical `tests/*.e2e.ts` suite for that product area.

## Run locally

```sh
nub install --frozen-lockfile
nub run test:e2e:install
nub run test:e2e:list
nub run test
nub run test:e2e -- tests/dashboard.e2e.ts
nub run test:e2e:live
nub run test:e2e:cache-strict
nub run test:e2e:cleanup
```

Copy `packages/infra/.dev.vars.example` to `packages/infra/.dev.vars` and supply
`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, and `BETTER_AUTH_SECRET`. Provide
`CF_AI_GATEWAY_E2E_TOKEN` (and optional `CF_AI_GATEWAY_E2E_ID`, default `default`) for
Clef semantic steps. Existing shell or CI values override dotenv files. Ports 3000,
8787, and 8788 must be free. The config starts `scripts/e2e/stack.ts`, which launches
`packages/infra` Alchemy `infra:dev` for the isolated `test` stage.

Declare credentials and secrets in `e2e.config.ts`. Never hard-code them in test files.
Use registered secret handles for any browser credential input.

Replay here means tester-army/e2e recorded browser actions. It is separate from Cloudflare
AI Gateway response caching. `test:e2e:live` bypasses action replay. `test:e2e:cache-strict`
rejects stale recordings. Inspect `.e2e/report.json` for model-call and cache evidence.

Cloudflare Clef (`@cf/cloudflare/clef`) is a System One decision API. `scripts/e2e/cf-clef-executor.ts`
sends redacted accessible trees and images through Workers AI with the `cf-aig-gateway-id`
header. It supports `agent.act` and visual `assert`; exact text, URL, status, and data checks
use deterministic `expect`. After each `agent.act`, assert exactly. No Jev fallback exists.
Gateway tokens never belong in source, commands, logs, artifacts, or browser processes.

## CI

`Validate` keeps a `validate` job for typecheck/lint/format and `nub run test:e2e:list`.
A separate `e2e` job (fork-PR guarded) restores replay cache, initializes AI accounting,
runs `nub run test`, cleans up on `always()`, summarizes usage, saves cache on success, and
uploads reports. Manual inputs: `e2e_lifecycle`, optional `e2e_live`.

Required CI secrets/env: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`,
`CF_AI_GATEWAY_E2E_TOKEN`, `BETTER_AUTH_SECRET` (or generate per job). Baseline flags:
`E2E_TELEMETRY_DISABLED=1`, `E2E_AI_USAGE=1`, `CF_AI_GATEWAY_E2E_ID=default`.
`GITHUB_TOKEN` is scoped to test steps only.

## Author and diagnose

Read `.agents/skills/e2e/SKILL.md` and the verify-solstatus skill. Put new tests under
`tests/**/*.e2e.ts`. Helpers belong in `tests/support/`. Lifecycle regressions, when added,
live under `tests/lifecycle/` with their own config. Runner/cleanup/accounting scripts under
`scripts/e2e/` include copied `cf-clef-executor`, `ai-report`, and `ai-usage` (kept in-repo;
do not invent a shared package).

On failure, read `.e2e/summary.md`, then `.e2e/report.json`, failure artifacts, and the
redacted `.e2e/logs/stack.log`. Distinguish collection/config, startup, locator, assertion,
and provider failures. Do not invent a pass for a missing secret.
