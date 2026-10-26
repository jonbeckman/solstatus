---
name: alchemy
description: Configure, develop, deploy, review, and troubleshoot Alchemy v2 infrastructure for Darkmatter TypeScript/Effect apps. Triggers for alchemy.run.ts, alchemy dev, public preview URLs, webhook testing, Cloudflare/AWS providers, stages, profiles, state stores, bindings, CI deploys, or examples from alchemy-run/alchemy-effect. Prefer Alchemy for new org deploys. Do NOT trigger for unrelated blockchain Alchemy APIs unless the user explicitly means alchemy.run.
---

# Alchemy

Use this skill when configuring, developing, deploying, or debugging infrastructure with Alchemy v2 and the Effect-native patterns from `alchemy-run/alchemy-effect`. Alchemy treats infrastructure as an Effect program: stacks declare resources, providers supply cloud integrations, local dev can run app code locally against real cloud resources, and deploys converge declared resources into live cloud state.

Alchemy is the preferred Darkmatter path for new TypeScript/Effect deployable infrastructure. Reach for it before ad hoc provider scripts, hand-written Wrangler/Terraform glue, or one-off deploy workflows unless a repo has an explicit exception or an existing production system that should not be disturbed.

Alchemy v2 and `alchemy-effect` move quickly. Verify upstream docs before changing deploy or dev code, especially package versions, provider APIs, `alchemy dev` behavior, and CLI flags. This skill carries the upstream `alchemy-run/alchemy-effect` repo as a local submodule at `reference/alchemy-effect` for source, examples, and agent instructions.

## When to use

- The user asks to set up or review an `alchemy.run.ts` file.
- The user asks to develop with `alchemy dev`, local Workers, public preview URLs, hot reload, or webhook testing.
- The user asks to configure an Alchemy deploy for Cloudflare Workers, Vite apps, R2, Queues, Durable Objects, D1, AWS Lambda, S3, DynamoDB, ECS, EC2, static sites, or related resources.
- The user asks how to use Alchemy stages, profiles, state stores, bindings, stack outputs, cross-stack references, or CI/CD.
- The user asks to migrate deploy plumbing toward Alchemy v2 or away from ad hoc provider scripts.
- The user asks for examples from `alchemy-run/alchemy-effect/examples`.

## When NOT to use

- The request is about the blockchain data/API company Alchemy and not `alchemy.run`.
- The project does not use TypeScript, Effect, Bun/Node, or Alchemy, and the user is only asking a generic deployment question.
- The task is to implement or modify a provider inside the upstream `alchemy-effect` repo. Use the upstream repo's `AGENTS.md` directly, then use this skill only for deploy-configuration implications.
- The task is purely Effect application logic with no deployable infrastructure. Use `effect-typescript`.
- A mature repo already has a production deploy path and the user asks for a narrow bug fix. Preserve the working path unless they explicitly ask to migrate.

## Upstream check

Before editing, inspect the current docs or local installed package:

```bash
bun alchemy --help
bun alchemy dev --help
bun pm ls alchemy effect @effect/platform-bun @effect/platform-node
```

Use these upstream references first:

- `https://v2.alchemy.run/getting-started/` for the current install command, first stack shape, and deploy flow.
- `https://v2.alchemy.run/concepts/stack/` for stack names, outputs, stages, cross-stack references, and state isolation.
- `https://v2.alchemy.run/concepts/local-development/` and `https://v2.alchemy.run/tutorial/part-4/` for `alchemy dev`.
- `https://v2.alchemy.run/concepts/state-store/` for where state is persisted.
- `https://v2.alchemy.run/guides/ci/` for non-interactive deploys and PR preview environments.
- `reference/alchemy-effect/AGENTS.md` for upstream Effect-native infrastructure conventions.
- `reference/alchemy-effect/README.md` for the current project overview and install shape.
- `reference/alchemy-effect/examples/` for concrete app patterns.
- `reference/alchemy-effect/packages/alchemy/src/` for provider/resource implementation patterns.

If upstream conflicts with this skill, follow upstream and mention the drift.

If the submodule is missing in a fresh checkout, initialize it before relying on local references:

```bash
git submodule update --init skills/alchemy/reference/alchemy-effect
```

