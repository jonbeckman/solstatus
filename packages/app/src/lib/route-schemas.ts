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
