---
packages:
  solstatus: patch
  "@solstatus/app": patch
---

## Update dotenv and dashboard chart dependencies

The CLI loads `.env` with dotenv 18.0.9 and does not print an injection line.

The dashboard charts use Recharts 3.10.1. Status legends stay next to the uptime and latency charts, and tooltips still show status counts and latency. Vite, date-fns, and the dropdown menu keep the versions the lockfile already resolved, with higher minimum ranges.
