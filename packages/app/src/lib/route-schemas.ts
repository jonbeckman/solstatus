import { z } from "zod"

export const idStringParamsSchema = z.object({
  id: z.string(),
})

export const paginationQuerySchema = (orderBy = "createdAt", order: "asc" | "desc" = "desc") =>
  z.object({
    pageSize: z.coerce.number().optional().default(10),
    page: z.coerce.number().optional().default(0),
    orderBy: z.string().optional().default(orderBy),
    order: z.enum(["asc", "desc"]).optional().default(order),
  })

export const endpointMonitorsListQuerySchema = paginationQuerySchema().extend({
  search: z.string().optional(),
  isRunning: z.string().optional(),
  checkIntervalMin: z.number().optional(),
  checkIntervalMax: z.number().optional(),
})

export const uptimeLimitQuerySchema = z.object({
  limit: z.coerce.number().optional().default(30),
})

export const uptimeRangeQuerySchema = z.object({
  range: z.enum(["30m", "1h", "3h", "6h", "1d", "2d", "7d"]).default("1h"),
})
