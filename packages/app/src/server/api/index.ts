import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import { HttpRouter, HttpServer } from "effect/http"
import { HttpApiBuilder, HttpApiScalar } from "effect/http-api"
import { Api } from "./api"
import { ApiHandlersLive } from "./handlers"

const apiLayer = HttpApiBuilder.layer(Api, {
  openapiPath: "/api/openapi.json",
}).pipe(
  Layer.provide(ApiHandlersLive),
  Layer.provideMerge(HttpApiScalar.layerCdn(Api, { path: "/api/docs" })),
  Layer.provideMerge(Logger.layer([Logger.consoleJson])),
  Layer.provideMerge(HttpServer.layerServices),
)

const apiHandler = HttpRouter.toWebHandler(apiLayer)

export function handleApiRequest(request: Request) {
  return apiHandler.handler(request)
}
