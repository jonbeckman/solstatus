# App API

Canonical coverage: [`tests/api.e2e.ts`](../../../../tests/api.e2e.ts).

```sh
nub run test:e2e -- tests/api.e2e.ts
```

Product facts:

- Anonymous calls to `/api/endpoint-monitors`, `/api/endpoint-monitors/stats`, `/api/infra-metadata`, and other non-auth paths return 401 `{ message: "Unauthorized" }`.
- A signed-in caller can read `/api/infra-metadata` and create an endpoint monitor whose URL contains a single quote. A second create of that URL returns 409 with `matchingEndpointMonitor.url`.
- `/api/auth/ok` and `/api/auth/get-session` stay available without a session. `/api/auth/*` is better-auth (email OTP); no Clerk.
