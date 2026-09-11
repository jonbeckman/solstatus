import { getWorkerEnv } from "@/lib/worker-env"
import { takeUniqueOrThrow, useDrizzle } from "@solstatus/common/db"
import { EndpointMonitorsTable } from "@solstatus/common/db/schema"
import { eq } from "drizzle-orm"
import { StatusCodes } from "http-status-codes"
import { NextResponse } from "@/lib/http"
import { createRoute } from "@/lib/api-utils"
import { idStringParamsSchema } from "@/lib/route-schemas"

export const GET = createRoute.params(idStringParamsSchema).handler(async (_request, context) => {
  const { env } = getWorkerEnv()
  const db = useDrizzle(env.DB)
  const endpointMonitor = await db
    .select()
    .from(EndpointMonitorsTable)
    .where(eq(EndpointMonitorsTable.id, context.params.id))
    .then(takeUniqueOrThrow)

  return NextResponse.json({ status: endpointMonitor.isRunning }, { status: StatusCodes.OK })
})
