import { createSchemaFactory } from "drizzle-orm/zod"
import { z } from "zod"
import { EndpointMonitorsTable, UptimeChecksTable } from "./schema"

const { createInsertSchema, createSelectSchema } = createSchemaFactory({
  coerce: {
    date: true,
  },
})

export const endpointMonitorsInsertSchema = createInsertSchema(EndpointMonitorsTable, {
  url: (schema) => schema.url(),
  expectedStatusCode: z.number().positive().int().optional(),
  alertThreshold: z.number().positive().int(),
}).omit({
  createdAt: true,
  updatedAt: true,
})

export const endpointMonitorsInsertDTOSchema = endpointMonitorsInsertSchema.omit({
  id: true,
})

export const endpointMonitorsSelectSchema = createSelectSchema(EndpointMonitorsTable)

export const endpointMonitorsPatchSchema = createInsertSchema(EndpointMonitorsTable).partial()

export const uptimeChecksInsertSchema = createInsertSchema(UptimeChecksTable).omit({
  id: true,
})

export const uptimeChecksSelectSchema = createSelectSchema(UptimeChecksTable)
