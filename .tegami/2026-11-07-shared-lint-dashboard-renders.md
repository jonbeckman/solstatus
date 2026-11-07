---
packages:
  "release:solstatus": patch
---

## Dashboard renders follow the React Compiler rules

The latency and uptime charts share one time-range helper. The monitor details drawer loads the latest check when it opens, not from an effect. The monitor page derives its uptime percentage and average latency from the loaded checks. The theme switch reads the client state without an extra render.
