/* oxlint-disable no-console -- One cache-status line, with no request or credential text. */
import { createHmac } from "node:crypto"
import type { Experimental_DecisionModel } from "ai"
import { gatewayCache, measuredTokens, recordAiUsage, type AiUsage } from "./ai-usage"

type ClefDecisionModel = Exclude<Experimental_DecisionModel, string>
type DecideOptions = Parameters<Extract<ClefDecisionModel, { doDecide: unknown }>["doDecide"]>[0]
type DecideResult = Awaited<
  ReturnType<Extract<ClefDecisionModel, { doDecide: unknown }>["doDecide"]>
>

const modelId = "@cf/cloudflare/clef"

type ClefAnswer = {
  type: string
  choice?: string
  probabilities?: Record<string, number>
}

type ClefResult = {
  answers?: Record<string, ClefAnswer>
  usage?: { input_tokens?: number; output_tokens?: number }
}

/**
 * AI SDK decision model for Cloudflare Clef through Cloudflare AI Gateway.
 * The test filter asks boolean questions. Clef answers them as a true/false choice.
 * Callers must not print the gateway token.
 */
export function createClefDecisionModel(): ClefDecisionModel {
  return {
    specificationVersion: "v4",
    provider: "cloudflare-ai-gateway",
    modelId,
    supportedQuestionTypes: ["boolean"],
    async doDecide(options) {
      return decideWithClef(options)
    },
  }
}

async function decideWithClef(options: DecideOptions): Promise<DecideResult> {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID
  const token = process.env.CF_AI_GATEWAY_E2E_TOKEN
  const gateway = process.env.CF_AI_GATEWAY_E2E_ID ?? "default"
  if (!account || !token) {
    throw new Error(
      "Set CLOUDFLARE_ACCOUNT_ID and CF_AI_GATEWAY_E2E_TOKEN for the Clef decision filter.",
    )
  }
  if (!/^[a-f0-9]{32}$/i.test(account) || !/^[a-zA-Z0-9_-]+$/.test(gateway)) {
    throw new Error("Invalid Cloudflare account or gateway identifier.")
  }

  const questions: Record<
    string,
    { type: "choice"; instructions: string; criteria: { true: string; false: string } }
  > = {}
  for (const [id, question] of Object.entries(options.questions)) {
    if (question.type !== "boolean") {
      throw new Error(`Clef decision filter model answers boolean questions, got ${question.type}.`)
    }
    const trueText = inputText(question.criteria?.true) || "The statement holds."
    const falseText = inputText(question.criteria?.false) || "The statement does not hold."
    questions[id] = {
      type: "choice",
      instructions: inputText(question.instructions),
      criteria: { true: trueText, false: falseText },
    }
  }

  const body = JSON.stringify({
    model: "clef",
    state: clefState(options.state),
    questions,
  })
  const response = await postClef(account, gateway, token, body, options.abortSignal)
  // SAFETY: The gateway body is Clef's Workers AI envelope. `result.answers` is checked before use.
  const envelope = (await response.json()) as { success?: boolean; result?: ClefResult }
  if (envelope.success === false || envelope.result?.answers === undefined) {
    throw new Error("Cloudflare Clef returned no decision result.")
  }

  const answers: DecideResult["answers"] = {}
  for (const id of Object.keys(questions)) {
    const answer = envelope.result.answers[id]
    const probability = answer?.probabilities?.true
    if (
      answer?.type !== "choice" ||
      (answer.choice !== "true" && answer.choice !== "false") ||
      probability === undefined ||
      !Number.isFinite(probability) ||
      probability < 0 ||
      probability > 1
    ) {
      throw new Error("Clef returned an invalid boolean decision.")
    }
    answers[id] = { type: "boolean", probability }
  }

  const inputTokens = finiteToken(envelope.result.usage?.input_tokens)
  const outputTokens = finiteToken(envelope.result.usage?.output_tokens)
  return {
    answers,
    warnings: [],
    ...(inputTokens === undefined && outputTokens === undefined
      ? {}
      : {
          usage: {
            ...(inputTokens === undefined ? {} : { inputTokens }),
            ...(outputTokens === undefined ? {} : { outputTokens }),
          },
        }),
    response: { modelId },
  }
}

async function postClef(
  account: string,
  gateway: string,
  token: string,
  body: string,
  abortSignal: AbortSignal | undefined,
): Promise<Response> {
  const bypass = process.env.CF_AI_GATEWAY_E2E_SKIP_CACHE === "1"
  const cacheKey = `e2e-clef-${createHmac("sha256", token)
    .update(JSON.stringify([account, gateway, modelId, body]))
    .digest("hex")}`
  let lastStatus = 0
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const startedAt = new Date().toISOString()
    let cache: AiUsage["cache"] = bypass ? "bypass" : "unknown"
    let status: AiUsage["status"] = "error"
    let httpStatus: number | null = null
    let usage: ClefResult["usage"] | undefined
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${modelId}`,
        {
          method: "POST",
          signal: abortSignal,
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
            "cf-aig-gateway-id": gateway,
            "cf-aig-authorization": `Bearer ${token}`,
            "cf-aig-cache-ttl": "3600",
            "cf-aig-cache-key": cacheKey,
            "cf-aig-skip-cache": bypass ? "true" : "false",
          },
          body,
        },
      )
      httpStatus = response.status
      cache = gatewayCache(response.headers, bypass)
      if (response.ok) {
        status = "success"
        usage = await readUsage(response)
        console.error(`Clef decision gateway cache: ${cache}`)
        return response
      }
      lastStatus = response.status
      await response.body?.cancel()
      if (attempt < 2 && (response.status === 429 || response.status >= 500)) {
        await delay(500 * 2 ** attempt, abortSignal)
        continue
      }
      break
    } finally {
      recordAiUsage({
        schemaVersion: 1,
        source: "decision",
        model: modelId,
        cache,
        cacheLayer: "gateway",
        requests: 1,
        operations: 0,
        inputTokens: measuredTokens(usage?.input_tokens),
        outputTokens: measuredTokens(usage?.output_tokens),
        cachedInputTokens: null,
        status,
        httpStatus,
        startedAt,
      })
    }
  }
  throw new Error(`Cloudflare Clef request failed (HTTP ${lastStatus}).`)
}

async function readUsage(response: Response): Promise<ClefResult["usage"] | undefined> {
  const body: unknown = await response
    .clone()
    .json()
    .catch(() => undefined)
  // SAFETY: Usage is optional accounting data. Callers ignore a missing result.
  const payload = body as { result?: ClefResult } | undefined
  return payload?.result?.usage
}

function clefState(state: DecideOptions["state"]): unknown {
  const json = state.filter((part) => part.type === "json")
  if (json.length === 1) return json[0]?.value
  const parts: unknown[] = []
  for (const part of state) {
    if (part.type === "text") parts.push({ type: "text", text: part.text })
    else if (part.type === "json") parts.push({ type: "json", value: part.value })
  }
  return { parts }
}

function inputText(value: unknown): string {
  if (typeof value === "string") return value
  if (value === undefined || value === null) return ""
  return JSON.stringify(value)
}

function finiteToken(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined
}

function delay(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer)
        reject(signal.reason)
      },
      { once: true },
    )
  })
}
