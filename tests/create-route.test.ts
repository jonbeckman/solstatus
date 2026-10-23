import { afterEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"
import { createRoute } from "../packages/app/src/lib/api-utils"

const paramsSchema = z.object({ id: z.string() })
const querySchema = z.object({ limit: z.coerce.number() })
const bodySchema = z.object({ name: z.string() })

function jsonHandler() {
  return async (_request: Request, context: { params: any; query: any; body: any }) =>
    Response.json({
      params: context.params,
      query: context.query,
      body: context.body ?? null,
    })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("createRoute", () => {
  it("runs a handler with empty params, query, and body", async () => {
    const handler = createRoute.handler(jsonHandler())
    const response = await handler(new Request("http://localhost/api"))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ params: {}, query: {}, body: null })
  })

  it("parses params", async () => {
    const handler = createRoute.params(paramsSchema).handler(jsonHandler())
    const response = await handler(new Request("http://localhost/api"), {
      params: { id: "endp_1" },
    })
    expect(await response.json()).toEqual({
      params: { id: "endp_1" },
      query: {},
      body: null,
    })
  })

  it("parses params and a JSON body", async () => {
    const handler = createRoute.params(paramsSchema).body(bodySchema).handler(jsonHandler())
    const response = await handler(
      new Request("http://localhost/api", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "status" }),
      }),
      { params: { id: "endp_1" } },
    )
    expect(await response.json()).toEqual({
      params: { id: "endp_1" },
      query: {},
      body: { name: "status" },
    })
  })

  it("parses params and query", async () => {
    const handler = createRoute.params(paramsSchema).query(querySchema).handler(jsonHandler())
    const response = await handler(new Request("http://localhost/api?limit=30"), {
      params: { id: "endp_1" },
    })
    expect(await response.json()).toEqual({
      params: { id: "endp_1" },
      query: { limit: 30 },
      body: null,
    })
  })

  it("parses query alone", async () => {
    const handler = createRoute.query(querySchema).handler(jsonHandler())
    const response = await handler(new Request("http://localhost/api?limit=10"))
    expect(await response.json()).toEqual({
      params: {},
      query: { limit: 10 },
      body: null,
    })
  })

  it("parses a JSON body alone", async () => {
    const handler = createRoute.body(bodySchema).handler(jsonHandler())
    const response = await handler(
      new Request("http://localhost/api", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "new" }),
      }),
    )
    expect(await response.json()).toEqual({
      params: {},
      query: {},
      body: { name: "new" },
    })
  })

  it("parses params, then query, then body", async () => {
    const handler = createRoute
      .params(paramsSchema)
      .query(querySchema)
      .body(bodySchema)
      .handler(jsonHandler())
    const response = await handler(
      new Request("http://localhost/api?limit=2", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "both" }),
      }),
      { params: { id: "endp_1" } },
    )
    expect(await response.json()).toEqual({
      params: { id: "endp_1" },
      query: { limit: 2 },
      body: { name: "both" },
    })
  })

  it("parses a body schema placed before query", async () => {
    const handler = createRoute.body(bodySchema).query(querySchema).handler(jsonHandler())
    const response = await handler(
      new Request("http://localhost/api?limit=4", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "ordered" }),
      }),
    )
    expect(await response.json()).toEqual({
      params: {},
      query: { limit: 4 },
      body: { name: "ordered" },
    })
  })

  it("does not read a JSON body for GET", async () => {
    const handler = createRoute.body(bodySchema).handler(jsonHandler())
    const response = await handler(new Request("http://localhost/api"))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ params: {}, query: {}, body: null })
  })

  it("returns 500 when params do not match the schema", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const handler = createRoute.params(paramsSchema).handler(jsonHandler())
    const response = await handler(new Request("http://localhost/api"), { params: {} })
    expect(response.status).toBe(500)
    const body = z
      .object({ message: z.literal("Internal Server Error"), error: z.string() })
      .parse(await response.json())
    expect(body.error.length).toBeGreaterThan(0)
  })
})
