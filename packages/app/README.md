# @solstatus/app

## Overview
TanStack Start on Vite, with shadcn, TailwindCSS v4, and Drizzle. Some other notable points:
- nub as package manager
- oxlint and oxfmt as linter/formatter
- zustand for state management
- Cloudflare Workers via TanStack Start (not Next.js or OpenNext)

API handlers under `src/app/api/` are dispatched by `dispatchApi` from the TanStack Start server entry.

## Development

It is suggested to run dev from the root of the repo, as there are other services that should be running. More details on that in the root [README](../../README.md#local-dev).
