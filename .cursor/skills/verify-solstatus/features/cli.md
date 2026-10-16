# CLI

Canonical coverage: [`tests/cli.e2e.ts`](../../../../tests/cli.e2e.ts).

```sh
nub run test:e2e -- tests/cli.e2e.ts
```

Product facts:

- `solstatus --help` runs through Effect `unstable/cli` and documents phase/stage usage.
- Do not invent a new CLI stack; keep the repository's Effect CLI choice.
