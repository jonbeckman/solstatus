import * as Schema from "effect/Schema"
import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema, OpenApi } from "effect/http-api"
import {
  ConflictErrorResponse,
  CreateEndpointMonitor,
  DashboardStats,
  EndpointMonitor,
  EndpointMonitorsListQuery,
  EndpointMonitorsPage,
  IdPathParams,
  InfraMetadata,
  InternalServerErrorResponse,
  MessageResponse,
  NotFoundErrorResponse,
  UpdateEndpointMonitor,
  UptimeCheck,
  UptimeLimitQuery,
  UptimeRangeQuery,
} from "./schemas"

const errors = [NotFoundErrorResponse, InternalServerErrorResponse]

export class EndpointMonitorsApi extends HttpApiGroup.make("endpointMonitors")
  .add(
    HttpApiEndpoint.get("list", "/endpoint-monitors", {
      query: EndpointMonitorsListQuery,
      success: EndpointMonitorsPage,
      error: errors,
    }).annotateMerge(OpenApi.annotations({ summary: "List endpoint monitors" })),
    HttpApiEndpoint.post("create", "/endpoint-monitors", {
      payload: CreateEndpointMonitor,
      success: EndpointMonitor.pipe(HttpApiSchema.status("Created")),
      error: [ConflictErrorResponse, ...errors],
    }).annotateMerge(OpenApi.annotations({ summary: "Create an endpoint monitor" })),
    HttpApiEndpoint.get("stats", "/endpoint-monitors/stats", {
      success: DashboardStats,
      error: errors,
    }).annotateMerge(OpenApi.annotations({ summary: "Return dashboard statistics" })),
    HttpApiEndpoint.get("get", "/endpoint-monitors/:id", {
      params: IdPathParams,
      success: EndpointMonitor,
      error: errors,
    }).annotateMerge(OpenApi.annotations({ summary: "Get an endpoint monitor" })),
    HttpApiEndpoint.patch("update", "/endpoint-monitors/:id", {
      params: IdPathParams,
      payload: UpdateEndpointMonitor,
      success: EndpointMonitor,
      error: errors,
    }).annotateMerge(OpenApi.annotations({ summary: "Update an endpoint monitor" })),
    HttpApiEndpoint.delete("delete", "/endpoint-monitors/:id", {
      params: IdPathParams,
      success: HttpApiSchema.NoContent,
      error: errors,
    }).annotateMerge(OpenApi.annotations({ summary: "Delete an endpoint monitor" })),
    HttpApiEndpoint.post("executeCheck", "/endpoint-monitors/:id/execute-check", {
      params: IdPathParams,
      success: MessageResponse,
      error: errors,
    }).annotateMerge(OpenApi.annotations({ summary: "Run a check now" })),
    HttpApiEndpoint.post("pause", "/endpoint-monitors/:id/pause", {
      params: IdPathParams,
      success: MessageResponse,
      error: errors,
    }).annotateMerge(OpenApi.annotations({ summary: "Pause monitoring" })),
    HttpApiEndpoint.post("resume", "/endpoint-monitors/:id/resume", {
      params: IdPathParams,
      success: MessageResponse,
      error: errors,
    }).annotateMerge(OpenApi.annotations({ summary: "Resume monitoring" })),
    HttpApiEndpoint.get("latestCheck", "/endpoint-monitors/:id/uptime", {
      params: IdPathParams,
      success: Schema.NullOr(UptimeCheck),
      error: errors,
    }).annotateMerge(OpenApi.annotations({ summary: "Return the latest check" })),
    HttpApiEndpoint.get("recentLatency", "/endpoint-monitors/:id/uptime/limit", {
      params: IdPathParams,
      query: UptimeLimitQuery,
      success: Schema.Array(UptimeCheck),
      error: errors,
    }).annotateMerge(
      OpenApi.annotations({ summary: "Return the most recent checks with latency" }),
    ),
    HttpApiEndpoint.get("uptimeRange", "/endpoint-monitors/:id/uptime/range", {
      params: IdPathParams,
      query: UptimeRangeQuery,
      success: Schema.Array(UptimeCheck),
      error: errors,
    }).annotateMerge(OpenApi.annotations({ summary: "Return checks in a time range" })),
  )
  .annotateMerge(OpenApi.annotations({ title: "Endpoint monitors" })) {}

export class InfraApi extends HttpApiGroup.make("infra")
  .add(
    HttpApiEndpoint.get("metadata", "/infra-metadata", {
      success: InfraMetadata,
      error: errors,
    }).annotateMerge(OpenApi.annotations({ summary: "Return deployed worker names" })),
  )
  .annotateMerge(OpenApi.annotations({ title: "Infrastructure" })) {}

export class Api extends HttpApi.make("solstatus")
  .add(EndpointMonitorsApi)
  .add(InfraApi)
  .prefix("/api")
  .annotateMerge(
    OpenApi.annotations({
      title: "SolStatus API",
      description: "Dashboard API for SolStatus endpoint monitors.",
      version: "1.0.0",
    }),
  ) {}