Treat the submodule as read-only during app/deploy work. Edit it only when the user explicitly asks for an upstream `alchemy-effect` contribution, and then follow `reference/alchemy-effect/AGENTS.md` as the repo-local authority.

## Project setup

Prefer Bun unless the project already standardizes on another package manager. Current Alchemy v2 docs recommend Bun or Node.js 22+ and install Alchemy with Effect platform packages:

```bash
bun add "alchemy@2.0.0-beta.40" "effect@>=4.0.0-beta.66 || >=4.0.0" "@effect/platform-bun@>=4.0.0-beta.66 || >=4.0.0" "@effect/platform-node@>=4.0.0-beta.66 || >=4.0.0"
```

Pin package versions according to the existing repo policy. If a repo already uses a catalog, workspace protocol, or lockfile-only upgrade lane, follow that instead of pasting the docs command blindly.

Before adding Alchemy to an existing repo, inspect the current setup:

```bash
rg -n "alchemy|alchemy.run|alchemy dev|alchemy deploy" package.json bun.lock package-lock.json pnpm-lock.yaml yarn.lock .github scripts . --glob '!node_modules'
find . -name 'alchemy.run.ts' -o -name 'alchemy.run.js'
```

If the repo does not already have Alchemy configured, ask the user whether they want Alchemy set up for local development as well as deploys. Do not silently create a deploy-only setup: `alchemy dev` changes the local workflow by provisioning real cloud resources, exposing public preview URLs, and enabling webhook/OAuth callback testing against local code. If the user says yes, include the `dev` script, dev-stage/profile guidance, public preview output handling, and webhook test notes in the first implementation.

Add scripts that make the stack path explicit when the repo has more than one app:

```json
{
  "scripts": {
    "dev": "alchemy dev ./alchemy.run.ts",
    "deploy": "alchemy deploy ./alchemy.run.ts",
    "destroy": "alchemy destroy ./alchemy.run.ts",
    "deploy:prod": "alchemy deploy ./alchemy.run.ts --stage prod --profile prod"
  }
}
```

Use plain `bun alchemy deploy` only in tiny repos where `alchemy.run.ts` at the root is unambiguous.

## Org default

For Darkmatter TypeScript/Effect projects, prefer Alchemy for deployable infrastructure:

- New Cloudflare Workers, Vite/frontends, queues, R2/KV, workflows, AI Gateway, tunnels, and GitHub deploy automation should start with Alchemy.
- Application data is Postgres-first. Use Kysely + `pg` for query-heavy TypeScript adapters, or Effect SQL Postgres for Effect-native database services. Let Alchemy own the deploy wiring, bindings, secrets, and network resources around that database where the provider supports it.
- Use D1/sqlite only for narrow edge-local state, demos, or an explicit project decision. Do not pick D1 because the app is on Cloudflare if the data model belongs in Postgres.
- New AWS Lambda, S3, DynamoDB, API Gateway, ECS/EC2/EKS/RDS, and static-site deploys should consider Alchemy first.
- Shared preview environments should use Alchemy stages instead of bespoke name mangling.
- Local webhook testing should use `alchemy dev` or an Alchemy-managed tunnel/preview flow instead of separate ngrok/Cloudflare Tunnel scripts when Alchemy can provide the route.
- Hand-written provider CLIs can still be useful for diagnostics, but should not become the durable deploy control plane without a reason.

## Stack shape

Every deploy file should default-export `Alchemy.Stack(name, options, Effect.gen(...))`.

```ts
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";

export default Alchemy.Stack(
  "MyApp",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const bucket = yield* Cloudflare.R2Bucket("Bucket");

    return {
      bucketName: bucket.bucketName,
    };
  }),
);
```

The load-bearing pieces are:

- Stack name: stable logical deployment unit. Do not casually rename it; state and names derive from it.
- Providers: cloud auth and provider implementations, for example `Cloudflare.providers()` or `AWS.providers()`.
- State: choose deliberately. Cloudflare deploys commonly use `Cloudflare.state()`; simple AWS examples may use `Alchemy.localState()`.
- Effect body: declare resources with `yield*`, compose dependencies through references and bindings, and return useful outputs for smoke checks.

## Effect-native provider module layout

