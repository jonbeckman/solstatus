# Provider Implementation Reference

Use this reference when contributing **upstream to `alchemy-effect`** — adding or editing resources, capabilities, event sources, or test fixtures under `packages/alchemy/src/`. For app-level deploy work, stay in `SKILL.md` and `upstream-concepts.md`.

The upstream `AGENTS.md` is the canonical source for contributions to that
repository. This file records upstream-specific shapes; it does not prescribe
them for Darkmatter application packages. Re-check the pinned upstream source
before landing a PR. App packages follow
[codebase-design](../../codebase-design/SKILL.md) and the layout in
[the Alchemy skill](../SKILL.md#effect-native-provider-module-layout).

## Core vocabulary

Infrastructure-as-Effects (IaE) extends IaC by expressing infrastructure and runtime as one type-safe Effect program.

- **Cloud Provider** — AWS, Cloudflare, Stripe, Planetscale, Neon, etc.
- **Service** — a group of Resources, Functions, and Bindings (`S3`, `SQS`, `Lambda`, `Workers`).
- **Resource** — a named entity with Input Properties (desired state) and Output Attributes (current state). May have a Binding Contract.
- **Stable Properties** — properties unchanged by an Update (ID, ARN).
- **Function** (Runtime) — a Resource whose implementation is an `Effect<A, Err, Req>`. Infrastructure dependencies are inferred from `Req`.
- **Output** — a reference to a Resource's Output Attribute (`Bucket.bucketArn`).
- **Stack** — a collection of Resources/Functions/Bindings deployed together.
- **Stack Instance** — a deployed (Stack, Stage) pair.
- **Logical ID** — stable identifier within a Stack across create/update/delete/replace.
- **Instance ID** — stable across create/update/delete, changes on replace; truncated as the Physical Name suffix.
- **Physical Name** — globally unique cloud name; prefer `createPhysicalName`.
- **Replacement** — create-new → repoint dependants → delete-old (or delete-then-create).
- **Dependency Violation / Eventual Consistency** — common retryable failure modes from cloud APIs.

## Lifecycle operations

A Resource Provider implements:

- **Diff** — decide whether new props trigger update, replace, or no-op. Returns Stable Properties unaffected by update. **Almost never use explicit `no-op`** — return `undefined`/`void` to let the engine apply default update logic. Diff is for replacement detection or optimization.
- **Read** — refresh Output Attributes from the cloud. May return `Unowned(attrs)` to signal a foreign resource; the engine refuses adoption unless `--adopt` is set.
- **Pre-Create** — optional stub creation to break circular dependencies (e.g. Lambda Function A ↔ B).
- **Reconcile** — converge the cloud to desired state. See the doctrine below — this is one unified flow for create, update, and adoption.
- **Delete** — must be idempotent. Missing-resource on delete is not an error.

Errors split into:

- **Retryable** — Dependency Violations, Eventual Consistency, transient failures. Use `Effect.retry` with `Schedule`.
- **Non-Retryable** — Validation, Authorization. Fail fast.

## Reconciler doctrine

`reconcile` receives `output: Attributes | undefined` and `olds: Props | undefined`:

| `output`    | `olds`      | Meaning                                 |
| ----------- | ----------- | --------------------------------------- |
| `undefined` | `undefined` | Greenfield — no prior physical resource |
| defined     | defined     | Routine update — engine-owned           |
| defined     | `undefined` | Adoption — engine adopted via `read`    |

The reconciler MUST work for all three. **Never branch the body on `output === undefined`** — that is rename-and-branch, not reconciliation. One flow:

```
1. Observe   — derive identifier; read live cloud state via get/describe
2. Ensure    — if missing, call create. Catch AlreadyExists/Conflict as a race
                and continue. Wait for active state if applicable.
3. Sync      — for each mutable aspect (settings, sub-resources, tags, policy):
                 - read OBSERVED cloud state (not olds)
                 - compute desired state from news + bindings
                 - diff observed against desired
                 - apply only the delta API call (skip API on no-op)
4. Return    — re-read final state if needed; return fresh Attributes
```

Invariants:

- **Observation > assumption.** Cloud state is authoritative. `olds` is at most a hint to skip a no-op API call.
- **Each sync step is independently idempotent.** Crash mid-reconcile → re-run → converge.
- **`output` is a cache** for stable identifiers, never a guarantee the resource still exists.
- **Catch `AlreadyExists`/`NotFoundException`/`ResourceInUseException`** — they're races and eventual consistency, not failures.
- **Tag diff baseline is observed cloud tags**, not `olds.tags` or `output.tags`.

Existence-only resources (Lambda Permission, EC2 Route, IAM AccessKey) have no sync step — reconciler is observe → if missing, create.

Reference reconcilers: [S3 Bucket](https://github.com/alchemy-run/alchemy-effect/blob/main/packages/alchemy/src/AWS/S3/Bucket.ts), [SQS Queue](https://github.com/alchemy-run/alchemy-effect/blob/main/packages/alchemy/src/AWS/SQS/Queue.ts), [Kinesis Stream](https://github.com/alchemy-run/alchemy-effect/blob/main/packages/alchemy/src/AWS/Kinesis/Stream.ts), [DynamoDB Table](https://github.com/alchemy-run/alchemy-effect/blob/main/packages/alchemy/src/AWS/DynamoDB/Table.ts), [EC2 Vpc](https://github.com/alchemy-run/alchemy-effect/blob/main/packages/alchemy/src/AWS/EC2/Vpc.ts), [Lambda Function](https://github.com/alchemy-run/alchemy-effect/blob/main/packages/alchemy/src/AWS/Lambda/Function.ts), [Cloudflare Worker](https://github.com/alchemy-run/alchemy-effect/blob/main/packages/alchemy/src/Cloudflare/Workers/Worker.ts).

## File system conventions

```sh
packages/alchemy/src/{Cloud}/{Service}/index.ts        # re-exports
packages/alchemy/src/{Cloud}/{Service}/{Resource}.ts   # resource contract + provider
packages/alchemy/src/{Cloud}/{Service}/{Capability}.ts # Binding.Service + Binding.Policy
packages/alchemy/test/{Cloud}/{Service}/{Resource}.test.ts
website/src/content/docs/providers/{Cloud}/{Resource}.md  # auto-generated — DO NOT edit
```

Examples: `AWS/S3/Bucket.ts`, `AWS/S3/GetObject.ts`, `AWS/SQS/Queue.ts`, `AWS/SQS/SendMessage.ts`, `AWS/Lambda/Function.ts`, `AWS/DynamoDB/Table.ts`, `AWS/EC2/Vpc.ts`.

## Resource contract shape

The `Resource` interface takes four type parameters: `Resource<Type, Props, Attributes, BindingContract>`. The fourth is optional and only present when the resource accepts bindings (Lambda Function, Cloudflare Worker).

```ts
export interface Stream extends Resource<
  "AWS.Kinesis.Stream",
  StreamProps,
  {
    streamName: string;
    streamArn: string;
    streamStatus: StreamStatus;
  }
> {}
export const Stream = Resource<Stream>("AWS.Kinesis.Stream");

export interface Function extends Resource<
  "AWS.Lambda.Function",
  FunctionProps,
  {
    functionArn: string;
    functionName: string;
    functionUrl: string | undefined;
    roleName: string;
    roleArn: string;
  },
  { env?: Record<string, any>; policyStatements?: PolicyStatement[] }
> {}
```

Rules:

- Wrap inputs in `Input<T>` only when they may reference another resource's Output Attribute (`Input<VpcId>`, `Tags: Record<string, Input<string>>`).
- **Never** wrap properties that must be statically knowable in `diff` (`name`, `bucketName`, `bucketPrefix`).
- Resource-level JSDoc carries `@section` + `@example` blocks. Every prop and attribute gets field-level JSDoc with `@default` where applicable.

## Capability shape: Binding.Service + Binding.Policy

Each capability ships four exports:

```ts
// 1. Runtime SDK wrapper class
export class PutRecord extends Binding.Service<...>()("AWS.Kinesis.PutRecord") {}

// 2. Live layer for the runtime — provided on the Function Effect
export const PutRecordLive = Layer.effect(PutRecord, ...);

// 3. Deploy-time policy class
export class PutRecordPolicy extends Binding.Policy<...>()("AWS.Kinesis.PutRecord") {}

// 4. Live layer for the policy — provided on the Stack via AWS.providers()()
export const PutRecordPolicyLive = Layer.effect(PutRecordPolicy, ...);
```

Then register the Policy in `AWS.providers()()` by adding `*PolicyLive` to `bindings()` in [Providers.ts](https://github.com/alchemy-run/alchemy-effect/blob/main/packages/alchemy/src/AWS/Providers.ts) and re-export from the service `index.ts`.

`Binding.Policy.attach` calls `ctx.bind({ policyStatements: [...] })` on the target Function, which records binding data on the Stack. The provider's `reconcile` receives resolved binding data via the `bindings` parameter. At runtime, `Binding.Policy` uses `Effect.serviceOption` so it gracefully becomes a no-op.

Event Sources (`SQS QueueEventSource`, `S3 BucketEventSource`, `DynamoDB streams(table)`) follow the same Binding.Service + Binding.Policy shape, where the policy attach creates/updates the event source mapping.

When a canonical resource needs mutable event-source configuration with possible circularity, **prefer a resource binding contract over a plain input prop**. DynamoDB Streams is the reference case: `Table` owns the actual stream state; `streams(table)` injects via bindings.

## RuntimeContext: coloring runtime-only methods

The inner Effect returned by a `Binding.Service`'s `.bind(resource)` MUST declare `Alchemy.RuntimeContext`:

```ts
import type { RuntimeContext } from "../../RuntimeContext.ts";

export class GetItem extends Binding.Service<
  GetItem,
  <T extends Table>(
    table: T,
  ) => Effect.Effect<
    (request: GetItemRequest) => Effect.Effect<
      DynamoDB.GetItemOutput,
      DynamoDB.GetItemError,
      RuntimeContext // ← runtime-only
    >
  >
>()("AWS.DynamoDB.GetItem") {}
```

Rules:

- **Outer Effect** (`bind(resource)` setup) runs at function init. No `RuntimeContext` requirement.
- **Inner Effect** (the SDK invocation) requires `RuntimeContext`.
- Resolve cloud env services (`WorkerEnvironment`, AWS SDK clients) once during Layer construction; close over them. Never leak `WorkerEnvironment` / `Lambda.FunctionEnvironment` onto the runtime callable — it couples downstream services to a specific cloud.
- The Function/Worker runtime satisfies `RuntimeContext` automatically; you don't have to provide it explicitly in the implementation.

## Region and account access

Resolve region/account **inside lifecycle operations**, not at Layer construction:

```ts
reconcile: Effect.fn(function* ({ id, news, output, session }) {
  const region = yield* Region;
  const accountId = yield* Account;
});
```

This scopes the lookup to the resource, not the provider.

## Tag handling

Always apply Alchemy's internal tags so the engine can identify resources it owns:

```ts
reconcile: Effect.fn(function* ({ id, news, output, session }) {
  const internalTags = yield* createInternalTags(id);
  const userTags = news.tags ?? {};
  const allTags = { ...userTags, ...internalTags };
});
```

Never roll your own tag diff. Use `diffTags` from [Tags.ts](https://github.com/alchemy-run/alchemy-effect/blob/main/packages/alchemy/src/Tags.ts) and diff against **observed cloud tags** (not `olds.tags` or `output.tags`):

```ts
const internalTags = yield * createInternalTags(id);
const newTags = { ...news.tags, ...internalTags };
const oldTags = yield * fetchObservedTags(/* … */);
// Pick the shape that matches the API:
const { removed, upsert } = diffTags(oldTags, newTags); // combined create/update
const { removed, added, updated } = diffTags(oldTags, newTags); // separate calls
const { upsert } = diffTags(oldTags, newTags); // PUT/UPDATE only
```

## Effect platform rules (provider code AND tests)

Never use `async`/`await`, raw `Promise`, `node:fs/promises`, `node:fs`, `node:os`, or `pathe` directly:

| Don't                                       | Do                                                   |
| ------------------------------------------- | ---------------------------------------------------- |
| `import fs from "node:fs/promises"`         | `const fs = yield* FileSystem.FileSystem`            |
| `await fs.readFile(p, "utf8")`              | `yield* fs.readFileString(p)`                        |
| `await fs.mkdtemp(...)`                     | `yield* fs.makeTempDirectory({ prefix: ... })`       |
| `import path from "pathe"` / `node:path`    | `const path = yield* Path.Path`                      |
| `await fetch(...)`                          | `yield* HttpClient.HttpClient` + `HttpClientRequest` |
| `Effect.promise(() => listSqlFiles(dir))`   | Make `listSqlFiles` return `Effect` and `yield*` it  |
| `new Promise((res) => setTimeout(res, ms))` | `yield* Effect.sleep(Duration.millis(ms))`           |

Check upstream rules for required wrappers in an upstream contribution. In
Darkmatter app code, suspend environment reads and side effects in Effect and
classify expected failures at external boundaries. Pure transformations remain
plain TypeScript; `Effect.sync` does not make a CPU calculation interruptible.
An upstream-specific wrapper may look like:

```ts
const hash = yield * Effect.sync(() => crypto.createHash("sha256").update(input).digest("hex"));
```

Never use `Effect.orDie` inside lifecycle operations — it crashes the whole IaC engine.

## Test fixtures for Effect-native runtimes

Layout — fixtures live next to the test that owns them, never shared across suites:

```sh
packages/alchemy/test/{Cloud}/{Service}/{Resource}.test.ts
packages/alchemy/test/{Cloud}/{Service}/fixtures/{worker|workflow|handler}.ts
```

Fixture shape — define the Function/Worker with the bindings under test, expose one HTTP route per behavior, default-export:

```ts
// fixtures/worker.ts
import * as Cloudflare from "@/Cloudflare/index.ts";
import * as Effect from "effect/Effect";
import { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import { Gateway } from "./gateway.ts";

export default class TestWorker extends Cloudflare.Worker<TestWorker>()(
  "TestWorker",
  { main: import.meta.filename },
  Effect.gen(function* () {
    const aiGateway = yield* Cloudflare.AiGateway.bind(Gateway);
    return {
      fetch: Effect.gen(function* () {
        const request = yield* HttpServerRequest;
        if (request.url.startsWith("/url")) {
          const url = yield* aiGateway.getUrl().pipe(Effect.orDie);
          return yield* HttpServerResponse.json({ url });
        }
        return HttpServerResponse.text("ok");
      }),
    };
  }).pipe(Effect.provide(Cloudflare.AiGatewayBindingLive)),
) {}
```

Test shape — deploy once with `beforeAll`, drive over HTTP, retry first request:

```ts
import * as Alchemy from "@/index.ts";
import * as Cloudflare from "@/Cloudflare";
import * as Test from "@/Test/Vitest";
import { expect } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Schedule from "effect/Schedule";
import * as HttpClient from "effect/unstable/http/HttpClient";
import TestWorker from "./fixtures/worker.ts";

const { test, beforeAll, afterAll, deploy, destroy } = Test.make({
  providers: Cloudflare.providers(),
});

const Stack = Alchemy.Stack(
  "ServiceTestStack",
  { providers: Cloudflare.providers(), state: Cloudflare.state() },
  Effect.gen(function* () {
    const worker = yield* TestWorker;
    return { url: worker.url.as<string>() };
  }),
);

const stack = beforeAll(deploy(Stack));
afterAll.skipIf(!!process.env.NO_DESTROY)(destroy(Stack));

test(
  "deployed worker exercises the binding",
  Effect.gen(function* () {
    const { url } = yield* stack;
    const client = yield* HttpClient.HttpClient;
    const res = yield* client
      .get(`${url}/url`)
      .pipe(Effect.retry({ schedule: Schedule.exponential("500 millis"), times: 10 }));
    expect(res.status).toBe(200);
  }),
  { timeout: 180_000 },
);
```

Rules:

- `Test.make({ providers })` provides `test`, `beforeAll`, `afterAll`, `deploy`, `destroy`.
- Always retry the first request — fresh workers.dev URLs and Lambda Function URLs take seconds to serve 200s.
- For POST: `client.post(url)` for empty bodies, or `HttpClient.execute(HttpClientRequest.post(url).pipe(HttpClientRequest.bodyJsonUnsafe(body)))`.
- `NO_DESTROY=1` is a local iteration knob only; never the CI default.
- **Never use `while (Date.now() < deadline)` loops** to poll for async side effects (workflow status, cron fires, queue drains). Use `Effect.repeat` with `Schedule` + `until` + bounded `times: N`:

  ```ts
  const value =
    yield *
    fetchValue.pipe(
      Effect.repeat({
        schedule: Schedule.spaced("5 seconds"),
        until: (v) => v.ready,
        times: 36,
      }),
    );
  ```

- Never use `Date.now()` in physical names — let Alchemy generate the name from app/stage/logical id, or construct a deterministic name unique to the test case.
- Per-binding test layout: one `describe("<BindingName>")` block per binding, all driving the same deployed Function.
- Tests must use `FileSystem.FileSystem` / `Path.Path` for file/path access.

Reference fixtures: [Cloudflare AiGateway](https://github.com/alchemy-run/alchemy-effect/blob/main/packages/alchemy/test/Cloudflare/AiGateway/), [Cloudflare D1Connection](https://github.com/alchemy-run/alchemy-effect/blob/main/packages/alchemy/test/Cloudflare/D1/), [Cloudflare Workflow](https://github.com/alchemy-run/alchemy-effect/blob/main/packages/alchemy/test/Cloudflare/Workers/), [Cloudflare Cron Trigger](https://github.com/alchemy-run/alchemy-effect/blob/main/packages/alchemy/test/Cloudflare/Workers/CronEventSource.test.ts), [Cloudflare Images](https://github.com/alchemy-run/alchemy-effect/blob/main/packages/alchemy/test/Cloudflare/Images/), [AWS Lambda DynamoDB bindings](https://github.com/alchemy-run/alchemy-effect/blob/main/packages/alchemy/test/AWS/DynamoDB/).

## Spec-driven service bring-up

Use [@processes/AWS.md](https://github.com/alchemy-run/alchemy-effect/blob/main/processes/AWS.md) as the source of truth for bringing a single service from zero to full coverage. The high-level loop:

1. **Research** the service — list Resources, Identifier Types, Structs, Capabilities, Event Sources. Cross-reference Terraform Provider, Pulumi Provider, and CloudFormation docs.
2. **Document each Resource** — `ResourceName`, Input Properties (Name, Type, Description, Default, Required, Constraints, Replaces: true/false), Output Attributes.
3. **Document each Capability** — name (1:1 with cloud API), constraints, IAM policy mapping, env vars injected into runtime.
4. **Design lifecycle ops** — Diff (stable/conditional/replacement), Read (refresh + adoption path), Pre-Create (only if circular), Reconcile (observe-ensure-sync flow), Delete (idempotent + dependency-violation handling).
5. **Design test cases** — single-step happy paths, multi-step update/replace sequences, multi-resource smoke tests.
6. **Implement** Resource + Provider co-located in `{Resource}.ts`.
7. **Implement Capabilities** as `Binding.Service` + `Binding.Policy` pairs, register Policy in `AWS.providers()()`.
8. **Implement tests** using the fixture pattern above.
9. **Write a smoke test** that combines commonly-paired resources (see the [VPC Smoke Test](https://github.com/alchemy-run/alchemy-effect/blob/main/test/AWS/EC2/Vpc.smoke.test.ts) for an example).
10. **Add JSDoc** at resource and field level, then run `bun generate:api-reference`.

The audit-driven implementation loop, registration/binding-coverage checks, and Lambda fixture conventions live in `processes/AWS.md` and evolve there — keep this reference high-level.

## Documentation generation

**Source of truth: JSDoc on the resource `.ts` file.** The generated markdown under `website/src/content/docs/providers/{Cloud}/{Resource}.md` is overwritten on every regeneration. Never hand-edit it.

To refresh after editing JSDoc:

```sh
bun generate:api-reference
```

[scripts/generate-api-reference.ts](https://github.com/alchemy-run/alchemy-effect/blob/main/scripts/generate-api-reference.ts) walks `packages/alchemy/src/{Cloud}/{Service}/`, parses TypeScript with `ts-morph`, extracts resource-level summary plus `@section` / `@example` blocks, and writes one markdown file per resource.

### JSDoc requirements

Every Prop and Attribute gets JSDoc, with `@default` where it applies:

```typescript
export interface BucketProps {
  /**
   * Name of the bucket. If omitted, a unique name will be generated.
   * Must be lowercase and between 3-63 characters.
   */
  bucketName?: string;
  /**
   * Whether to delete all objects when the bucket is destroyed.
   * @default false
   */
  forceDestroy?: boolean;
}
```

### `@section` and `@example` on the Resource export

Examples are critical. Use `@section` to create a heading + ToC entry, then one or more `@example` blocks per section:

````typescript
/**
 * An S3 bucket for storing objects.
 *
 * @section Creating a Bucket
 * @example Basic Bucket
 * ```typescript
 * const bucket = yield* Bucket("my-bucket", {});
 * ```
 *
 * @section Reading Objects
 * @example Get Object from Bucket
 * ```typescript
 * const response = yield* getObject(bucket, { key: "my-key" });
 * ```
 */
export const Bucket = Resource<...>("AWS.S3.Bucket");
````

Best practices: simplest → most complex, cover all major capabilities (Get/Put/Delete), show realistic patterns (error handling, multi-resource composition), descriptive titles.

## Tutorial documentation standard

Tutorials under `website/src/content/docs/tutorial/` are step-by-step and granular: every code snippet introduces exactly **one** new thing, followed by a short prose explanation of just that thing. Each step gets its own `##` heading.

**Anti-pattern** — one snippet with multiple changes, followed by "Two/three things just happened" + a numbered list. If you find yourself writing that list, split the snippet.

**Correct shape** — one concept ⇒ one heading ⇒ one diff snippet ⇒ one explanation paragraph (no bullets):

````md
## Bind the DO to the Worker

```diff lang="typescript"
+import Counter from "./counter.ts";

  Effect.gen(function* () {
+    const counters = yield* Counter;
    ...
  })
```

`yield* Counter` registers the DO with the Worker (binding + class-migration metadata) and hands you the namespace.

## Call the DO from `fetch`

```diff lang="typescript"
+import { HttpServerRequest } from "...";

  fetch: Effect.gen(function* () {
+    const request = yield* HttpServerRequest;
+    ...
  })
```

`counters.getByName(name)` returns a typed stub — `increment()` and `get()` round-trip through Cloudflare's RPC machinery.
````

Bullet/numbered lists are fine for genuinely list-shaped content (recaps, prerequisites). They are not a substitute for splitting a compound snippet. A single API that internally does several things (`Cloudflare.upgrade()`) doesn't need splitting — describe its behavior in prose. Use `diff lang="typescript"` blocks so each step shows what's added on top of the previous step.

## PR conventions

When opening an upstream PR:

- **Title** uses Conventional Commits (`feat(aws/s3): add bucket lifecycle rules`, `fix(website): mobile theme metas`).
- **Description** never starts with `#` or `##` — GitHub renders the PR title above it. Smallest heading allowed is `###`, and only when the description genuinely has multiple sections worth separating.
- **Content** — minimal prose, prefer code/diff snippets, cut anything restating the diff. No "Test plan", no "Testing", no TODO checklists. If something needs manual verification, mark the PR draft and tell the user in the chat.
- **Body delivery** — write to a temp file and pass `--body-file` to `gh pr create` / `gh pr edit`. Heredoc/`--body "$(cat …)"` mangles backticks across `gh` versions. If `gh pr edit --body-file` silently no-ops on older `gh`, fall back to `gh api -X PATCH repos/<owner>/<repo>/pulls/<n> -F body=@/tmp/pr-body.md`.

Good example body (prose summary + diff, no headings above it):

````
Track which state-store backend each project uses by emitting a `state_store.init` span tagged with `alchemy.state_store.kind`.

```ts
// every Layer.effect(State, …) site now wraps construction:
makeLocalState().pipe(recordStateStoreInit("local"))
```

Dashboard groups projects by kind from these spans (Axiom can't APL-query metric datasets).
````
