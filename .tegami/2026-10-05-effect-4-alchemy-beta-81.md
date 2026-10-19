---
packages:
  solstatus: patch
  "@solstatus/common": patch
  "@solstatus/api": patch
  "@solstatus/app": patch
  "@solstatus/infra": patch
---

## Bump Alchemy to 2.0.0-beta.81

Package consumers now get Alchemy 2.0.0-beta.81. Effect stays on master's
4.0.5 with matching `@effect/platform-node` and `@effect/platform-node-shared`.
Drizzle stays on 1.0.0-rc.5-ab785fc.

D1 resources pass the existing migrations directory through Alchemy's
`migrations` input. The wrapper still forwards `--stage` and now also sets
`ALCHEMY_STAGE` so Alchemy's stage env rename does not change deploy names.
The Alchemy CLI entry is `alchemy/bin/cli.js` (`bin/alchemy.ts` is gone).
