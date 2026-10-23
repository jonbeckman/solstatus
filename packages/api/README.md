# @solstatus/api

## Overview
Built 100% on Cloudflare, using Workers, Durable Objects, and D1. A quick explanation of the architecture:
- Each endpoint has its own Durable Object, known as the Trigger. This acts as a programmable CronJob via the Alarm API
- The Trigger calls the executor worker (`MonitorExec`).
    - `executeCheck` schedules the HTTP check with `waitUntil()` and returns, so the Durable Object does not wait on the request (Durable Objects are charged for wall time)
- The executor makes the request to the endpoint and updates the database
    - This is extremely cost effective since Workers are charged for CPU Time, and waiting on I/O tasks like this costs nothing 

## Development

It is suggested to run dev from the root of the repo, as there are other services that should be running. More details on that in the root [README](../../README.md#local-dev).
