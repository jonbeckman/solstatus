---
packages:
  solstatus: patch
  "@solstatus/common": patch
  "@solstatus/api": patch
  "@solstatus/app": patch
  "@solstatus/infra": patch
---

## Align Effect 4.0.3 and Alchemy 2.0.0-beta.81

Package consumers now get Effect 4.0.3 with matching `@effect/*` 4.0.3
(`platform-node`, `platform-node-shared`, `sql-d1`, `sql-sqlite-do`), plus
Alchemy 2.0.0-beta.81. Drizzle stays on 1.0.0-rc.5-ab785fc.

The CLI uses Effect 4 `effect/cli` (the former `effect/unstable/cli` path).
D1 resources pass the existing migrations directory through Alchemy's
`migrations` input. The wrapper still forwards `--stage` and now also sets
`ALCHEMY_STAGE` so Alchemy's stage env rename does not change deploy names.