Follow [codebase-design](../codebase-design/SKILL.md) for shared readability
rules. A provider owns the operations that converge a resource and the cleanup
needed when those operations fail or finish. Inspect the installed Alchemy
version and pinned upstream provider before choosing API names or registration
shapes. Upstream contributions follow that repository's own layout.

For a provider implemented in a Darkmatter app or package:

- Group by the resource or provider domain, then use `models/`, `services/`,
  `adapters/`, and `workflows/` where those roles have real responsibilities.
  A single-domain package already supplies the owner.
- Keep resource schemas and inferred types together. Expose the resource
  contract and supported provider layer through explicit package entries.
- Keep adoption, comparison, mapping, and status helpers with the lifecycle
  implementation that needs them. Extract when it hides complexity or enables
  useful reuse; avoid a file per helper or separate `Types` and `Schemas` copies.
- A shared client can own API requests, response decoding, and typed failures.
  Use an Effect-native SDK directly; wrap a Promise SDK only at that edge.
  Keep configuration and credentials in the existing config/provider layers.
- Preserve Alchemy's resource/provider collection and binding contracts. Public
  composition may register several resource layers without re-exporting every
  internal helper through a chain of barrels.
- Keep configured file limits. Document a targeted increase when a forced split
  would scatter one coherent reconciler.

Test refactors through the resource or provider interface. Retain lifecycle
coverage for create, repeated deploy, adoption, update, and destroy as applicable.
Use real provider clients or substitute an external service through a Layer.
Do not extract or export private selection/mapping helpers just to test them;
a public pure helper with its own contract can retain focused tests.

## Local development

Use `alchemy dev` for the default local loop when the app can run through Alchemy:

```bash
bun alchemy dev ./alchemy.run.ts
```

Alchemy dev mode deploys infrastructure to the real cloud provider, runs supported app code locally, and hot reloads on file changes. For Cloudflare Workers, the Worker runs locally in `workerd` while a cloud proxy routes requests between public cloud endpoints and the local process.

This matters for webhook work: external services need a public URL, while the developer needs local code, breakpoints, and hot reload. Prefer an Alchemy dev/preview URL for webhook callbacks when available, then configure the third-party webhook target to that URL for the session or preview stage.

Use explicit dev ports when the app has multiple local services or a fixed callback URL:

```ts
export const Worker = Cloudflare.Worker("Worker", {
  main: "./src/worker.ts",
  dev: {
    port: 3000,
  },
});
```

Dev-mode rules:

- Treat cloud resources created by `alchemy dev` as real resources, not emulators.
- Keep stage/profile explicit when working near shared accounts.
- Return local/public URLs from stack outputs so the agent can test the live route.
- Verify webhook flows with the provider's actual delivery logs when available.
- Stop the dev process cleanly; destroy dev/preview resources when they are no longer needed and the stack owns them.

## Stage and profile rules

Treat stage and profile as part of the deployment contract:

- Stage isolates state and physical names. The default is developer-specific; use explicit `--stage prod`, `--stage staging`, or `--stage pr-123` for shared environments.
- Profile selects credentials. First deploy may prompt interactively and save credentials under `~/.alchemy/profiles.json`; non-interactive CI must have profiles or provider credentials prepared before deploy.
- Production scripts should pass both `--stage prod` and the intended `--profile`.
- Preview deploys should derive a deterministic stage from the PR, branch, or issue id and should destroy that stage when it is no longer needed.

Useful commands:

```bash
bun alchemy deploy ./alchemy.run.ts --stage dev_cm
bun alchemy deploy ./alchemy.run.ts --stage prod --profile prod
bun alchemy destroy ./alchemy.run.ts --stage pr-123 --profile preview
alchemy login --configure
alchemy login --profile prod --configure
```

Never use `Date.now()` or random timestamps in physical names. Let Alchemy generate names from stack, stage, and logical id, or use a deterministic name tied to the environment.

## Bindings and runtime dependencies

Prefer bindings over manually threading deployed identifiers through environment variables. A binding is deploy-time data attached to a runtime resource so the function/worker receives exactly the infrastructure dependency it needs.

For Cloudflare, bind platform resources directly into a Worker or Vite app:

```ts
export const Bucket = Cloudflare.R2Bucket("Bucket");

export const Worker = Cloudflare.Worker("Worker", {
  main: "./src/worker.ts",
  bindings: {
    Bucket,
  },
});
```

