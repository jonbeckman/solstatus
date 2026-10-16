# App API

Canonical coverage: [`tests/api.e2e.ts`](../../../../tests/api.e2e.ts).

```sh
nub run test:e2e -- tests/api.e2e.ts
```

Product facts:

- `/api/infra-metadata` returns Cloudflare account and worker names from real bindings.
- `/api/endpoint-monitors` and `/api/endpoint-monitors/stats` return JSON from D1-backed handlers.
- `/api/auth/*` is handled by better-auth (email OTP plugin); no Clerk.
