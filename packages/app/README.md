# @solstatus/app

## Overview
TanStack Start on Vite, with shadcn, TailwindCSS v4, and Drizzle. Some other notable points:
- nub as package manager
- oxlint and oxfmt as linter/formatter
- TanStack Query for server state, with URL search params for list and range state
- Cloudflare Workers via TanStack Start (not Next.js or OpenNext)

The API is an Effect `HttpApi` in `src/server/api/`. `dispatchApi` serves it from the TanStack Start server entry after the Better Auth session check. Signed-in users can read the docs at `/api/docs`.

## Development

It is suggested to run dev from the root of the repo, as there are other services that should be running. More details on that in the root [README](../../README.md#local-dev).
