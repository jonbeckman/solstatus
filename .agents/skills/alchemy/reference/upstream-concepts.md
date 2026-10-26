# Upstream Concepts

This reference distills the Alchemy v2 docs and the `alchemy-run/alchemy-effect` `AGENTS.md` guidance into development and deploy-review rules. Check upstream before applying these notes because the project is still moving quickly.

## Alchemy v2 app deploy concepts

- `Alchemy.Stack` is the top-level deployment unit. It groups resources, wires providers, persists state, and returns deploy outputs.
- `alchemy.run.ts` is the CLI convention. Any default-exported stack file can be deployed by passing the path, for example `alchemy deploy stacks/api.ts`.
- Stages isolate deployments. The default is developer-specific; shared environments should be explicit: `--stage staging`, `--stage prod`, or `--stage pr-123`.
- Profiles own credentials. First interactive deploy can configure a default profile; CI and production deploys should pass explicit profiles and avoid prompts.
- State is part of the deploy design. Choose local state only for local/dev examples; use provider-backed or team-approved state for shared environments.
- Stack outputs are the deploy contract for smoke tests and downstream stacks. Return URLs, names, IDs, and dashboards that humans or CI need after deploy.
- Cross-stack references should use typed stack handles instead of stringly-typed lookups when one stack depends on another stack's persisted outputs.

## Alchemy dev concepts

- `alchemy dev` uses the same stack model as deploy, but adapts resources for local development.
- Infrastructure still deploys to real cloud providers. R2, D1, KV, queues, databases, and similar resources are not local mocks.
- Supported runtime code runs locally with hot reload. For Cloudflare Workers, Alchemy uses `workerd` locally and a cloud proxy to route requests.
- Dev mode is useful when external systems need to call the app, including webhooks, OAuth callbacks, and partner integrations.
- Resources can adapt based on `ALCHEMY_PHASE=dev`. Keep dev-specific behavior explicit and do not leak it into production deploys.
- Custom dev ports belong in resource config when callback URLs or multiple local services require stable routing.

## Darkmatter preference

Alchemy should be the default control plane for new Darkmatter TypeScript/Effect infrastructure:

- Use Alchemy stages for dev, preview, staging, and prod isolation.
- Use `alchemy dev` before adding one-off tunnels or local emulators.
- Use Alchemy-managed deploy outputs as the source of truth for preview URLs.
- Use provider CLIs for inspection and emergency operations, not as the long-term deploy path unless documented.

## Infrastructure-as-Effects

`alchemy-effect` frames deploys as Infrastructure-as-Effects:

- A cloud provider offers services.
- A service offers resources, functions, and bindings.
- A resource has input properties, output attributes, stable properties, and lifecycle operations.
- A function/runtime is a special resource whose implementation is an `Effect`.
- Runtime dependencies are inferred from Effect requirements and wired through bindings and Layers.

For application deploys, the practical implication is simple: declare cloud infrastructure and runtime wiring in one type-checked Effect program, but keep domain behavior in runtime services rather than turning `alchemy.run.ts` into application logic.

## Resource lifecycle model

When reviewing resource or provider behavior, use the upstream lifecycle vocabulary:

- `Diff` decides whether changes update, replace, or leave a resource alone.
- `Read` refreshes live cloud state and may detect an existing unowned resource.
- `Pre-Create` exists for special circular cases such as functions needing stubs before final wiring.
- `Reconcile` converges live state to desired state for greenfield create, update, and adoption.
- `Delete` must be idempotent because state persistence can fail after cloud deletion.

For ordinary deploy configuration, this means:

- Avoid resource names that fight Alchemy's deterministic naming.
- Expect provider APIs to be eventually consistent.
- Use bounded retries for first requests and async propagation.
- Treat adoption as a deliberate action, not an accidental takeover.

## Binding model

Bindings connect resources to runtime functions and workers without hand-writing brittle environment glue.

- `Binding.Service` is the runtime SDK/service wrapper that application code uses.
- `Binding.Policy` is the deploy-time attachment that grants permissions or injects platform bindings.
- Binding data is collected by the stack and received by providers during reconcile.
- Circular resource relationships should usually be solved through bindings rather than one-off string props.

In app deploys, prefer provider-supported `bindings` fields and typed helpers over manually copying resource IDs into env vars.

## Effect runtime rules

Apply these upstream `AGENTS.md` rules when writing deployable runtime logic or tests:

- Use Effect platform services for files, paths, HTTP, clocks, sleeps, and retries.
- Wrap sync Node APIs in `Effect.sync` or `Effect.try` so they participate in tracing and interruption.
- Do not call raw async I/O inside `Effect.gen`; make helpers return Effects and `yield*` them.
- Use typed errors and `Effect.retry` or `Effect.repeat` with `Schedule` for transient provider and edge propagation failures.
- Do not poll with `while (Date.now() < deadline)` loops. Use bounded schedules and predicates.
- Do not use `Date.now()` to construct physical resource names. Use generated names or deterministic names.

## Test and smoke deploy guidance

For Effect-native Workers, Workflows, Lambdas, and similar runtimes:

- Put fixtures next to the test suite that owns them.
- Deploy the fixture once in `beforeAll`, destroy it in `afterAll`, and drive it over HTTP or the relevant public interface.
- Retry the first request through edge/URL propagation.
- Use `NO_DESTROY=1` only as a local iteration aid and never as a CI default.
- Prefer one deployed smoke fixture that exercises bindings end-to-end over isolated mocks that skip provider wiring.

## Documentation and examples

When contributing provider resources upstream, docs are generated from source JSDoc. Edit JSDoc on the resource `.ts` file and regenerate; do not manually edit generated provider markdown.

For app repos, keep local deploy examples small and executable. Link to upstream examples for full patterns instead of copying large example trees into project docs.