Keep Postgres connection details in the app's config/secrets layer and expose
the runtime client through a service Layer. Only bind a database-like Cloudflare
resource when the repo has an explicit reason not to use Postgres for that data.

For Effect-native runtimes, keep runtime services and deploy wiring separate. Alchemy owns cloud resources and bindings; Effect services own runtime behavior. Use Layers at the stack boundary when the resource requires a runtime implementation.

### Capability shape: `Binding.Service` + `Binding.Policy`

Every Alchemy capability ships as a pair of layers:

- `Binding.Service` — runtime SDK wrapper, provided on the **Function/Worker** Effect (bundled into the deployed artifact).
- `Binding.Policy` — deploy-time IAM/binding attachment, provided on the **Stack** via `AWS.providers()()`, never bundled.

For Cloudflare, the worker `bindings: { ... }` field handles both sides automatically. For AWS, the Service layer goes on the Function and the Policy layer must be enabled at the stack level. The default `AWS.providers()` already enables the common policy layers; only reach for `AWS.providers()(extraLayers)` when you author or override a capability.

### `Alchemy.RuntimeContext` on runtime-only methods

Bindings expose a typed callable whose inner Effect carries an `Alchemy.RuntimeContext` requirement. Treat that as a colored function:

- The **outer** Effect (setup at function init) does NOT require `RuntimeContext`.
- The **inner** Effect (the actual SDK call) MUST require `RuntimeContext` and only runs inside a deployed Function/Worker.

If a service wraps a binding and accidentally leaks `WorkerEnvironment` / `Lambda.FunctionEnvironment` into its interface, that service becomes cloud-coupled. Resolve cloud env services once during Layer construction and close over them — do not expose them as requirements on consumer Effects.

## Effect platform rules in app/runtime code

Alchemy stacks and Worker/Function bodies run as Effect programs. Do not reach for raw async or Node primitives inside `Effect.gen`:

| Don't                                       | Do                                                   |
| ------------------------------------------- | ---------------------------------------------------- |
| `import fs from "node:fs/promises"`         | `const fs = yield* FileSystem.FileSystem`            |
| `await fs.readFile(p, "utf8")`              | `yield* fs.readFileString(p)`                        |
| `import path from "pathe"` / `node:path`    | `const path = yield* Path.Path`                      |
| `await fetch(...)`                          | `yield* HttpClient.HttpClient` + `HttpClientRequest` |
| `new Promise((res) => setTimeout(res, ms))` | `yield* Effect.sleep(Duration.millis(ms))`           |
| `Effect.promise(() => listSqlFiles(dir))`   | Make the helper itself return an `Effect`            |

Pure transformations do not need Effect wrappers. Suspend environment reads
and side effects in Effect; classify expected thrown failures when crossing an
external boundary. Wrapping a CPU calculation does not make that calculation
interruptible. Keep internal operations in Effect once a driver has been adapted,
and run them only at the host or runtime boundary that requires it.

This applies to **stack bodies, custom resource helpers, and tests**. Tests must use `FileSystem.FileSystem` / `Path.Path` for any file/path access.

Polling rules for deploy/runtime tests:

- Use `Effect.repeat` with `Schedule` + an `until` predicate and a bounded `times: N` cap.
- Do not write `while (Date.now() < deadline)` loops — they ignore interruption and leak into the vitest timeout.

```ts
// good — declarative, bounded, interruption-safe
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

## Provider lifecycle tests

When authoring custom Alchemy providers/resources, add provider-style tests with `alchemy/Test/Vitest` rather than only unit-testing helper functions. These tests exercise the real Alchemy plan/apply engine, private scratch state, repeated deploys, and destroy behavior in one Effect program.

Use this shape for resource lifecycle tests:

```ts
import * as Test from "alchemy/Test/Vitest";
import { expect } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as ProviderNamespace from "../src/ProviderNamespace/index.ts";

const { test } = Test.make({ providers: ProviderNamespace.providers() });

