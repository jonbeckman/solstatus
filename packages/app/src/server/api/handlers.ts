import { takeFirstOrNull, useDrizzle } from "@solstatus/common/db"
import { EndpointMonitorsTable, UptimeChecksTable } from "@solstatus/common/db/schema"
import {
  createId,
  getErrorMessage,
  MonitorTriggerNotInitializedError,
  PRE_ID,
} from "@solstatus/common/utils"
import { subDays, subHours, subMinutes, subWeeks } from "date-fns"
import { and, asc, count, desc, eq, gt, isNotNull, like, or, sql } from "drizzle-orm"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schedule from "effect/Schedule"
import { HttpApiBuilder } from "effect/http-api"
import { getWorkerEnv } from "@/lib/worker-env"
import { Api } from "./api"
import {
  ConflictError,
  DashboardStats,
  EndpointMonitor,
  EndpointMonitorsPage,
  InfraMetadata,
  InternalServerError,
  MessageResponse,
  NotFoundError,
  type TimeRange,
  UptimeCheck,
} from "./schemas"

const DEFAULT_PAGE_SIZE = 10
const DEFAULT_ORDER_BY = "createdAt"
const DEFAULT_LATENCY_LIMIT = 30

const orderColumns = new Map(
  Object.entries({
    id: EndpointMonitorsTable.id,
    url: EndpointMonitorsTable.url,
    name: EndpointMonitorsTable.name,
    checkInterval: EndpointMonitorsTable.checkInterval,
    isRunning: EndpointMonitorsTable.isRunning,
    expectedStatusCode: EndpointMonitorsTable.expectedStatusCode,
    consecutiveFailures: EndpointMonitorsTable.consecutiveFailures,
    alertThreshold: EndpointMonitorsTable.alertThreshold,
    activeAlert: EndpointMonitorsTable.activeAlert,
    createdAt: EndpointMonitorsTable.createdAt,
    updatedAt: EndpointMonitorsTable.updatedAt,
  }),
)

function database() {
  return useDrizzle(getWorkerEnv().env.DB)
}

// Run one database or binding call. A failure becomes a 500 with the reason in the log.
function attempt<A>(operation: string, run: () => PromiseLike<A> | A) {
  return Effect.tryPromise({
    try: async () => run(),
    catch: (cause) =>
      new InternalServerError({ message: `${operation}: ${getErrorMessage(cause)}` }),
  }).pipe(
    Effect.tapError((error) => Effect.logError(error.message)),
    Effect.withSpan(`solstatus.api.${operation}`),
  )
}

