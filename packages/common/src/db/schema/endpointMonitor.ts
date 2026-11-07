import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { timestamps } from "./utils"

export const EndpointMonitorsTable = sqliteTable("endpointMonitors", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  name: text("name").notNull(),
  checkInterval: integer("checkInterval").notNull(),
  isRunning: integer("isRunning", { mode: "boolean" }).notNull().default(true),
  expectedStatusCode: integer("expectedStatusCode"),
  consecutiveFailures: integer("consecutiveFailures").notNull().default(0),
  alertThreshold: integer("alertThreshold").notNull().default(2),
  activeAlert: integer("activeAlert", { mode: "boolean" }).notNull().default(false),

  ...timestamps,
})

export const UptimeChecksTable = sqliteTable("uptimeChecks", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  endpointMonitorId: text("endpointMonitorId")
    .notNull()
    .references(() => EndpointMonitorsTable.id, { onDelete: "cascade" }),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
  status: integer("status"),
  responseTime: integer("responseTime"),
  isExpectedStatus: integer("isExpectedStatus", { mode: "boolean" }).notNull(),
})

export type EndpointMonitorRow = typeof EndpointMonitorsTable.$inferSelect

export type EndpointMonitorPatch = Partial<Omit<typeof EndpointMonitorsTable.$inferInsert, "id">>
