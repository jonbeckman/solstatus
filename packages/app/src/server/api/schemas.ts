// Contract schemas for the SolStatus dashboard API and its typed client.
import * as Schema from "effect/Schema"
import { HttpApiSchema } from "effect/http-api"

const PositiveInt = Schema.Int.check(Schema.isGreaterThan(0))

const HttpUrl = Schema.String.check(
  Schema.makeFilter((value) => URL.canParse(value) || "Enter a valid URL"),
)

const NumberQuery = Schema.NumberFromString.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0))

export const TimeRange = Schema.Literals(["30m", "1h", "3h", "6h", "1d", "2d", "7d"])

export type TimeRange = typeof TimeRange.Type

export const SortOrder = Schema.Literals(["asc", "desc"])

export type SortOrder = typeof SortOrder.Type

export class EndpointMonitor extends Schema.Class<EndpointMonitor>("EndpointMonitor")({
  id: Schema.String,
  url: Schema.String,
  name: Schema.String,
  checkInterval: Schema.Number,
  isRunning: Schema.Boolean,
  expectedStatusCode: Schema.NullOr(Schema.Number),
  consecutiveFailures: Schema.Number,
  alertThreshold: Schema.Number,
  activeAlert: Schema.Boolean,
  createdAt: Schema.DateFromString,
  updatedAt: Schema.DateFromString,
}) {}

export class UptimeCheck extends Schema.Class<UptimeCheck>("UptimeCheck")({
  id: Schema.Number,
  endpointMonitorId: Schema.String,
  timestamp: Schema.DateFromString,
  status: Schema.NullOr(Schema.Number),
  responseTime: Schema.NullOr(Schema.Number),
  isExpectedStatus: Schema.Boolean,
}) {}

export class EndpointMonitorsPage extends Schema.Class<EndpointMonitorsPage>(
  "EndpointMonitorsPage",
)({
  data: Schema.Array(EndpointMonitor),
  totalCount: Schema.Number,
}) {}

export class DashboardStats extends Schema.Class<DashboardStats>("DashboardStats")({
  totalEndpointMonitors: Schema.Number,
  sitesWithAlerts: Schema.Number,
  highestResponseTime: Schema.Number,
  highestResponseTimeEndpointMonitorId: Schema.NullOr(Schema.String),
  uptimePercentage: Schema.Number,
}) {}

export class InfraMetadata extends Schema.Class<InfraMetadata>("InfraMetadata")({
  cloudflareAccountId: Schema.String,
  monitorExecName: Schema.String,
  monitorTriggerName: Schema.String,
}) {}

export class MessageResponse extends Schema.Class<MessageResponse>("MessageResponse")({
  message: Schema.String,
}) {}

export const CreateEndpointMonitorFields = {
  url: HttpUrl,
  name: Schema.String.check(Schema.isMinLength(1)),
  checkInterval: PositiveInt,
  isRunning: Schema.optionalKey(Schema.Boolean),
  expectedStatusCode: Schema.optionalKey(Schema.NullOr(PositiveInt)),
  alertThreshold: PositiveInt,
}

export const CreateEndpointMonitor = Schema.Struct(CreateEndpointMonitorFields)

export const UpdateEndpointMonitor = Schema.Struct({
  url: Schema.optionalKey(HttpUrl),
  name: Schema.optionalKey(Schema.String.check(Schema.isMinLength(1))),
  checkInterval: Schema.optionalKey(PositiveInt),
  isRunning: Schema.optionalKey(Schema.Boolean),
  expectedStatusCode: Schema.optionalKey(Schema.NullOr(PositiveInt)),
  alertThreshold: Schema.optionalKey(PositiveInt),
})

export const IdPathParams = Schema.Struct({
  id: Schema.String,
})

export const EndpointMonitorsListQuery = Schema.Struct({
  page: Schema.optionalKey(NumberQuery),
  pageSize: Schema.optionalKey(NumberQuery.check(Schema.isGreaterThan(0))),
  orderBy: Schema.optionalKey(Schema.String),
  order: Schema.optionalKey(SortOrder),
  search: Schema.optionalKey(Schema.String),
})

export const UptimeLimitQuery = Schema.Struct({
  limit: Schema.optionalKey(NumberQuery.check(Schema.isGreaterThan(0))),
})

export const UptimeRangeQuery = Schema.Struct({
  range: Schema.optionalKey(TimeRange),
})

export class NotFoundError extends Schema.TaggedError<NotFoundError>()("NotFoundError", {
  message: Schema.String,
}) {}

export class ConflictError extends Schema.TaggedError<ConflictError>()("ConflictError", {
  message: Schema.String,
  matchingEndpointMonitor: EndpointMonitor,
}) {}

export class InternalServerError extends Schema.TaggedError<InternalServerError>()(
  "InternalServerError",
  {
    message: Schema.String,
  },
) {}

export const NotFoundErrorResponse = NotFoundError.pipe(HttpApiSchema.status("NotFound"))

export const ConflictErrorResponse = ConflictError.pipe(HttpApiSchema.status("Conflict"))

export const InternalServerErrorResponse = InternalServerError.pipe(
  HttpApiSchema.status("InternalServerError"),
)
