---
packages:
  "@solstatus/api": patch
---

## Keep monitor alarms running after a failed first check

Durable Object alarm retries now reschedule the next check instead of
returning without an alarm. Unused monitor-exec response bodies are
cancelled. Opsgenie down-alert details point at jonbeckman/solstatus.
Alchemy binds OPSGENIE_API_KEY as a Worker secret.
