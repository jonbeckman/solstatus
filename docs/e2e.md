# End-to-end validation

SolStatus uses [tester-army/e2e](https://github.com/tester-army/e2e) `0.21.3` with
`@e2e-dev/web@0.15.3`, `@e2e-dev/github@0.4.3`, and `@e2e-dev/decision@0.3.0` as its only
automated test runner.
`nub run test` executes `tests/**/*.e2e.ts` against the real Alchemy development stack
(TanStack Start app on port 3000, monitor workers, local D1, better-auth). Vitest unit
suites have been removed. Do not restore mocks, request interception, or a second runner.

Permanent SolStatus DNA exceptions that remain intentional:

- better-auth (not Clerk)
- Cloudflare D1 (not PlanetScale)
- no turbo (direct Nub scripts)
- CLI uses Effect 4 `effect/cli` (not the Effect 3 `@effect/cli` peer)
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
nub exec e2e list --changed-since origin/master
nub exec e2e run --changed-since origin/master
nub run test
nub run test:e2e -- tests/dashboard.e2e.ts
nub run test:e2e:live
nub run test:e2e:cache-strict
nub run test:e2e:cleanup
```

`scripts/e2e/stack.ts` starts `alchemy dev packages/infra/src/alchemy.run.ts --stage dev`
(Alchemy `2.0.0-beta.83`) with its working directory at `.e2e/runs/<uuid>`. Local D1,
KV, and Alchemy state stay in that directory's `.alchemy` tree. Cleanup deletes that
directory only. It does not call `alchemy deploy` or `alchemy destroy`.

`BETTER_AUTH_SECRET` comes from the environment or `packages/infra/.dev.vars`. When
both are empty, the launcher generates one for that process. Local emulation does
not read `CLOUDFLARE_API_TOKEN` or `CLOUDFLARE_ACCOUNT_ID`. Provide
`CF_AI_GATEWAY_E2E_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (optional `CF_AI_GATEWAY_E2E_ID`,
default `default`) for Clef. The account id is the Workers AI route
`accounts/{account}/ai/run`. Existing shell or CI values override dotenv files.
Ports 3000, 8787, and 8788 must be free.

Declare credentials and secrets in `e2e.config.ts`. Never hard-code them in test files.
Use registered secret handles for any browser credential input.

Replay here means tester-army/e2e recorded browser actions, stored under `.e2e/cache`.
It is separate from Cloudflare AI Gateway response caching. The decision model and the
Clef executor send `cf-aig-cache-ttl`, `cf-aig-cache-key`, and `cf-aig-skip-cache`.
Pull requests set `CF_AI_GATEWAY_E2E_SKIP_CACHE=0`, so an identical Clef request can
log `Clef decision gateway cache: hit`. `test:e2e:live` bypasses action replay. A
workflow dispatch with `e2e_live` also sets `CF_AI_GATEWAY_E2E_SKIP_CACHE=1`.
`test:e2e:cache-strict` rejects stale recordings. Inspect `.e2e/report.json` and
`.e2e/ai-usage/summary.md` for model-call and cache evidence.

Cloudflare Clef (`@cf/cloudflare/clef`) is a System One decision API. `scripts/e2e/cf-clef-executor.ts`
sends redacted accessible trees and images through Workers AI with the `cf-aig-gateway-id`
header. It supports `agent.act` and visual `assert`; exact text, URL, status, and data checks
use deterministic `expect`. After each `agent.act`, assert exactly. No Jev fallback exists.
Gateway tokens never belong in source, commands, logs, artifacts, or browser processes.

`e2e.config.ts` sets `filters` to `decisionFilter({ model: createClefDecisionModel() })`.
That model is `scripts/e2e/cf-clef-decision-model.ts`. It asks Clef boolean questions through
the same Cloudflare AI Gateway. Pass `--changed-since origin/master` to `nub exec e2e list`
or `nub exec e2e run` on a pull request so the filter selects affected tests. Do not write
`nub run test -- --changed-since`. e2e treats a flag after `--` as a test file. Fetch the
base ref first. Without the flag, every test runs. A change to `e2e.config.ts` leaves nothing
out. The pull-request job in `Validate` passes the flag. Push, merge-queue, and scheduled
runs do not.

## CI

`Validate` keeps a `validate` job for typecheck/lint/format and `nub run test:e2e:list`.
A separate required `e2e` job (fork-PR guarded) checks out full history, restores the
action replay cache from `.e2e/cache`, initializes AI accounting, and on a ready pull request
runs `nub exec e2e run --changed-since origin/<base>`. Draft pull requests skip the
`validate` and `e2e` jobs, so those checks stay skipped. Marking the pull request ready
runs those jobs under the same check names, and later pushes run them again while it
stays ready.
A live run uses
`nub exec e2e run --no-cache --changed-since origin/<base>`. Other events run every test.
The job removes the UUID local state directory on `always()`, summarizes usage, saves
the replay cache on success, and uploads reports. Manual inputs: `e2e_lifecycle`,
optional `e2e_live`.

The e2e job does not read `CLOUDFLARE_API_TOKEN`. It reads `CF_AI_GATEWAY_E2E_TOKEN`
and `CLOUDFLARE_ACCOUNT_ID` for Clef. `BETTER_AUTH_SECRET` may be generated per job.
Baseline flags: `E2E_TELEMETRY_DISABLED=1`, `E2E_AI_USAGE=1`, `CF_AI_GATEWAY_E2E_ID=default`,
and `CF_AI_GATEWAY_E2E_SKIP_CACHE=0` unless `e2e_live` is set. `GITHUB_TOKEN` is scoped
to test steps only. `nub run test:e2e:cache-strict` is the local command that fails a
stale action replay.

## Author and diagnose

Read `.agents/skills/e2e/SKILL.md` and the verify-solstatus skill. Put new tests under
`tests/**/*.e2e.ts`. Helpers belong in `tests/support/`. Lifecycle regressions, when added,
live under `tests/lifecycle/` with their own config. Runner/cleanup/accounting scripts under
`scripts/e2e/` include copied `cf-clef-executor`, `ai-report`, and `ai-usage` (kept in-repo;
do not invent a shared package).

On failure, read `.e2e/summary.md`, then `.e2e/report.json`, failure artifacts, and the
redacted `.e2e/logs/stack.log`. Distinguish collection/config, startup, locator, assertion,
and provider failures. Do not invent a pass for a missing secret.
