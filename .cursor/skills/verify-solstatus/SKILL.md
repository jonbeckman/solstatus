---
name: verify-solstatus
description: Verify SolStatus user flows with tester-army/e2e against the real Alchemy local stack (better-auth + D1). Use for dashboard, monitors, API, and CLI regression checks.
---

# Verify SolStatus

Read `.agents/skills/e2e/SKILL.md`, `docs/e2e.md`, and [`features/README.md`](features/README.md)
before running or extending verification. The `features/` directory is the coverage map: one
file per user-facing area, each linking to its canonical `tests/**/*.e2e.ts` suite(s).
Automated tests use tester-army/e2e exclusively.

## Run

```sh
nub install --frozen-lockfile
nub run test:e2e:install
nub run test
nub run test:e2e -- tests/dashboard.e2e.ts
nub run test:e2e:list
```

Supply Cloudflare account/API credentials, `BETTER_AUTH_SECRET`, and `CF_AI_GATEWAY_E2E_TOKEN`.
Never print secret values. After each `agent.act`, assert exactly with `expect`.

## Permanent exceptions

Keep better-auth, Cloudflare D1, no turbo, the existing Effect CLI stack, deploy-on-release,
and Tegami go/no-go. Do not "fix" these toward Clerk/PlanetScale/turbo.
