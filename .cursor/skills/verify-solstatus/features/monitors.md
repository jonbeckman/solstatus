# Endpoint monitors

Canonical coverage: [`tests/monitors.e2e.ts`](../../../../tests/monitors.e2e.ts).

```sh
nub run test:e2e -- tests/monitors.e2e.ts
```

Product facts:

- Create flow opens the Add Endpoint Monitor dialog with Name, URL, interval, and status fields.
- A created monitor appears in the dashboard table and survives reload.
- Monitor ids use the `endp_` prefix from shared helpers (covered through the product create path).
