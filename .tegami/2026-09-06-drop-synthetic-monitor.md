---
packages:
  "@solstatus/api": major
  "@solstatus/common": major
---

## Remove unfinished synthetic monitor types

`InitPayload` is endpoint-only. It no longer accepts `monitorType: "synthetic"`,
`timeoutSeconds`, or `runtime`. `PRE_ID.syntheticMonitor` is removed. Endpoint
monitor init, alarm, pause, and resume are unchanged. App callers may keep
passing `monitorType: "endpoint"`.
