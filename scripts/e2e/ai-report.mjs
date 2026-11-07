import { appendFile, chmod, mkdir, readFile, writeFile } from "node:fs/promises"
import { execFileSync } from "node:child_process"
import * as P from "effect/Predicate"

// Reads the e2e report only. Never copies prompts, response bodies, log lines, or filter notes.
const directory = ".e2e/ai-usage"

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

const timestamp = (value) =>
  P.isString(value) &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) &&
  Number.isFinite(Date.parse(value))

const sha = (value) => (P.isString(value) && /^[a-f0-9]{40}$/.test(value) ? value : null)
const modelId = (value) => P.isString(value) && /^[A-Za-z0-9@._:/-]{1,128}$/.test(value)
const moneyNumber = (value) => P.isNumber(value) && Number.isFinite(value) && value >= 0
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"))

const spendPattern =
  /(?:^|; )(\d+) (call|calls), (\d+|\d+\.\d+[kM]) tokens(?:, (\$\d+(?:\.\d+)|<\$0\.0001))?$/

async function privateWrite(name, content) {
  const path = `${directory}/${name}`
  await writeFile(path, content, { mode: 0o600 })
  await chmod(path, 0o600)
}

async function init() {
  await mkdir(directory, { recursive: true, mode: 0o700 })
  await chmod(directory, 0o700)
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
        replayCacheRestored: ["true", "false"].includes(process.env.E2E_ACTION_CACHE_RESTORED)
          ? process.env.E2E_ACTION_CACHE_RESTORED === "true"
          : null,
      },
      null,
      2,
    ) + "\n",
  )
  // Old output must not be published when this run fails before summarization.
  await Promise.all(["summary.json", "summary.md"].map((name) => privateWrite(name, "")))
}

function modelUsage(value) {
  if (!P.isObject(value)) return null

  if (!modelId(value.provider) || !modelId(value.model)) return null

  if (!numeric(value.calls) || value.calls < 1) return null

  if (!numeric(value.inputTokens) || !numeric(value.outputTokens)) return null

  if (!["provider", "adapter-upper-bound"].includes(value.tokenAccounting)) return null

  if (value.cacheReadTokens !== undefined && !numeric(value.cacheReadTokens)) return null

  if (value.cacheWriteTokens !== undefined && !numeric(value.cacheWriteTokens)) return null

  if (value.estimatedCostUsd !== undefined && !moneyNumber(value.estimatedCostUsd)) return null

  return {
    provider: value.provider,
    model: value.model,
    calls: value.calls,
    inputTokens: value.inputTokens,
    outputTokens: value.outputTokens,
    cacheReadTokens: value.cacheReadTokens ?? null,
    cacheWriteTokens: value.cacheWriteTokens ?? null,
    estimatedCostUsd: value.estimatedCostUsd ?? null,
    tokenAccounting: value.tokenAccounting,
  }
}

