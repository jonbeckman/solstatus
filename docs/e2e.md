# End-to-end validation

SolStatus uses [tester-army/e2e](https://github.com/tester-army/e2e) as its only automated
test runner. `nub run test` runs `tests/**/*.e2e.ts` against the real Alchemy development stack:
the TanStack Start app on port 3000, the monitor workers, local D1, and better-auth. Do not add
Vitest, mocks, request interception, or a second runner.

SolStatus keeps these choices on purpose:

- better-auth (not Clerk)
- Cloudflare D1 (not PlanetScale)
- no turbo (direct Nub scripts)
- the CLI uses Effect 4 `effect/cli` (not the Effect 3 `@effect/cli` peer)
- deploy on release

## Coverage map

Feature recipes live under
[`.agents/skills/verify-solstatus/features/`](../.agents/skills/verify-solstatus/features/README.md).
Each file links to the canonical `tests/*.e2e.ts` suite for that product area.

## Run locally

```sh
nub install --frozen-lockfile
nub run test:e2e:install
nub run test:e2e:list
nub exec e2e list --changed-since origin/master
nub exec e2e run --changed-since origin/master
nub run test
nub run test:e2e tests/dashboard.e2e.ts
nub run test:e2e:live
nub run test:e2e:cache-strict
```

Pass `--changed-since` to `nub exec e2e` directly. Do not write `nub run test -- --changed-since`.
e2e treats a flag after `--` as a test file.

`scripts/e2e/stack.ts` starts `alchemy dev packages/infra/src/alchemy.run.ts --stage dev` with
its working directory at `.e2e/runs/<uuid>`. Local D1, KV, and Alchemy state stay in that
directory. The launcher stops its processes and removes the directory on exit. It does not call
`alchemy deploy` or `alchemy destroy`, and it does not read `CLOUDFLARE_API_TOKEN`. Ports 3000,
8787, and 8788 must be free.

`BETTER_AUTH_SECRET` comes from the environment or `.env`. When both are empty, the launcher
generates one for that run.

## Models

`scripts/e2e/models.ts` and `scripts/e2e/filters.ts` are identical in every SolZero repository.
Do not edit them here. `models.ts` points official AI SDK providers at the Cloudflare AI Gateway:

- The decision model answers `agent.act`, `agent.assert`, and the affected-test filter.
  `E2E_DECISION_MODEL` selects it. The default is Cloudflare Clef.
- The language model writes text values. `E2E_LANGUAGE_MODEL` selects it.

Provide `CF_AI_GATEWAY_E2E_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, and optionally
`CF_AI_GATEWAY_E2E_ID` (default `default`). This is the account's existing default gateway, not
a gateway the application provisions. CI reads the model names from organization Actions
variables. Shell and CI values override dotenv files. Never put a gateway token in source,
commands, logs, artifacts, or browser processes.

`e2e.config.ts` wraps `decisionFilter` in `ignoreUnobservedChanges`. Changes to agent docs,
skills, and release files are not sent to the filter, so a skills refresh or a version pull
request runs no tests. A change to `e2e.config.ts` or the lockfile keeps every test.

## Replay

Action replay recordings in `.e2e/cache` are committed. CI replays them with `--strict-cache`, so
a stale recording fails the run. When you change an `agent.act` step or the UI it drives,
re-record before you mark the pull request ready:

```sh
gh workflow run validate.yml --ref <branch> -f e2e_record=true
```

The run records every test, then the release app commits the changed recordings to the branch.
Without CI access, run `nub run test` locally and commit `.e2e/cache`.

## CI

`Validate` has three jobs:

- `Repository validation` runs typecheck, lint, format, actionlint, and `nub run test:e2e:list`.
- `Detect release commit` finds the merge of the Tegami version pull request on master.
- `Cloudflare end-to-end flows` runs the suite.

Draft pull requests skip the jobs. A ready pull request runs the tests that the decision filter
selects since `origin/<base>`. A newer push to the same pull request cancels the older run.
Runs from different pull requests do not share a queue, because each run boots its own local
stack.

An ordinary master merge runs no tests. The Tegami version pull request runs nothing. Its merge
runs validation and the tests that the changes since the last tested release can affect, and
`Release` publishes only after that run passes. Any other master merge only opens or updates the
version pull request.

## Author and diagnose

Read `.agents/skills/e2e/SKILL.md` and the verify-solstatus skill. Put new tests under
`tests/**/*.e2e.ts`. Helpers belong in `tests/support/`. Declare credentials and secrets in
`e2e.config.ts`, never in test files. After each `agent.act`, assert exactly with `expect`.

On failure, read `.e2e/summary.md`, then `.e2e/report.json`, failure artifacts, and the redacted
`.e2e/logs/stack.log`. `.e2e/ai-usage/summary.md` lists the suite's model calls. Distinguish
collection, startup, locator, assertion, and provider failures. Do not invent a pass for a
missing secret.
