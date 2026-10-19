---
packages:
  "@solstatus/common":
    type: major
---

## Drop unused uptime check ID and patch schema

`uptimeChecksPatchSchema` is removed. Uptime check rows use integer
auto-increment IDs, so `PRE_ID.uptimeCheck` and the exported `nanoid`
helper are gone. Use `uptimeChecksSelectSchema` or
`uptimeChecksInsertSchema`, and `createId(PRE_ID.endpointMonitor)` for
endpoint monitor IDs.
