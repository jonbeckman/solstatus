---
packages:
  "solstatus": patch
  "@solstatus/api": patch
  "@solstatus/app": patch
  "@solstatus/common": patch
  "@solstatus/infra": patch
---

### Bump Alchemy to 2.0.0-beta.83

Package consumers now get Alchemy 2.0.0-beta.83. Effect stays on 4.0.5.
Drizzle stays on 1.0.0-rc.5-ab785fc.

D1 resources pass the existing migrations directory through Alchemy's
`migrations` input. The wrapper still forwards `--stage` and also sets
`ALCHEMY_STAGE` so deploy names stay on the requested stage. The Alchemy
CLI entry is `alchemy/bin/cli.js`.

The first deploy of a Worker that hosts Durable Objects after this upgrade
must go out at full traffic. Older Alchemy releases cannot deploy that
Worker afterward.
