# Library checks

Canonical coverage: [`tests/library.e2e.ts`](../../../../tests/library.e2e.ts).

```sh
nub exec e2e run --target cli tests/library.e2e.ts
```

Product facts:

- `createId(PRE_ID.endpointMonitor)` returns a distinct `endp_` id. `PRE_ID.uptimeCheck` is removed.
- `endpointMonitorsPatchSchema` accepts a URL that contains a quote, rejects a non-URL, and drops `id`.
