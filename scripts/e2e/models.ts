import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI } from "@ai-sdk/openai"
import { createTypeSafeAi } from "@ai-sdk/typesafe-ai"
import * as P from "effect/Predicate"

// Shared Project DNA: every SolZero repository keeps this file identical.
// E2E_DECISION_MODEL and E2E_LANGUAGE_MODEL are SolZeroAI organization Actions
// variables, so CI changes models for the fleet in one place. The defaults
// below serve local runs and must match the DNA page.
const DEFAULT_DECISION_MODEL = "@cf/cloudflare/clef"
const DEFAULT_LANGUAGE_MODEL = "anthropic/claude-haiku-5.5"

/**
 * Official AI SDK providers pointed at the Cloudflare AI Gateway REST API.
 *
 * The decision model answers agent.act actions, agent.assert verdicts and the
 * affected-test filter. The language model writes text: field values,
 * agent.waitFor and agent.extract.
 *
 * Gateway response caching stays off. It stores any 200 body, including an
 * answer the runner rejects, and replays it to the retry and to every CI run
 * inside the TTL. Verified e2e action replay is the only cache.
 */
export function e2eModels(options: { accountId: string; gatewayId: string; token: string }) {
  const account = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(options.accountId)}`

  const headers = {
    "cf-aig-gateway-id": options.gatewayId,
    "cf-aig-skip-cache": "true",
    "cf-aig-max-attempts": "3",
    "cf-aig-backoff": "exponential",
  }

  const anthropic = createAnthropic({
    baseURL: `${account}/ai/v1`,
    authToken: options.token,
    headers,
  })

  const openai = createOpenAI({ baseURL: `${account}/ai/v1`, apiKey: options.token, headers })

  // Clef speaks the TypeSafe System One protocol. Workers AI serves it at
  // /ai/run/<model> instead of /systemone, wraps the answer in
  // { success, result }, and takes at most 64 questions per call.
  const clef = (modelId: string) =>
    createTypeSafeAi({
      baseURL: `${account}/ai/run`,
      apiKey: options.token,
      headers,
      fetch: async (input, init) => {
        const url = String(input).replace(/\/systemone$/, `/${modelId}`)
        const bodies = questionBatches(init?.body)

        if (bodies.length === 1) return clefCall(url, init)

        return mergeAnswers(
          await Promise.all(bodies.map((body) => clefCall(url, { ...init, body }))),
        )
      },
    }).decisionModel(modelId.slice(modelId.lastIndexOf("/") + 1))

  const decisionModelId = process.env.E2E_DECISION_MODEL || DEFAULT_DECISION_MODEL
  const languageModelId = process.env.E2E_LANGUAGE_MODEL || DEFAULT_LANGUAGE_MODEL

  if (
    !decisionModelId.startsWith("@cf/cloudflare/clef") &&
    !decisionModelId.startsWith("anthropic/")
  )
    throw new Error(
      `E2E_DECISION_MODEL must name a Cloudflare Clef model or an anthropic/ model, not ${decisionModelId}.`,
    )

  return {
    decisionModel: decisionModelId.startsWith("anthropic/")
      ? anthropic.decisionModel(decisionModelId)
      : clef(decisionModelId),
    languageModel: languageModelId.startsWith("anthropic/")
      ? anthropic(languageModelId)
      : openai.chat(languageModelId),
  }
}

/** Workers AI rejects a Clef call that asks more questions than this. */
const CLEF_MAX_QUESTIONS = 64

/**
 * The request body split into calls of at most CLEF_MAX_QUESTIONS questions,
 * each with the same state. The affected-test filter asks up to 200 at once.
 */
function questionBatches(body: RequestInit["body"]) {
  if (!P.isString(body)) return [body]

  const request: unknown = JSON.parse(body)

  if (!P.isObject(request) || !P.isObject(request.questions)) return [body]

  const questions = Object.entries(request.questions)

  if (questions.length <= CLEF_MAX_QUESTIONS) return [body]

  return Array.from({ length: Math.ceil(questions.length / CLEF_MAX_QUESTIONS) }, (_, batch) =>
    JSON.stringify({
      ...request,
      questions: Object.fromEntries(
        questions.slice(batch * CLEF_MAX_QUESTIONS, (batch + 1) * CLEF_MAX_QUESTIONS),
      ),
    }),
  )
}

async function clefCall(url: string, init: RequestInit | undefined) {
  const response = await fetch(url, init)

  if (!response.ok) return cloudflareFailure(response)

  // SAFETY: Workers AI wraps every successful /ai/run answer as
  // { success, result }. The TypeSafe provider validates `result`.
  const { result } = (await response.json()) as { result: unknown }

  return Response.json(result, { status: response.status })
}

/**
 * The batches' answers as one: the first failure, or every answer with the
 * token usage summed. Usage stays unknown when any batch leaves it out.
 */
async function mergeAnswers(responses: ReadonlyArray<Response>) {
  const failure = responses.find((response) => !response.ok)

  if (failure !== undefined) return failure

  // SAFETY: clefCall returned each body unwrapped from a successful answer.
  // The TypeSafe provider validates the merged answer.
  const results = (await Promise.all(
    responses.map((response) => response.json()),
  )) as ReadonlyArray<{
    readonly model?: string
    readonly answers: Readonly<Record<string, { readonly type: string }>>
    readonly usage?: { readonly input_tokens?: number; readonly output_tokens?: number }
  }>

  const total = (key: "input_tokens" | "output_tokens") =>
    results.every((result) => P.isNumber(result.usage?.[key]))
      ? results.reduce((sum, result) => sum + (result.usage?.[key] ?? 0), 0)
      : null

  return Response.json({
    model: results[0]?.model,
    answers: Object.fromEntries(results.flatMap((result) => Object.entries(result.answers))),
    usage: { input_tokens: total("input_tokens"), output_tokens: total("output_tokens") },
  })
}

/**
 * Cloudflare names a failure in { errors: [{ code, message }] }. The TypeSafe
 * provider reads only a top-level `message`, so without this every failure
 * reads "TypeSafe request failed" and its reason is lost.
 */
async function cloudflareFailure(response: Response) {
  const body: unknown = await response
    .clone()
    .json()
    .catch(() => undefined)

  if (P.isObject(body) && P.isString(body.message)) return response

  const errors: ReadonlyArray<unknown> = P.isObject(body)
    ? [body.errors, body.error].flatMap((list) => (Array.isArray(list) ? list : []))
    : []

  const reasons = errors.flatMap((error) =>
    P.isObject(error) && P.isString(error.message)
      ? [P.isNumber(error.code) ? `${error.code}: ${error.message}` : error.message]
      : [],
  )

  const reason = reasons.length === 0 ? response.statusText : reasons.join("; ")

  return Response.json(
    { message: `Cloudflare ${response.status}: ${reason}` },
    { status: response.status, statusText: response.statusText },
  )
}