function stripProtocol(url: string) {
  return url.replace(/(^\w+:|^)\/\//, "")
}

function rangeStart(range: TimeRange, now: Date) {
  switch (range) {
    case "30m":
      return subMinutes(now, 30)
    case "1h":
      return subHours(now, 1)
    case "3h":
      return subHours(now, 3)
    case "6h":
      return subHours(now, 6)
    case "1d":
      return subDays(now, 1)
    case "2d":
      return subDays(now, 2)
    case "7d":
      return subWeeks(now, 1)
  }
}

const findMonitor = (id: string) =>
  attempt("findEndpointMonitor", () =>
    database()
      .select()
      .from(EndpointMonitorsTable)
      .where(eq(EndpointMonitorsTable.id, id))
      .then(takeFirstOrNull),
  ).pipe(
    Effect.flatMap((row) =>
      row
        ? Effect.succeed(row)
        : Effect.fail(new NotFoundError({ message: `Endpoint monitor ${id} not found` })),
    ),
  )

const toMonitor = (row: typeof EndpointMonitorsTable.$inferSelect) => new EndpointMonitor(row)

const toCheck = (row: typeof UptimeChecksTable.$inferSelect) => new UptimeCheck(row)

// A new monitor writes its first check right away. A local D1 read can lose that race, so the
// list read retries a few times before it reports a failure.
const listRetry = { times: 4, schedule: Schedule.exponential("100 millis") }

const EndpointMonitorHandlers = HttpApiBuilder.group(Api, "endpointMonitors", (handlers) =>
  handlers
    .handle("list", ({ query }) => {
      const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE
      const page = query.page ?? 0
      const orderColumn = orderColumns.get(query.orderBy ?? DEFAULT_ORDER_BY)
      const orderDirection = query.order === "asc" ? asc : desc

      if (!orderColumn) {
        return Effect.fail(
          new InternalServerError({ message: `Unsupported order column: ${query.orderBy}` }),
        )
      }

      // Build the predicate per query. A shared SQL fragment is not safe to run twice.
      const where = () =>
        query.search
          ? or(
              like(EndpointMonitorsTable.name, `%${query.search}%`),
              like(EndpointMonitorsTable.url, `%${query.search}%`),
            )
          : undefined

      return attempt("listEndpointMonitors", async () => {
        const db = database()

        const rows = await db
          .select()
          .from(EndpointMonitorsTable)
          .where(where())
          .orderBy(orderDirection(orderColumn), asc(EndpointMonitorsTable.id))
          .limit(pageSize)
          .offset(page * pageSize)

        const [total] = await db
          .select({ count: count() })
          .from(EndpointMonitorsTable)
          .where(where())

        return new EndpointMonitorsPage({
          data: rows.map(toMonitor),
          totalCount: Number(total?.count ?? 0),
        })
      }).pipe(Effect.retry(listRetry))
    })
    .handle("create", ({ payload }) =>
      Effect.gen(function* () {
        const { env } = getWorkerEnv()
        const normalizedUrl = stripProtocol(payload.url)

        const candidates = yield* attempt("findSimilarEndpointMonitors", () =>
          database()
            .select()
            .from(EndpointMonitorsTable)
            .where(sql`instr(${EndpointMonitorsTable.url}, ${normalizedUrl}) > 0`),
        )

        const matching = candidates.find((candidate) => {
          const candidateUrl = stripProtocol(candidate.url)

          return candidateUrl.endsWith(normalizedUrl) || normalizedUrl.endsWith(candidateUrl)
        })

        if (matching) {
          return yield* new ConflictError({
            message: `A monitor with a similar URL already exists: ${matching.url}`,
            matchingEndpointMonitor: toMonitor(matching),
          })
        }

        const [created] = yield* attempt("createEndpointMonitor", () =>
          database()
            .insert(EndpointMonitorsTable)
            .values({ ...payload, id: createId(PRE_ID.endpointMonitor) })
            .returning(),
        )

        if (!created) {
          return yield* new InternalServerError({ message: "The insert returned no row" })
        }

        yield* attempt("initMonitorTrigger", () =>
          env.MONITOR_TRIGGER_RPC.init({
            monitorId: created.id,
            monitorType: "endpoint",
            checkInterval: created.checkInterval,
          }),
        )

        return toMonitor(created)
      }),
    )
    .handle("stats", () =>
      attempt("dashboardStats", async () => {
        const db = database()
        const oneDayAgo = subDays(new Date(), 1)

        const [total] = await db.select({ count: count() }).from(EndpointMonitorsTable)

        const [alerts] = await db
          .select({ count: count() })
          .from(EndpointMonitorsTable)
          .where(eq(EndpointMonitorsTable.activeAlert, true))

        const highest = await db
          .select({
            responseTime: UptimeChecksTable.responseTime,
            endpointMonitorId: UptimeChecksTable.endpointMonitorId,
          })
          .from(UptimeChecksTable)
          .where(
            and(
              gt(UptimeChecksTable.timestamp, oneDayAgo),
              isNotNull(UptimeChecksTable.responseTime),
            ),
          )
          .orderBy(desc(UptimeChecksTable.responseTime))
          .limit(1)
          .then(takeFirstOrNull)

        const checks = await db
          .select({ isExpectedStatus: UptimeChecksTable.isExpectedStatus })
          .from(UptimeChecksTable)
          .where(gt(UptimeChecksTable.timestamp, oneDayAgo))

        const successful = checks.filter((check) => check.isExpectedStatus).length
        const uptime = checks.length > 0 ? (successful / checks.length) * 100 : 100

        return new DashboardStats({
          totalEndpointMonitors: Number(total?.count ?? 0),
          sitesWithAlerts: Number(alerts?.count ?? 0),
          highestResponseTime: highest?.responseTime ?? 0,
          highestResponseTimeEndpointMonitorId: highest?.endpointMonitorId ?? null,
          uptimePercentage: Math.round(uptime * 100) / 100,
        })
      }),
    )
    .handle("get", ({ params }) => findMonitor(params.id).pipe(Effect.map(toMonitor)))
    .handle("update", ({ params, payload }) =>
      Effect.gen(function* () {
        const { env } = getWorkerEnv()

        const [updated] = yield* attempt("updateEndpointMonitor", () =>
          database()
            .update(EndpointMonitorsTable)
            .set(payload)
            .where(eq(EndpointMonitorsTable.id, params.id))
            .returning(),
        )

        if (!updated) {
          return yield* new NotFoundError({ message: `Endpoint monitor ${params.id} not found` })
        }

        yield* attempt("updateCheckInterval", () =>
          env.MONITOR_TRIGGER_RPC.updateCheckInterval(updated.id, updated.checkInterval),
        )

        return toMonitor(updated)
      }),
    )
    .handle("delete", ({ params }) =>
      Effect.gen(function* () {
        const { env } = getWorkerEnv()

        yield* attempt("deleteEndpointMonitor", () =>
          database().delete(EndpointMonitorsTable).where(eq(EndpointMonitorsTable.id, params.id)),
        )
        yield* attempt("deleteMonitorTrigger", () => env.MONITOR_TRIGGER_RPC.deleteDo(params.id))
      }),
    )
    .handle("executeCheck", ({ params }) =>
      Effect.gen(function* () {
        const monitor = yield* findMonitor(params.id)

        yield* attempt("executeCheck", () =>
          getWorkerEnv().env.MONITOR_EXEC.executeCheck(monitor.id),
        )

        return new MessageResponse({ message: "Executed check" })
      }),
    )
    .handle("pause", ({ params }) =>
      attempt("pauseMonitor", () => getWorkerEnv().env.MONITOR_TRIGGER_RPC.pauseDo(params.id)).pipe(
        Effect.as(new MessageResponse({ message: "Paused monitor" })),
      ),
    )
    .handle("resume", ({ params }) =>
      Effect.gen(function* () {
        const { env } = getWorkerEnv()
        const monitor = yield* findMonitor(params.id)

        const resumed = yield* Effect.tryPromise({
          try: async () => {
            await env.MONITOR_TRIGGER_RPC.updateCheckInterval(monitor.id, monitor.checkInterval)
            await env.MONITOR_TRIGGER_RPC.resumeDo(monitor.id)

            return true
          },
          catch: (cause) => cause,
        }).pipe(
          // RPC wraps the error in a string, so match the error name. A trigger that was never
          // initialized is created here instead.
          Effect.catch((cause) =>
            getErrorMessage(cause).includes(MonitorTriggerNotInitializedError.NAME)
              ? Effect.succeed(false)
              : Effect.fail(
                  new InternalServerError({
                    message: `resumeMonitor: ${getErrorMessage(cause)}`,
                  }),
                ),
          ),
        )

        if (!resumed) {
          yield* Effect.logInfo(`Monitor trigger ${monitor.id} was not initialized; initializing`)
          yield* attempt("initMonitorTrigger", () =>
            env.MONITOR_TRIGGER_RPC.init({
              monitorId: monitor.id,
              monitorType: "endpoint",
              checkInterval: monitor.checkInterval,
            }),
          )
        }

        return new MessageResponse({ message: "Resumed monitor" })
      }),
    )
    .handle("latestCheck", ({ params }) =>
      attempt("latestCheck", () =>
        database()
          .select()
          .from(UptimeChecksTable)
          .where(eq(UptimeChecksTable.endpointMonitorId, params.id))
          .orderBy(desc(UptimeChecksTable.timestamp))
          .limit(1)
          .then(takeFirstOrNull),
      ).pipe(Effect.map((row) => (row ? toCheck(row) : null))),
    )
    .handle("recentLatency", ({ params, query }) =>
      attempt("recentLatency", () =>
        database()
          .select()
          .from(UptimeChecksTable)
          .where(
            and(
              eq(UptimeChecksTable.endpointMonitorId, params.id),
              isNotNull(UptimeChecksTable.responseTime),
            ),
          )
          .orderBy(desc(UptimeChecksTable.timestamp))
          .limit(query.limit ?? DEFAULT_LATENCY_LIMIT),
      ).pipe(Effect.map((rows) => rows.toReversed().map(toCheck))),
    )
    .handle("uptimeRange", ({ params, query }) =>
      attempt("uptimeRange", () =>
        database()
          .select()
          .from(UptimeChecksTable)
          .where(
            and(
              eq(UptimeChecksTable.endpointMonitorId, params.id),
              gt(UptimeChecksTable.timestamp, rangeStart(query.range ?? "1h", new Date())),
            ),
          )
          .orderBy(UptimeChecksTable.timestamp),
      ).pipe(Effect.map((rows) => rows.map(toCheck))),
    ),
)

const InfraHandlers = HttpApiBuilder.group(Api, "infra", (handlers) =>
  handlers.handle("metadata", () => {
    const { env } = getWorkerEnv()

    return Effect.succeed(
      new InfraMetadata({
        cloudflareAccountId: env.CLOUDFLARE_ACCOUNT_ID,
        monitorExecName: env.MONITOR_EXEC_NAME,
        monitorTriggerName: env.MONITOR_TRIGGER_NAME,
      }),
    )
  }),
)

export const ApiHandlersLive = Layer.mergeAll(EndpointMonitorHandlers, InfraHandlers)
