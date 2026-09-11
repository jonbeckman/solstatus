import { getWorkerEnv } from "@/lib/worker-env"
import {
  endpointMonitorsPatchSchema,
  type endpointMonitorsSelectSchema,
  takeUniqueOrThrow,
  useDrizzle,
} from "@solstatus/common/db"
import { EndpointMonitorsTable } from "@solstatus/common/db/schema"
import { eq } from "drizzle-orm"
import { ReasonPhrases, StatusCodes } from "http-status-codes"
import { NextResponse } from "@/lib/http"
import type { z } from "zod"
import { createRoute } from "@/lib/api-utils"
import { idStringParamsSchema } from "@/lib/route-schemas"

export const GET = createRoute.params(idStringParamsSchema).handler(async (_request, context) => {
  const { env } = getWorkerEnv()
  const db = useDrizzle(env.DB)

  let endpointMonitor: z.infer<typeof endpointMonitorsSelectSchema> | undefined
  try {
    endpointMonitor = await db
      .select()
      .from(EndpointMonitorsTable)
      .where(eq(EndpointMonitorsTable.id, context.params.id))
      .then((rows) => rows[0])
  } catch (error) {
    console.error("Error fetching endpointMonitor: ", error)
    return NextResponse.json(
      { error: "Failed to fetch endpointMonitor" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR },
    )
  }

  if (!endpointMonitor) {
    return NextResponse.json(
      { message: ReasonPhrases.NOT_FOUND },
      { status: StatusCodes.NOT_FOUND },
    )
  }

  return NextResponse.json(endpointMonitor)
})

export const PATCH = createRoute
  .params(idStringParamsSchema)
  .body(endpointMonitorsPatchSchema)
  .handler(async (_request, context) => {
    const { env } = getWorkerEnv()
    const db = useDrizzle(env.DB)

    const endpointMonitor: z.infer<typeof endpointMonitorsPatchSchema> = context.body
    let updatedWebsite: z.infer<typeof endpointMonitorsSelectSchema> | undefined | null
    try {
      updatedWebsite = await db
        .update(EndpointMonitorsTable)
        .set(endpointMonitor)
        .where(eq(EndpointMonitorsTable.id, context.params.id))
        .returning()
        .then(takeUniqueOrThrow)
    } catch (error) {
      console.error("Error updating endpointMonitor: ", error)
      return NextResponse.json(
        { error: "Failed to update endpointMonitor" },
        { status: StatusCodes.INTERNAL_SERVER_ERROR },
      )
    }

    if (!updatedWebsite) {
      return NextResponse.json(
        {
          message: ReasonPhrases.NOT_FOUND,
        },
        { status: StatusCodes.NOT_FOUND },
      )
    }

    console.log(
      `Updating check interval for [${updatedWebsite.id}] to [${updatedWebsite.checkInterval}]`,
    )
    await env.MONITOR_TRIGGER_RPC.updateCheckInterval(
      updatedWebsite.id,
      updatedWebsite.checkInterval,
    )

    return NextResponse.json(updatedWebsite, { status: StatusCodes.OK })
  })

export const DELETE = createRoute
  .params(idStringParamsSchema)
  .handler(async (_request, context) => {
    const { env } = getWorkerEnv()
    const db = useDrizzle(env.DB)

    try {
      await db.delete(EndpointMonitorsTable).where(eq(EndpointMonitorsTable.id, context.params.id))

      await env.MONITOR_TRIGGER_RPC.deleteDo(context.params.id)
    } catch (error) {
      console.error("Error deleting endpointMonitor: ", error)
      return NextResponse.json(
        { error: "Failed to delete endpointMonitor" },
        { status: StatusCodes.INTERNAL_SERVER_ERROR },
      )
    }

    return new NextResponse(null, {
      status: 204,
    })
  })