test.provider("create, update, and delete resource", (stack) =>
  Effect.gen(function* () {
    const client = yield* ProviderNamespace.Client;

    const created = yield* stack.deploy(
      Effect.gen(function* () {
        return yield* ProviderNamespace.Resource("TestResource", {
          name: "v1",
        });
      }),
    );
    expect(created.resourceId).toBeDefined();

    // Verify live provider state through the provider SDK/client, not only
    // through returned attributes.
    const live1 = yield* client.get(created.resourceId);
    expect(live1.name).toBe("v1");

    const updated = yield* stack.deploy(
      Effect.gen(function* () {
        return yield* ProviderNamespace.Resource("TestResource", {
          name: "v2",
        });
      }),
    );
    expect(updated.resourceId).toBe(created.resourceId);

    const live2 = yield* client.get(updated.resourceId);
    expect(live2.name).toBe("v2");

    yield* stack.destroy();
  }),
);
```

Provider test rules:

- Configure providers once per file with `const { test } = Test.make({ providers: Namespace.providers() })`.
- Prefer real provider SDK/client assertions for integration tests. If live credentials or real resources are expensive/dangerous, use a fake service layer but still run through `test.provider`, `stack.deploy(...)`, repeated deploy, and `stack.destroy()`.
- Test create → update/noop/replace as appropriate → destroy in the same `test.provider` body so Alchemy state is shared across deploys.
- Use the scratch stack handed to the test; do not write to `.alchemy/` or shared state from provider tests.
- Provider implementations should close over services at provider construction (`const client = yield* Client` before returning lifecycle methods), matching Cloudflare providers. Do not leave `yield* Client` requirements inside `read`/`diff`/`reconcile`/`delete` unless the effect is explicitly provided there; `test.provider` should catch this with a “Service not found” failure.
- For live provider tests that need credentials, resolve them through the same AuthProvider/config path as `alchemy deploy` (for example env-method credentials or an `alchemy login` test profile). Skip or gate the test when credentials are absent; do not commit secrets.
- Preserve useful public-contract tests, including pure calculations. Do not
  require unit tests for every private selection/name/status/mapping helper;
  provider tests should continue to verify real lifecycle semantics.

## Build and type checking

Always type-check before committing changes that touch a stack, custom resource, or runtime binding:

```bash
bun tsc -b
```

This runs the workspace build in project-reference mode. CI fails on type errors, so this is non-negotiable. When stale artifacts or dependency drift cause unexplained failures, fall back to a clean rebuild:

```bash
bun run build       # clean + tsc + build the alchemy package
bun build:clean     # full reset: clean . + bun i + build + download env
```

`bun build:clean` removes untracked files (preserving `.env`), reinstalls dependencies, rebuilds, and refreshes environment files. Treat it as a recovery command, not a routine one.

## Secrets and config

Do not commit provider tokens, API keys, generated profiles, or state files unless the repo explicitly owns a remote state backend and the file is designed for version control.

Use these rules:

- Prefer provider profiles or CI secrets for deploy credentials.
- Use Alchemy secret resources or provider-native secret resources for runtime secrets.
- Keep non-secret config out of secret resources. Runtime configuration is a named config file in the repo, read through `effect/Config`; on Workers, bundle the named configs and let the deploy set only the selector var ([ADR-0014](../../docs/adr/0014-named-config-files-over-flags-and-env.md)).
- In darkmatter repos, route durable secrets through the repo's existing SOPS/Himitsu/CI secret path instead of inventing a new `.env` convention.
- Document which profile, account, zone, region, or project owns each deploy target.

## CI deploys

CI should be deterministic and non-interactive:

1. Install dependencies with the repo's locked package manager command.
2. Run type checks before deploy.
3. Authenticate the provider without a browser prompt.
4. Deploy with explicit stack path, stage, and profile.
5. Print or capture stack outputs for smoke tests.
6. Destroy preview stages on branch/PR cleanup when the workflow owns temporary infrastructure.

Example CI command shape:

```bash
bun install --frozen-lockfile
bun tsc -b
bun alchemy deploy ./alchemy.run.ts --stage "$ALCHEMY_STAGE" --profile "$ALCHEMY_PROFILE"
```

If a deploy failure starts in provider auth, profile lookup, state lock/state persistence, or missing CI secrets, fix that layer before changing resource code.

## Preview URLs and webhooks

Public previews are an expected Alchemy workflow:

- PR deploys should use `--stage pr-<number>` and post the resulting app URL back to the PR when the repo has GitHub access.
- Local development should use `alchemy dev` when a webhook or collaborator needs to reach a public URL backed by local code.
- Preview URLs should be derived from stack outputs or provider resources, not guessed from PR numbers.
- Webhook tests should exercise the real external sender when feasible, not only `curl`.
- Cleanup should destroy preview stages on PR close/merge and retire temporary webhook registrations.

## Verification

Always verify the real deployed target when the request concerns deploy behavior:

```bash
bun alchemy deploy ./alchemy.run.ts --stage "$STAGE" --profile "$PROFILE"
curl -fsS "$DEPLOYED_URL"
```

For local dev behavior, run the dev server and hit both local and public/proxied URLs when Alchemy prints both:

```bash
bun alchemy dev ./alchemy.run.ts --stage "$STAGE" --profile "$PROFILE"
curl -fsS "$LOCAL_URL"
curl -fsS "$PUBLIC_PREVIEW_URL"
```

For Effect-native workers/functions, prefer a deployed fixture or smoke route over a purely local assertion. Fresh Workers, Lambda URLs, queues, cron, and DNS often need bounded retries for propagation; use `Effect.retry` or `Effect.repeat` with `Schedule`, not manual polling loops.

## Review checklist

- The stack path is explicit where the repo has multiple apps or packages.
- Alchemy is used as the deploy/dev control plane unless the repo has an explicit reason not to.
- Stack name, logical IDs, stage names, and physical names are stable and deterministic.
- Provider and state store choices are intentional for the environment.
- Prod deploys pass explicit `--stage` and `--profile`.
- `alchemy dev` is configured for local loops that need real cloud resources, public preview URLs, or webhook testing.
- Runtime resources use bindings rather than scattered string env vars where Alchemy supports bindings.
- Secrets are not committed, echoed in logs, or encoded into stack outputs.
- CI deploys are non-interactive and verify stack outputs or live endpoints.
- Preview deploys have a destroy path.
- Effect code uses typed errors, Layers, and `Schedule` for retries; Promise SDKs
  are adapted at their edge, and pure transformations stay plain TypeScript.
- Provider operations own completion, errors, and cleanup. File splits hide real
  complexity and retain configured limits with documented, targeted exceptions.

## Contributing back to `alchemy-effect`

If a darkmatter repo needs a missing provider feature, the path is usually a PR upstream rather than a local fork. Two conventions matter when you open that PR:

- **PR title** uses conventional commits (`feat(aws/s3): add bucket lifecycle rules`, `fix(website): mobile theme metas`).
- **PR description** never starts with a `#` or `##` heading — GitHub already renders the title above it. Use `###` at most, and only when the description genuinely has multiple sections. Lead with a short prose summary or a code snippet that shows the new shape; cut anything that restates what the diff already shows. Never include a "Test plan" or checklist.
- **Outstanding work** belongs in the PR-creation chat, not in the PR body. If something is unfinished or needs manual verification, mark the PR as draft and tell the user what is outstanding.
- **Body delivery**: write the body to a temp file and pass `--body-file` to `gh pr create` / `gh pr edit`. Heredoc/`--body "$(cat …)"` mangles backticks across `gh` versions.

If you edit tutorial docs under `website/src/content/docs/tutorial/`, one concept gets one `##` heading, one diff snippet, and one prose paragraph. "Two/three things just happened" + a numbered list is the smell that says split the snippet.

If you edit resource JSDoc, run `bun generate:api-reference` to refresh `website/src/content/docs/providers/{Cloud}/{Resource}.md`. The generated markdown is overwritten on every regeneration — never hand-edit it.

`reference/provider-implementation.md` has the detailed conventions you need before touching anything under `packages/alchemy/src/` upstream.

## References

- `reference/upstream-concepts.md` — Alchemy v2 and `alchemy-effect` concepts applied during app/deploy work.
- `reference/examples.md` — `alchemy-run/alchemy-effect/examples` directories mapped to common deploy scenarios.
- `reference/provider-implementation.md` — file system, reconciler doctrine, capability shape, tags, runtime context, test fixtures, JSDoc/docs, and tutorial standards for upstream provider contributions.
- `reference/alchemy-effect/` — pinned git submodule of `alchemy-run/alchemy-effect` for current source, examples, docs, and upstream agent instructions.
