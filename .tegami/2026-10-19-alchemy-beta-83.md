---
packages:
  solstatus: patch
  "@solstatus/common": patch
  "@solstatus/api": patch
  "@solstatus/app": patch
  "@solstatus/infra": patch
---

## Bump Alchemy to 2.0.0-beta.83

Package consumers now get Alchemy 2.0.0-beta.83. That version is the
intended pin. Effect stays on master's 4.0.5 with matching
`@effect/platform-node` and `@effect/platform-node-shared`. Drizzle stays
on 1.0.0-rc.5-ab785fc.

Alchemy 2.0.0-beta.82 and later deploy Durable Objects with Cloudflare
declarative exports. This is one-way. The first deploy of a Worker that
hosts Durable Objects, including `monitor-trigger`, must go out at full
traffic. Older Alchemy releases cannot deploy that Worker afterward.

D1 resources pass the existing migrations directory through Alchemy's
`migrations` input. The wrapper still forwards `--stage` and now also sets
`ALCHEMY_STAGE` so Alchemy's stage env rename does not change deploy names.
The Alchemy CLI entry is `alchemy/bin/cli.js` (`bin/alchemy.ts` is gone).
