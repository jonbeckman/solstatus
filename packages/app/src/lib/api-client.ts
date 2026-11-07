import * as Effect from "effect/Effect"
import { FetchHttpClient } from "effect/http"
import { HttpApiClient } from "effect/http-api"
import { Api } from "@/server/api/api"

export type ApiClient = HttpApiClient.ForApi<typeof Api>

// The dashboard and the API share an origin, and the session cookie goes with each request.
const apiClient = HttpApiClient.make(Api, { baseUrl: "" }).pipe(
  Effect.provide(FetchHttpClient.layer),
)

export function runApi<A, E>(request: (client: ApiClient) => Effect.Effect<A, E, never>) {
  return Effect.runPromise(apiClient.pipe(Effect.flatMap(request)))
}
