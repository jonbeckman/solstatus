---
packages:
  solstatus: patch
  "@solstatus/api": patch
  "@solstatus/infra": patch
---

## Reconcile Alchemy production deploy with leftover Wrangler

Production deploy is the Alchemy CLI (`nub run cli -- --stage prod`). Wrangler
configs in `@solstatus/infra` are local D1 and local monitor-worker dev only;
OpenNext worker keys and the unused `wrangler:gen` script are gone. `db:seed`
reads the same `packages/infra/.wrangler` persist directory that
`nub run dev:api` uses.
