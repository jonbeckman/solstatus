import { logError, logErrorStack } from "@solstatus/common/utils"
import { ReasonPhrases, StatusCodes } from "http-status-codes"
import type { z } from "zod"

type RouteContext = {
  params: any
  query: any
  body: any
}

type RouteHandler = (request: Request, context: RouteContext) => Promise<Response> | Response

function handleServerError(error: unknown) {
  const err = error instanceof Error ? error : new Error(String(error))
  const errorMessage = logError(err)
  logErrorStack(err)
  return new Response(
    JSON.stringify({
      message: ReasonPhrases.INTERNAL_SERVER_ERROR,
      error: errorMessage,
    }),
    { status: StatusCodes.INTERNAL_SERVER_ERROR },
  )
}

function parseSearchParams(request: Request) {
  const url = new URL(request.url)
  const raw: Record<string, string> = {}
  for (const [key, value] of url.searchParams.entries()) {
    raw[key] = value
  }
  return raw
}

function makeHandler(options: {
  params?: z.ZodType<any>
  query?: z.ZodType<any>
  body?: z.ZodType<any>
  handler: RouteHandler
}) {
  return async (request: Request, routeContext: { params?: Record<string, string> } = {}) => {
    try {
      const params = options.params
        ? options.params.parse(routeContext.params ?? {})
        : (routeContext.params ?? {})
      const query = options.query ? options.query.parse(parseSearchParams(request)) : {}
      let body: unknown
      if (options.body && request.method !== "GET" && request.method !== "HEAD") {
        body = options.body.parse(await request.json())
      }
      return await options.handler(request, { params, query, body })
    } catch (error) {
      return handleServerError(error)
    }
  }
}

type RouteSchemas = {
  params?: z.ZodType<any>
  query?: z.ZodType<any>
  body?: z.ZodType<any>
}

type RouteBuilder = {
  params: (schema: z.ZodType<any>) => RouteBuilder
  query: (schema: z.ZodType<any>) => RouteBuilder
  body: (schema: z.ZodType<any>) => RouteBuilder
  handler: (handler: RouteHandler) => ReturnType<typeof makeHandler>
}

function routeBuilder(schemas: RouteSchemas): RouteBuilder {
  return {
    params(schema) {
      return routeBuilder({ ...schemas, params: schema })
    },
    query(schema) {
      return routeBuilder({ ...schemas, query: schema })
    },
    body(schema) {
      return routeBuilder({ ...schemas, body: schema })
    },
    handler(handler) {
      return makeHandler({ ...schemas, handler })
    },
  }
}

export const createRoute = routeBuilder({})
