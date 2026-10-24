---
name: verify-solstatus
description: Verify SolStatus user flows with tester-army/e2e against the real Alchemy local stack (better-auth + D1). Use for dashboard, monitors, API, and CLI regression checks.
---

# Verify SolStatus

Read `.agents/skills/e2e/SKILL.md`, `docs/e2e.md`, and [`features/README.md`](features/README.md)
before running or extending verification. The `features/` directory is the coverage map: one
file per user-facing area, each linking to its canonical `tests/**/*.e2e.ts` suite(s).
Automated tests use tester-army/e2e exclusively.
Cloud-agent proof rules: [Cloud-agent PR artifacts](../../../AGENTS.md#cloud-agent-pr-artifacts).
After `nub run test:e2e:cleanup`, the Evidence output stays in `.e2e/summary.md`, `.e2e/report.json`, `.e2e/junit.xml`, and `.e2e/logs/`. Cleanup removes `.e2e/runs/` and the ownership files under `.e2e/cleanup/`. Do not commit that output.

## Run

```sh
nub install --frozen-lockfile
nub run test:e2e:install
nub run test
nub exec e2e run tests/dashboard.e2e.ts
nub run test:e2e:list
```

`e2e@0.17.0` and `@e2e-dev/web@0.12.0` do not provide the Test Filters API (`filters`, `decisionFilter`, `--changed-since`). Select the feature file by name. That API arrives in `e2e@0.21.3`. Leave the 0.17.0 pin in place until a change is dedicated to the upgrade.

Supply Cloudflare account/API credentials, `BETTER_AUTH_SECRET`, and `CF_AI_GATEWAY_E2E_TOKEN`.
Never print secret values. After each `agent.act`, assert exactly with `expect`.

## Permanent exceptions

Keep better-auth, Cloudflare D1, no turbo, the existing Effect CLI stack, deploy-on-release,
and Tegami go/no-go. Do not "fix" these toward Clerk/PlanetScale/turbo.
