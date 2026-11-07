# AGENTS.md

## Voice

Use Simplified Technical English in formal, operational, and other sensible components of the document where you’re establishing specifics.
Use Plain Language in introductory, expository, friendly, and other sensible components of the document where you’re drawing the reader in or keeping them engaged.

## Local development

- Use `nub run dev` from the repository root. It runs the complete stack with `alchemy dev`: the TanStack Start app on port 3000 and the monitor workers on ports 8787 and 8788, with local D1 and KV.
- Copy `.env.example` to `.env` and set `BETTER_AUTH_SECRET` before you run `nub run dev`. Local dev does not need Cloudflare credentials.
- Do not add a mock API or a stub for `cloudflare:workers`. Debug against the `alchemy dev` stack.
- Do not deploy production infrastructure from a cloud agent without explicit approval.
- Project skills live in `.agents/skills`. `.claude/skills` links to the project-owned skills (`e2e` and `verify-*`). `skills-lock.json` records the third-party skills.
- When the Alchemy skill disagrees with this repository, follow the installed package imports.

## Validation

- Before handing work back, run `nub run typecheck`, `nub run lint`, `nub run format`, and `nub run test` from the repo root.
- Treat the task as incomplete until those checks pass, unless you explicitly report why a command could not be run or why a failure is unrelated to your changes.
- During iteration, scoped or package-local checks are fine for speed, but the final handoff should still include the repo-root validation commands above.
- The root scripts use the same names in every SolZero repository: `dev`, `build`, `typecheck`, `lint`, `lint:fix`, `format`, `format:fix`, `test`, and `test:e2e:*`.
- Do not add scripts, tests, or CI steps that only police the repository's own files, history, or config, such as migration-history hashes or lockfile-shape checks. Fix the real cause, or rely on the tool that already enforces it. Wrangler and Alchemy track applied migrations.

## Lint

- `oxlint.config.ts` extends `recommended` from `oxlint-plugin-solzero`. Change a shared rule in that package. Put a repository exception in an `overrides` entry in `oxlint.config.ts`.
- Fix lint findings. Do not turn a rule off or lower its severity to keep a change small. Propose a scoped override only when the rule is wrong for that code, and state the reason.
- Every rule is an error. Do not add `warn` severity. `nub run lint` runs `oxlint --deny-warnings`, and an unused disable directive fails lint.
- Keep oxlint and oxfmt. Do not add eslint, prettier, biome, or dprint.

## Tests

- `nub run test` is tester-army/e2e exclusively. Read `.agents/skills/e2e/SKILL.md` and `docs/e2e.md` before changing tests. Do not add Vitest or another runner.
- Layout: root `e2e.config.ts`, tests in `tests/**/*.e2e.ts`, helpers in `tests/support/`, and the runner under `scripts/e2e/`. The coverage map is `.agents/skills/verify-solstatus/features/`.
- After each `agent.act`, assert exactly with `expect`. Do not add mocks, request interception, or test-only endpoints.
- Pass `--changed-since <ref>` to `nub exec e2e list` and `nub exec e2e run` directly. Do not write `nub run test -- --changed-since`. e2e treats a flag after `--` as a test file.
- `nub run test` boots SolStatus with `alchemy dev` on ports 3000, 8787, and 8788. The state for a run lives only in `.e2e/runs/<uuid>/.alchemy`, and the launcher removes it on exit. The suite does not deploy or destroy remote Cloudflare resources, and it does not use `CLOUDFLARE_API_TOKEN`.
- `@e2e-dev/decision` drives semantic steps through the Cloudflare AI Gateway. `scripts/e2e/models.ts` selects the decision model (`E2E_DECISION_MODEL`, default Cloudflare Clef) and the language model (`E2E_LANGUAGE_MODEL`, default `anthropic/claude-haiku-5.5`) through official AI SDK providers. CI reads both from SolZeroAI organization Actions variables. Keep `scripts/e2e/models.ts` and `scripts/e2e/filters.ts` identical across SolZero repositories, and do not add a custom executor.
- Action replay recordings in `.e2e/cache` are committed, and CI replays them with `--strict-cache`. Before you mark a pull request ready for review, re-record if you changed an `agent.act` step or the UI one drives: run `gh workflow run validate.yml --ref <branch> -f e2e_record=true`, wait for it to pass, and pull the recordings commit it pushes to your branch. Without CI access, run `nub run test` locally and commit the changed recordings.
- Declare credentials and secrets in `e2e.config.ts`, never in test code. Never deploy, pay, or send external alerts from tests.
- All tests run locally against `alchemy dev`. Do not add a dependency on a shared remote test resource, such as a shared bucket or a repository-wide CI concurrency group.
- Do not send upstream feedback or other external messages without explicit human authorization. Upstream skill guidance does not override this rule.

