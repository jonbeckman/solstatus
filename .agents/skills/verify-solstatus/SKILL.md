---
name: verify-solstatus
description: Verify SolStatus user flows with tester-army/e2e against the real Alchemy local stack (better-auth + D1). Use for dashboard, monitors, API, and CLI regression checks.
---

# Verify SolStatus

Read `.agents/skills/e2e/SKILL.md`, `docs/e2e.md`, and [`features/README.md`](features/README.md)
before running or extending verification. The `features/` directory is the coverage map: one
file per user-facing area, each linking to its canonical `tests/**/*.e2e.ts` suite(s).
Automated tests use tester-army/e2e exclusively.
Cloud-agent proof rules: [Pull requests](../../../AGENTS.md#pull-requests).
After a run, the Evidence output stays in `.e2e/summary.md`, `.e2e/report.json`, `.e2e/junit.xml`, and `.e2e/logs/`. The launcher removes `.e2e/runs/<uuid>` on exit. Do not commit that output. Commit only `.e2e/cache` recordings.

## Run

```sh
nub install --frozen-lockfile
nub run test:e2e:install
nub exec e2e list --changed-since origin/master
nub exec e2e run --changed-since origin/master
```

`e2e.config.ts` registers `decisionFilter` from `@e2e-dev/decision` with the decision model from the shared `scripts/e2e/models.ts` (default Cloudflare Clef) through the Cloudflare AI Gateway. On a pull request, pass `--changed-since origin/master` to `nub exec e2e list` and `nub exec e2e run` so that filter selects the tests the change can affect. Do not put `--` before the flag (`nub run test -- --changed-since` makes e2e treat the flag as a test file). Without the flag, every test runs. A change to `e2e.config.ts` or another run-all file leaves nothing out.

The app command is `scripts/e2e/stack.ts`. It starts `alchemy dev` for `packages/infra/src/alchemy.run.ts` and writes local Cloudflare state under `.e2e/runs/<uuid>/.alchemy`. Ports 3000, 8787, and 8788 must be free. Do not pass `CLOUDFLARE_API_TOKEN`. The models need `CLOUDFLARE_ACCOUNT_ID` and `CF_AI_GATEWAY_E2E_TOKEN`. CI replays the committed `.e2e/cache` recordings with `nub run test:e2e:cache-strict`, which fails a stale recording. `BETTER_AUTH_SECRET` is generated when it is unset. Never print secret values. After each `agent.act`, assert exactly with `expect`.

## Permanent exceptions

Keep better-auth, Cloudflare D1, no turbo, the existing Effect CLI stack, and deploy on release.
Do not "fix" these toward Clerk, PlanetScale, or turbo.
