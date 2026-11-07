---
packages:
  "release:solstatus": minor
---

## Serve the API with Effect HttpApi and load data with TanStack Query

The dashboard API is now an Effect `HttpApi` with typed requests, responses, and errors. Signed-in users can read the OpenAPI document at `/api/openapi.json` and the API docs at `/api/docs`. The dashboard loads and refreshes data with TanStack Query, and the list filters, sorting, paging, and the detail time range are kept in the URL.

`POST /api/endpoint-monitors/{id}/execute-check` replaces the `GET` form of that endpoint.