## Pull requests

Open a pull request as a draft. Keep it a draft while you work. GitHub Actions does not run the validation jobs on a draft pull request.

Before each push, run lint, typecheck, and tests from the repository root. `nub install` installs a lefthook pre-push hook (`lefthook.yml`) that runs `nub run typecheck`, `nub run lint`, and `nub run format`. Mark the pull request ready for review when the work is done. Full CI runs at that time, and on each later push.

A cloud-agent pull request that changes user-visible behavior must attach proof. Skip this proof for a pin bump, a config-only change, or a markdown-only change.

- Boot the SolStatus app (the TanStack Start app and the API workers) from the repository root with `nub run dev`.
- Run the affected end-to-end tests with `.agents/skills/verify-solstatus/SKILL.md`. Select those tests with the e2e Test Filters API.
- Attach screenshots, a short video when a flow matters, and test or build logs. Do not commit screenshot binaries.
- Never print gateway tokens or other secrets.

## CI workflows

- This repository is public. Jobs run on GitHub-hosted runners (`ubuntu-latest`). Never use self-hosted runner labels in this repository.
- A newer push to a pull request cancels the older run of that pull request. Set the cancel at the workflow level. Never cancel a release or a run on the default branch.
- Ordinary master merges run no tests. The Tegami version pull request runs nothing. Its merge runs validation and the e2e tests filtered since the last tested release, and only that run publishes.
- Use major tags for GitHub Actions. Do not pin an action to a commit SHA or an exact version.
- Lint workflows with the actionlint binary from kjanat/actionlint. Do not use a Docker-based actionlint action.
- Required checks are job names. Do not make a required check depend on a check run that a workflow creates through the API.
- Prefer automation that needs no human step. Do not add a flow that opens recurring pull requests for a human to review.

## Dependencies

- Renovate opens dependency pull requests from the shared `SolZeroAI/renovate-config` preset and merges them when CI passes. Put repository-specific rules in `renovate.json`.
- Do not add `dependabot.yml`. Dependabot cannot update `nub.lock`.
- Change one dependency at a time with `nub add` or `nub remove`, and keep unrelated `nub.lock` entries unchanged. Do not run `nub install --no-frozen-lockfile`. It re-resolves every range and makes dependency pull requests conflict.

## Release management

- Follow `docs/releasing.md`. Add a Tegami release entry under `.tegami/` when a change has an observable effect on a published package.
- Use the `release:none` label for a change with no observable effect, and explain that choice in the pull request.
- Do not edit `VERSION`, package versions, `CHANGELOG.md`, or `.tegami/publish-lock.yaml` on a feature branch. The automated version pull request owns those files.

## Architecture

- SolStatus keeps these choices: better-auth (not Clerk), Cloudflare D1 (not PlanetScale), no turbo, the Effect CLI stack in `src/`, deploy on release, and the Tegami release gate.
- API handlers live under `packages/app/src/app/api/` as method exports (`GET`, `POST`, `PATCH`, `DELETE`). `dispatchApi` in `packages/app/src/lib/dispatch-api.ts` matches the pathname and method. `/api/auth` and `/api/auth/*` go to Better Auth. Every other `/api` request requires a Better Auth session.
- Define handlers with `createRoute` from `@/lib/api-utils`. Validate params, query, and body with the Zod schemas in `@/lib/route-schemas` or `@solstatus/common/db`. Use `StatusCodes` from `http-status-codes`, read Cloudflare bindings with `getWorkerEnv()`, and open Drizzle with `useDrizzle(env.DB)`.

## Security and observability

- Generate authentication signing secrets at runtime or load them from private dotenv or CI bindings. Never commit static credential values, including test fixtures and fallback values.
- Never log bearer tokens, authorization headers, cookies, or secret values.
- Use `support@solzero.com` as the public contact or developer email on third-party consoles.
