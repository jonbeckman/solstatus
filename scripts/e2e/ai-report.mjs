import { appendFile, chmod, mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import { execFileSync } from "node:child_process"
import { join } from "node:path"
import { createHash } from "node:crypto"

// Never propagate report labels, prompts, response bodies or arbitrary log fields.
const directory = ".e2e/ai-usage"
const sources = new Set(["executor", "application", "stagehand"])
const models = new Map([
  ["@cf/cloudflare/clef", { input: 0.24, output: 0 }],
  ["@cf/openai/gpt-oss-120b", { input: 0.35, output: 0.75 }],
  ["@cf/openai/gpt-oss-20b", { input: 0.2, output: 0.3 }],
  ["google/gemini-3-flash-preview", { input: 0.5, output: 3, cached: 0.05 }],
  ["unknown", null],
])
const cacheModes = new Set(["hit", "miss", "bypass", "unknown"])
const layers = new Set(["gateway", "stagehand", "none"])
const replayReasons = new Set([
  "retry",
  "no-entry",
  "invalid-entry",
  "truncated",
  "wrong-context",
  "target-not-found",
  "target-ambiguous",
  "gap",
  "action-failed",
  "action-uncertain",
  "viewport-changed",
  "end-mismatch",
])
const reportPaths = [
  ".e2e/report.json",
  ".e2e/lifecycle/report.json",
  ".e2e/cleanup-proof/report.json",
  ...["os-web", "gtt-web", "solzero-web", "x-activity", "tools"].map(
    (app) => `.e2e/${app}/report.json`,
  ),
]
const countNames = [
  "discovered",
  "selected",
  "executed",
  "passed",
  "failed",
  "interrupted",
  "flaky",
  "skipped",
]
const numeric = (value) => Number.isSafeInteger(value) && value >= 0
const nullable = (value) => value === null || numeric(value)
const timestamp = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) &&
  Number.isFinite(Date.parse(value))
const sha = (value) => (typeof value === "string" && /^[a-f0-9]{40}$/.test(value) ? value : null)
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"))

async function logs() {
  const names = await readdir(".e2e/logs").catch(() => [])
  return names
    .filter((name) => /^[a-zA-Z0-9_.-]{1,100}\.log$/.test(name))
    .map((name) => join(".e2e/logs", name))
}

const digest = (buffer) => createHash("sha256").update(buffer).digest("hex")
async function privateWrite(name, content) {
  const path = `${directory}/${name}`
  await writeFile(path, content, { mode: 0o600 })
  await chmod(path, 0o600)
}

async function init() {
  await mkdir(directory, { recursive: true, mode: 0o700 })
  await chmod(directory, 0o700)
  const logOffsets = {},
    logPrefixes = {}
  for (const path of await logs()) {
    const buffer = await readFile(path)
    logOffsets[path] = buffer.length
    logPrefixes[path] = digest(buffer)
  }
  let commit = null
  try {
    commit = sha(
      execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim(),
    )
  } catch {}
  await privateWrite(
    "run.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        startedAt: new Date().toISOString(),
        validatedSha: commit,
        logOffsets,
        logPrefixes,
        replayCacheRestored: ["true", "false"].includes(process.env.E2E_ACTION_CACHE_RESTORED)
          ? process.env.E2E_ACTION_CACHE_RESTORED === "true"
          : null,
      },
      null,
      2,
    ) + "\n",
  )
  await privateWrite("executor.jsonl", "")
  // Old output must not be published when this run fails before summarization.
  await Promise.all(["summary.json", "summary.md"].map((name) => privateWrite(name, "")))
}

function record(value, start) {
  if (
    !value ||
    value.schemaVersion !== 1 ||
    !sources.has(value.source) ||
    !models.has(value.model) ||
    !cacheModes.has(value.cache) ||
    !layers.has(value.cacheLayer) ||
    !nullable(value.requests) ||
    !numeric(value.operations) ||
    !nullable(value.inputTokens) ||
    !nullable(value.outputTokens) ||
    !nullable(value.cachedInputTokens) ||
    !["success", "error"].includes(value.status) ||
    !(
      value.httpStatus === null ||
      (numeric(value.httpStatus) && value.httpStatus >= 100 && value.httpStatus <= 599)
    ) ||
    !timestamp(value.startedAt)
  )
    return null
  if (Date.parse(value.startedAt) < start) return "stale"
  if (
    value.cachedInputTokens !== null &&
    value.inputTokens !== null &&
    value.cachedInputTokens > value.inputTokens
  )
    return null
  return {
    source: value.source,
    model: value.model,
    cache: value.cache,
    cacheLayer: value.cacheLayer,
    requests: value.requests,
    operations: value.operations,
    inputTokens: value.inputTokens,
    outputTokens: value.outputTokens,
    cachedInputTokens: value.cachedInputTokens,
    status: value.status,
  }
}

