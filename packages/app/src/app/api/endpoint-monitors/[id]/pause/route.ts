import { getWorkerEnv } from "@/lib/worker-env"
import { StatusCodes } from "http-status-codes"
import { NextResponse } from "@/lib/http"
import { createRoute } from "@/lib/api-utils"
import { idStringParamsSchema } from "@/lib/route-schemas"

export const POST = createRoute.params(idStringParamsSchema).handler(async (_request, context) => {
  const { env } = getWorkerEnv()
  await env.MONITOR_TRIGGER_RPC.pauseDo(context.params.id)

  return NextResponse.json({ message: "Paused Monitor DO" }, { status: StatusCodes.OK })
})
