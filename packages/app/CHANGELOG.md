## @solstatus/app@3.0.1

### Bump Alchemy to 2.0.0-beta.83

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

### Update minor and patch dependencies

Effect 4.0.5, Zod 4.6.7, and the matching lockfile refresh.

### Harden API authentication and query parameterization

API routes other than `/api/auth` now require a session. Endpoint monitor
URL checks bind the submitted URL as a query parameter. Patch requests
accept a valid `url` and do not accept `id`. Better Auth uses the Drizzle
D1 client for its database adapter.

## @solstatus/app@3.0.0

### Align the published toolchain with Shared Project DNA

Package consumers now get Nub 0.4.11, TypeScript 7.0.2, Effect 4.0.0-beta.107,
Drizzle ORM 1.0.0-rc.5, Zod 4.4.3, and Alchemy 2.0.0-beta.72. The dashboard is
TanStack Start on Cloudflare instead of Next.js + OpenNext. The CLI stays on
Effect 4 `effect/unstable/cli` because `@effect/cli` still peers Effect 3.

Install with `nub install`. The previous `pnpm` workspace, Biome lint/format
path, and Next.js app entrypoints are gone.

# Changelog

## [2.1.0](https://github.com/unibeck/solstatus/compare/@solstatus/app@v2.0.0...@solstatus/app@v2.1.0) (2025-07-09)


### Features

* make fqdn optional, and use worker.dev url if not present ([579e224](https://github.com/unibeck/solstatus/commit/579e224926fa6b77d9f01d82e196d37803d47e7f))
* Polish UI and add auto-refresh to dashboards ([a9d4f1d](https://github.com/unibeck/solstatus/commit/a9d4f1db20f7415aba948593201c55b838cdac62))
* release v2 ([8d09d77](https://github.com/unibeck/solstatus/commit/8d09d77f92ceec9bd7cba2e9fb4a514a406b588d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @solstatus/api bumped to 2.1.0

## 2.0.0-beta.1 (2025-06-23)


### Features

* make fqdn optional, and use worker.dev url if not present ([579e224](https://github.com/unibeck/solstatus/commit/579e224926fa6b77d9f01d82e196d37803d47e7f))
