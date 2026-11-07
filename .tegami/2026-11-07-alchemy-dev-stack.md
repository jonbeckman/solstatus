---
packages:
  "release:solstatus": patch
---

## Run local development on the Alchemy dev stack

`nub run dev` now runs the dashboard, both monitor workers, D1, and KV together with `alchemy dev`. The Wrangler dev scripts, the local Wrangler database scripts and configs, the seed script, and the Vite mock API are removed. A stack now stops with a clear error when `BETTER_AUTH_SECRET` is not set, instead of signing sessions with an empty secret.
