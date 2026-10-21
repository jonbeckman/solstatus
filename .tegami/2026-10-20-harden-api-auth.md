---
packages:
  "@solstatus/app": patch
  "@solstatus/common": patch
---

## Harden API authentication and query parameterization

API routes other than `/api/auth` now require a session. Endpoint monitor
URL checks bind the submitted URL as a query parameter. Patch requests
accept a valid `url` and do not accept `id`. Better Auth uses the Drizzle
D1 client for its database adapter.
