import { ReasonPhrases, StatusCodes } from "http-status-codes"
import { auth } from "@/lib/auth"
import { handleApiRequest } from "@/server/api"

function isBetterAuthPath(pathname: string) {
  return pathname === "/api/auth" || pathname.startsWith("/api/auth/")
}

// Better Auth owns /api/auth. Every other /api request needs a session, then goes to the
// Effect HttpApi in src/server/api.
export async function dispatchApi(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url)

  if (isBetterAuthPath(pathname)) {
    return auth.handler(request)
  }

  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    return Response.json(
      { message: ReasonPhrases.UNAUTHORIZED },
      { status: StatusCodes.UNAUTHORIZED },
    )
  }

  return handleApiRequest(request)
}
