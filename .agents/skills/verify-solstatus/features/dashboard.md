# Dashboard

Canonical coverage: [`tests/dashboard.e2e.ts`](../../../../tests/dashboard.e2e.ts).

```sh
nub run test:e2e -- tests/dashboard.e2e.ts
```

Product facts:

- `/` shows the Endpoint Monitors header and Create Endpoint Monitor action.
- Sidebar exposes Monitors → Endpoint navigation.
- Stats cards and the monitors table load from the real app API (no mocks).