function filterSpend(note) {
  if (!P.isString(note)) return null
  const match = note.match(spendPattern)

  if (!match) return null
  const calls = Number(match[1])

  if (!numeric(calls)) return null

  if ((calls === 1 && match[2] !== "call") || (calls !== 1 && match[2] !== "calls")) return null

  return {
    calls,
    text: `${match[1]} ${match[2]}, ${match[3]} tokens${match[4] ? `, ${match[4]}` : ""}`,
  }
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

  const groups = new Map()
  const filters = []

  let e2eMs = 0,
    reports = 0,
    rejectedModels = 0,
    missingModelSteps = 0

  let incomplete = false

  let sdkModelTokens = 0,
    sdkCost = 0

  let sdkTokensKnown = true,
    sdkCostKnown = true

  const addModel = (entry) => {
    const key = `${entry.provider}\0${entry.model}\0${entry.tokenAccounting}`

    if (!groups.has(key))
      groups.set(key, {
        provider: entry.provider,
        model: entry.model,
        tokenAccounting: entry.tokenAccounting,
        steps: 0,
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        cacheReadKnown: true,
        cacheWriteKnown: true,
        estimatedCostUsd: 0,
        costKnown: true,
      })
    const group = groups.get(key)
    group.steps += 1
    group.calls += entry.calls
    group.inputTokens += entry.inputTokens
    group.outputTokens += entry.outputTokens

    if (entry.cacheReadTokens === null) group.cacheReadKnown = false
    else group.cacheReadTokens += entry.cacheReadTokens

    if (entry.cacheWriteTokens === null) group.cacheWriteKnown = false
    else group.cacheWriteTokens += entry.cacheWriteTokens

    if (entry.estimatedCostUsd === null) group.costKnown = false
    else group.estimatedCostUsd += entry.estimatedCostUsd
  }

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
      const recordedCalls = numeric(step.metrics?.modelCalls) ? step.metrics.modelCalls : 0

      if (!step.model) {
        if (recordedCalls > 0) missingModelSteps += 1
        continue
      }

      const usage = modelUsage(step.model)

      if (!usage) {
        rejectedModels += 1
        continue
      }

      if (recordedCalls !== usage.calls) missingModelSteps += 1
      addModel(usage)
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

    if (numeric(run.usage?.modelTokens)) sdkModelTokens += run.usage.modelTokens
    else sdkTokensKnown = false

    if (moneyNumber(run.usage?.estimatedCostUsd)) sdkCost += run.usage.estimatedCostUsd
    else sdkCostKnown = false

    for (const filter of run.filters ?? []) {
      if (
        !P.isString(filter?.name) ||
        !/^[A-Za-z0-9@._:/-]{1,256}$/.test(filter.name) ||
        !numeric(filter.candidates) ||
        !numeric(filter.excluded)
      ) {
        rejectedModels += 1
        continue
      }

      const spend = filterSpend(filter.note)
      filters.push({
        name: filter.name,
        candidates: filter.candidates,
        excluded: filter.excluded,
        calls: spend?.calls ?? null,
        spend: spend?.text ?? null,
      })
    }

    for (const result of run.results ?? [])
      for (const attempt of result.attempts ?? []) collectSteps(attempt.steps)

    for (const group of run.serialGroups ?? [])
      for (const attempt of group.attempts ?? [])
        for (const member of attempt.members ?? []) collectSteps(member.steps)
  }

  const rows = [...groups.values()]
    .map((row) => ({
      ...row,
      cacheReadTokens: row.cacheReadKnown ? row.cacheReadTokens : null,
      cacheWriteTokens: row.cacheWriteKnown ? row.cacheWriteTokens : null,
      estimatedCostUsd: row.costKnown ? row.estimatedCostUsd : null,
    }))
    .sort((a, b) =>
      `${a.provider}:${a.model}:${a.tokenAccounting}`.localeCompare(
        `${b.provider}:${b.model}:${b.tokenAccounting}`,
      ),
    )

  const sum = (field) => rows.reduce((total, row) => total + row[field], 0)
  const calls = sum("calls")
  const costKnown = rows.every((row) => row.estimatedCostUsd !== null)
  const upperBound = rows.some((row) => row.tokenAccounting === "adapter-upper-bound")

  const partial =
    incomplete || reports === 0 || rejectedModels > 0 || missingModelSteps > 0 || upperBound

  const filterCalls = filters.reduce((total, filter) => total + (filter.calls ?? 0), 0)
  const needsComment = calls > 0 || filterCalls > 0

  const summary = {
    schemaVersion: 1,
    validatedSha: sha(metadata.validatedSha),
    needsComment,
    partial,
    startedAt: metadata.startedAt,
    finishedAt: new Date().toISOString(),
    durations: { elapsedMs: Date.now() - start, e2eMs: reports ? e2eMs : null },
    reportCount: reports,
    tests,
    actionReplay: replay,
    rejectedModels,
    missingModelSteps,
    replayCacheRestored: P.isBoolean(metadata.replayCacheRestored)
      ? metadata.replayCacheRestored
      : null,
    models: rows,
    filters,
    totals: {
      calls,
      inputTokens: sum("inputTokens"),
      outputTokens: sum("outputTokens"),
      cacheReadTokens: rows.some((row) => row.cacheReadTokens === null)
        ? null
        : sum("cacheReadTokens"),
      cacheWriteTokens: rows.some((row) => row.cacheWriteTokens === null)
        ? null
        : sum("cacheWriteTokens"),
      estimatedCostUsd: !costKnown || partial ? null : sum("estimatedCostUsd"),
      sdkModelTokens: reports > 0 && sdkTokensKnown ? sdkModelTokens : null,
      sdkEstimatedCostUsd: reports > 0 && sdkCostKnown ? sdkCost : null,
    },
  }

  const display = (value) => (value === null ? "unknown" : String(value))
  const money = (value) => (value === null ? "unavailable" : `$${value.toFixed(8)}`)
  const duration = (value) => (value === null ? "unknown" : `${(value / 1000).toFixed(2)}s`)

  const markdown = [
    "### E2E AI usage",
    "",
    "Counts only the suite's own model calls: the decision filter and the step executor. Application inference is not included.",
    "",
    `Validated commit: ${summary.validatedSha ? `\`${summary.validatedSha}\`` : "unknown"}.`,
    `E2E report duration sum: ${duration(summary.durations.e2eMs)}; accounting window: ${duration(summary.durations.elapsedMs)}.`,
    `Tests: ${tests.passed} passed, ${tests.failed} failed, ${tests.interrupted} interrupted, ${tests.skipped} skipped.`,
    "",
    "#### Recorded-action replay (e2e cache)",
    "",
    `Action steps: ${replay.fullyReplayedSteps}/${replay.actionSteps} fully replayed, ${replay.partiallyReplayedSteps} handed off, ${replay.missedSteps} missed, ${replay.uncachedActionSteps} without cache; ${replay.replayedActions} actions replayed.`,
    `Replay recordings present: ${display(summary.replayCacheRestored)}; SDK model calls: ${replay.modelCalls}; live judgment steps: ${replay.liveJudgmentSteps}; param collisions preventing recording: ${replay.notRecordedSteps}.`,
    `Replay miss/handoff reasons: ${
      Object.entries(replay.reasons)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([reason, count]) => `${reason}=${count}`)
        .join(", ") || "none"
    }.`,
    `Cumulative action-step time: ${duration(replay.durations.actionMs)} (${duration(replay.durations.replayedMs)} fully replayed / ${duration(replay.durations.liveActionMs)} with live execution).`,
    "Replays execute recorded browser actions and verify the recorded end state without model calls. Exact test assertions and real application flows still run. Restoring an archive alone does not prove replay hits. Timing is observed step duration, not an estimate of time saved.",
    "",
    "#### Suite model usage",
    "",
    `Accounting: ${partial ? "partial / uncertain" : "complete"}.`,
    `Executor steps missing a model record: ${missingModelSteps}; rejected model records: ${rejectedModels}.`,
    `Executor tokens: ${summary.totals.inputTokens} input / ${summary.totals.outputTokens} output; prompt-cache read/write: ${display(summary.totals.cacheReadTokens)} / ${display(summary.totals.cacheWriteTokens)}.`,
    `SDK run usage: ${display(summary.totals.sdkModelTokens)} model tokens; SDK estimated cost: ${money(summary.totals.sdkEstimatedCostUsd)}.`,
    "",
    "| Provider | Model | Calls | Input / output tokens | Prompt-cache read / write | Accounting | Estimated USD |",
    "| --- | --- | ---: | --- | --- | --- | --- |",
    ...rows.map(
      (row) =>
        `| ${row.provider} | ${row.model} | ${row.calls} | ${row.inputTokens} / ${row.outputTokens} | ${display(row.cacheReadTokens)} / ${display(row.cacheWriteTokens)} | ${row.tokenAccounting} | ${money(row.estimatedCostUsd)} |`,
    ),
    "",
    `Executor estimated cost: ${money(summary.totals.estimatedCostUsd)}.`,
    "",
    "#### Decision filter",
    "",
    ...(filters.length
      ? filters.map(
          (filter) =>
            `\`${filter.name}\`: ${filter.excluded} of ${filter.candidates} left out. Spend: ${filter.spend ?? "not reported"}.`,
        )
      : ["No decision filter ran."]),
    "",
    "Token counts and cost come from the e2e report. Executor rows are the model records attached to steps. Filter spend is the usage suffix e2e appends to its filter note, and is omitted when that suffix is absent. Rounded filter totals are not added to the executor cost. A gateway response-cache hit is reflected only when the executor recorded a zero cost. Application model calls are outside this summary.",
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