function estimate(value) {
  if (value.cache === "hit") return { cost: 0, status: "zero" }
  const rate = models.get(value.model)
  if (!rate || value.inputTokens === null || (rate.output > 0 && value.outputTokens === null))
    return { cost: null, status: "unavailable" }
  // Gemini output usage already includes reasoning tokens. Never add them twice.
  const cached = rate.cached ? (value.cachedInputTokens ?? 0) : 0
  const cost =
    ((value.inputTokens - cached) * rate.input +
      cached * (rate.cached ?? 0) +
      (value.outputTokens ?? 0) * rate.output) /
    1_000_000
  return { cost, status: value.cache === "unknown" ? "upper-bound" : "estimated" }
}

async function summarize() {
  const metadata = await readJson(`${directory}/run.json`)
  if (metadata.schemaVersion !== 1 || !timestamp(metadata.startedAt))
    throw new Error("Run accounting was not initialized")
  const start = Date.parse(metadata.startedAt)
  const tests = Object.fromEntries(countNames.map((name) => [name, 0]))
  const replay = {
    steps: 0,
    actionSteps: 0,
    fullyReplayedSteps: 0,
    partiallyReplayedSteps: 0,
    missedSteps: 0,
    uncachedActionSteps: 0,
    liveJudgmentSteps: 0,
    notRecordedSteps: 0,
    replayedActions: 0,
    modelCalls: 0,
    reasons: {},
    durations: { actionMs: 0, replayedMs: 0, liveActionMs: 0 },
  }
  let e2eMs = 0,
    reports = 0,
    rejectedRecords = 0,
    staleRecords = 0
  let incomplete = false
  const collectSteps = (steps) => {
    for (const step of steps ?? []) {
      if (step.kind === "agent") {
        if (step.api === "agent.act") {
          replay.actionSteps += 1
          if (step.cache?.mode === "missed") replay.missedSteps += 1
          else if (!step.cache) replay.uncachedActionSteps += 1
          if (step.cache?.notRecorded === "param-collision") replay.notRecordedSteps += 1
          if (step.cache?.reason) {
            const reason = replayReasons.has(step.cache.reason) ? step.cache.reason : "unknown"
            replay.reasons[reason] = (replay.reasons[reason] ?? 0) + 1
          }
          const field = step.cache?.mode === "self-finalized" ? "replayedMs" : "liveActionMs"
          for (const key of ["actionMs", field]) {
            if (Number.isFinite(step.durationMs) && step.durationMs >= 0) {
              if (replay.durations[key] !== null) replay.durations[key] += step.durationMs
            } else replay.durations[key] = null
          }
        } else replay.liveJudgmentSteps += 1
      }
      if (["self-finalized", "agent-concluded"].includes(step.cache?.mode)) {
        replay.steps += 1
        if (step.cache.mode === "self-finalized") replay.fullyReplayedSteps += 1
        else replay.partiallyReplayedSteps += 1
        if (numeric(step.cache.replayedActions))
          replay.replayedActions += step.cache.replayedActions
      }
      if (numeric(step.metrics?.modelCalls)) replay.modelCalls += step.metrics.modelCalls
    }
  }
  for (const path of reportPaths) {
    let report
    try {
      report = await readJson(path)
    } catch {
      continue
    }
    const run = report?.run
    if (
      report?.schemaVersion !== "report-1" ||
      !timestamp(run?.startedAt) ||
      Date.parse(run.startedAt) < start
    )
      continue
    reports += 1
    if (timestamp(run.finishedAt) && Date.parse(run.finishedAt) >= Date.parse(run.startedAt))
      e2eMs += Date.parse(run.finishedAt) - Date.parse(run.startedAt)
    else incomplete = true
    for (const name of countNames) {
      if (numeric(run.summary?.[name]))
        tests[name] =
          name === "discovered"
            ? Math.max(tests[name], run.summary[name])
            : tests[name] + run.summary[name]
      else incomplete = true
    }
    for (const result of run.results ?? [])
      for (const attempt of result.attempts ?? []) collectSteps(attempt.steps)
    for (const group of run.serialGroups ?? [])
      for (const attempt of group.attempts ?? [])
        for (const member of attempt.members ?? []) collectSteps(member.steps)
  }
  const entries = []
  const parseLine = (line) => {
    if (!line.trim()) return
    let value
    try {
      value = record(JSON.parse(line), start)
    } catch {}
    if (value === "stale") staleRecords += 1
    else if (!value) rejectedRecords += 1
    else entries.push(value)
  }
  for (const line of (await readFile(`${directory}/executor.jsonl`, "utf8").catch(() => "")).split(
    "\n",
  ))
    parseLine(line)
  for (const path of await logs()) {
    const buffer = await readFile(path)
    const previous = metadata.logOffsets?.[path]
    const prefixMatches =
      numeric(previous) &&
      previous <= buffer.length &&
      metadata.logPrefixes?.[path] === digest(buffer.subarray(0, previous))
    const offset = prefixMatches ? previous : 0
    // Byte offsets exclude pre-init lines; timestamps also protect rotated/replaced logs.
    for (const line of buffer.subarray(offset).toString("utf8").split("\n")) {
      const marker = line.indexOf("E2E_AI_USAGE ")
      if (marker !== -1) parseLine(line.slice(marker + "E2E_AI_USAGE ".length))
    }
  }
  const recordedExecutorCalls = entries
    .filter((entry) => entry.source === "executor")
    .reduce((sum, entry) => sum + (entry.requests ?? 0), 0)
  const missingExecutorCalls = Math.max(0, replay.modelCalls - recordedExecutorCalls)
  if (missingExecutorCalls)
    entries.push({
      source: "executor",
      model: "unknown",
      cache: "unknown",
      cacheLayer: "none",
      requests: missingExecutorCalls,
      operations: 0,
      inputTokens: null,
      outputTokens: null,
      cachedInputTokens: null,
      status: "success",
    })
  const groups = new Map()
  for (const entry of entries) {
    const key = `${entry.source}:${entry.model}:${entry.cacheLayer}`
    if (!groups.has(key))
      groups.set(key, {
        source: entry.source,
        model: entry.model,
        cacheLayer: entry.cacheLayer,
        records: 0,
        requests: 0,
        operations: 0,
        cache: { hit: 0, miss: 0, bypass: 0, unknown: 0 },
        inputTokens: 0,
        outputTokens: 0,
        cachedInputTokens: 0,
        knownInputTokens: 0,
        knownOutputTokens: 0,
        knownCachedInputTokens: 0,
        errors: 0,
        missingUsage: 0,
        confirmedNonCachedRequests: 0,
        potentialNonCachedRequests: 0,
        confirmedNonCachedOperations: 0,
        potentialNonCachedOperations: 0,
        estimatedCostUsd: 0,
        knownCostUsd: 0,
        uncertainCostUsd: 0,
        costStatus: "complete",
        partial: false,
      })
    const group = groups.get(key)
    group.records += 1
    group.cache[entry.cache] += entry.requests ?? entry.operations
    group.operations += entry.operations
    for (const field of ["requests", "inputTokens", "outputTokens", "cachedInputTokens"]) {
      if (entry[field] === null) group[field] = null
      else if (group[field] !== null) group[field] += entry[field]
    }
    group.knownInputTokens += entry.inputTokens ?? 0
    group.knownOutputTokens += entry.outputTokens ?? 0
    group.knownCachedInputTokens += entry.cachedInputTokens ?? 0
    group.errors += Number(entry.status === "error")
    group.missingUsage += Number(entry.inputTokens === null || entry.outputTokens === null)
    if (["miss", "bypass"].includes(entry.cache)) {
      group.confirmedNonCachedRequests += entry.requests ?? 0
      group.confirmedNonCachedOperations += entry.operations
    } else if (entry.cache === "unknown") {
      group.potentialNonCachedRequests += entry.requests ?? 0
      group.potentialNonCachedOperations += entry.operations
    }
    const price = estimate(entry)
    if (price.status === "upper-bound") group.uncertainCostUsd += price.cost ?? 0
    else group.knownCostUsd += price.cost ?? 0
    if (price.cost === null) group.estimatedCostUsd = null
    else if (group.estimatedCostUsd !== null) group.estimatedCostUsd += price.cost
    if (price.status === "unavailable") group.costStatus = "partial"
    else if (price.status === "upper-bound" && group.costStatus !== "partial")
      group.costStatus = "upper-bound"
    group.partial ||= entry.cache === "unknown" || entry.requests === null || price.cost === null
  }
  const rows = [...groups.values()].sort((a, b) =>
    `${a.source}:${a.model}:${a.cacheLayer}`.localeCompare(
      `${b.source}:${b.model}:${b.cacheLayer}`,
    ),
  )
  const sum = (field) =>
    rows.some((row) => row[field] === null)
      ? null
      : rows.reduce((total, row) => total + row[field], 0)
  const partial =
    incomplete || reports === 0 || rejectedRecords > 0 || rows.some((row) => row.partial)
  const needsComment =
    rejectedRecords > 0 ||
    rows.some(
      (row) =>
        row.confirmedNonCachedRequests +
          row.potentialNonCachedRequests +
          row.confirmedNonCachedOperations +
          row.potentialNonCachedOperations >
        0,
    )
  const summary = {
    schemaVersion: 1,
    validatedSha: sha(metadata.validatedSha),
    needsComment,
    partial,
    pricingCheckedAt: "2026-10-05",
    startedAt: metadata.startedAt,
    finishedAt: new Date().toISOString(),
    durations: { elapsedMs: Date.now() - start, e2eMs: reports ? e2eMs : null },
    reportCount: reports,
    tests,
    actionReplay: replay,
    missingExecutorCalls,
    rejectedRecords,
    staleRecords,
    replayCacheRestored:
      typeof metadata.replayCacheRestored === "boolean" ? metadata.replayCacheRestored : null,
    models: rows,
    totals: {
      requests: sum("requests"),
      operations: sum("operations"),
      inputTokens: sum("inputTokens"),
      outputTokens: sum("outputTokens"),
      cachedInputTokens: sum("cachedInputTokens"),
      knownInputTokens: sum("knownInputTokens"),
      knownOutputTokens: sum("knownOutputTokens"),
      knownCachedInputTokens: sum("knownCachedInputTokens"),
      errors: sum("errors"),
      missingUsage: sum("missingUsage"),
      estimatedCostUsd:
        incomplete || reports === 0 || rejectedRecords ? null : sum("estimatedCostUsd"),
      knownCostUsd: sum("knownCostUsd"),
      uncertainCostUsd: sum("uncertainCostUsd"),
      confirmedNonCachedRequests: sum("confirmedNonCachedRequests"),
      potentialNonCachedRequests: sum("potentialNonCachedRequests"),
      confirmedNonCachedOperations: sum("confirmedNonCachedOperations"),
      potentialNonCachedOperations: sum("potentialNonCachedOperations"),
    },
  }
  const display = (value) => (value === null ? "unknown" : String(value))
  const money = (value) => (value === null ? "unavailable" : `$${value.toFixed(8)}`)
  const duration = (value) => (value === null ? "unknown" : `${(value / 1000).toFixed(2)}s`)
  const markdown = [
    "### E2E AI usage",
    "",
    `Validated commit: ${summary.validatedSha ? `\`${summary.validatedSha}\`` : "unknown"}.`,
    `E2E report duration sum: ${duration(summary.durations.e2eMs)}; accounting window: ${duration(summary.durations.elapsedMs)}.`,
    `Tests: ${tests.passed} passed, ${tests.failed} failed, ${tests.interrupted} interrupted, ${tests.skipped} skipped.`,
    "",
    "#### Recorded-action replay (e2e cache)",
    "",
    `Action steps: ${replay.fullyReplayedSteps}/${replay.actionSteps} fully replayed, ${replay.partiallyReplayedSteps} handed off, ${replay.missedSteps} missed, ${replay.uncachedActionSteps} without cache; ${replay.replayedActions} actions replayed.`,
    `Replay archive restored: ${display(summary.replayCacheRestored)}; SDK model calls: ${replay.modelCalls}; live judgment steps: ${replay.liveJudgmentSteps}; param collisions preventing recording: ${replay.notRecordedSteps}.`,
    `Replay miss/handoff reasons: ${
      Object.entries(replay.reasons)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([reason, count]) => `${reason}=${count}`)
        .join(", ") || "none"
    }.`,
    `Cumulative action-step time: ${duration(replay.durations.actionMs)} (${duration(replay.durations.replayedMs)} fully replayed / ${duration(replay.durations.liveActionMs)} with live execution).`,
    "Replays execute recorded browser actions and verify the recorded end state without model calls. Exact test assertions and real application/infrastructure flows still run. This is separate from Gateway response caching below; restoring an archive alone does not prove replay hits. Timing is observed step duration, not an estimate of time saved.",
    "",
    "#### Model requests and response caching",
    "",
    `Accounting: ${partial ? "partial / uncertain" : "complete"}.`,
    `Missing executor call records: ${missingExecutorCalls}; rejected usage records: ${rejectedRecords}; stale records excluded: ${staleRecords}.`,
    `Token usage: ${display(summary.totals.inputTokens)} input / ${display(summary.totals.outputTokens)} output; known subtotals: ${summary.totals.knownInputTokens} input / ${summary.totals.knownOutputTokens} output; records missing usage: ${summary.totals.missingUsage}.`,
    "",
    "| Source / cache layer | Model | Requests | Operations | Cache hit/miss/bypass/unknown | Input/output tokens (known subtotal) | Errors | Estimated USD |",
    "| --- | --- | ---: | ---: | --- | --- | ---: | --- |",
    ...rows.map(
      (row) =>
        `| ${row.source} / ${row.cacheLayer} | ${row.model} | ${display(row.requests)} | ${row.operations} | ${row.cache.hit}/${row.cache.miss}/${row.cache.bypass}/${row.cache.unknown} | ${display(row.inputTokens)}/${display(row.outputTokens)} (${row.knownInputTokens}/${row.knownOutputTokens}) | ${row.errors} | ${money(row.estimatedCostUsd)} (${row.costStatus}) |`,
    ),
    "",
    `Estimated inference ${rows.some((row) => row.costStatus === "upper-bound") ? "upper bound" : "total"}: ${money(summary.totals.estimatedCostUsd)}; confirmed priced subtotal: ${money(summary.totals.knownCostUsd)}; uncertain priced upper-bound subtotal: ${money(summary.totals.uncertainCostUsd)}.`,
    "",
    "Token counts are provider-reported response usage; a cached response may repeat original token counts, so these are not billable token totals. Estimates are not a provider invoice. Full response-cache hits are priced at zero inference; unknown cache status is an upper-bound estimate. Missing usage or an unpriced model stays unavailable, never inferred as zero. Stagehand operations are not exact provider request counts. Gemini output includes thinking; prompt-cache discounts apply only when reported. Infrastructure, browser hosting and gateway fees are excluded.",
    "Rates checked 2026-10-05: [Clef](https://developers.cloudflare.com/workers-ai/models/clef/), [GPT OSS 120B](https://developers.cloudflare.com/workers-ai/models/gpt-oss-120b/), [GPT OSS 20B](https://developers.cloudflare.com/workers-ai/models/gpt-oss-20b/), [Gemini](https://ai.google.dev/gemini-api/docs/pricing).",
    "",
  ].join("\n")
  await mkdir(directory, { recursive: true, mode: 0o700 })
  await chmod(directory, 0o700)
  await privateWrite("summary.json", JSON.stringify(summary, null, 2) + "\n")
  await privateWrite("summary.md", markdown)
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown)
}

try {
  if (process.argv[2] === "init") await init()
  else if (process.argv[2] === "summarize") await summarize()
  else throw new Error("Expected init or summarize")
} catch {
  // Never print arbitrary input or filesystem errors, which can contain sensitive text.
  console.error("E2E AI accounting failed; test results are unchanged.")
  process.exitCode = 1
}
