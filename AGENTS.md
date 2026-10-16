# AGENTS.md

## Voice

Use Simplified Technical English in formal, operational, and other sensible components of the document where you’re establishing specifics.
Use Plain Language in introductory, expository, friendly, and other sensible components of the document where you’re drawing the reader in or keeping them engaged.

## Validation

- Before handing work back, run `nub run typecheck`, `nub run lint`, `nub run format`, and `nub run test` from the repo root.
- `nub run test` is tester-army/e2e exclusively (`docs/e2e.md`). Do not add Vitest or another runner.
- Treat the task as incomplete until those checks pass, unless you explicitly report why a command could not be run or why a failure is unrelated to your changes.
- During iteration, scoped or package-local checks are fine for speed, but the final handoff should still include the repo-root validation commands above.

## End-to-end testing

- Pins: `e2e@0.17.0`, `@e2e-dev/web@0.12.0`, `@e2e-dev/github@0.3.3`.
- Layout: root `e2e.config.ts`, tests in `tests/**/*.e2e.ts`, helpers in `tests/support/`, lifecycle under `tests/lifecycle/` when needed, runner/cleanup/accounting under `scripts/e2e/` (copied `cf-clef-executor`, `ai-report`, `ai-usage`).
- Unmodified upstream skill: `.agents/skills/e2e/` (symlink `.claude/skills/e2e`). Coverage map: `.cursor/skills/verify-solstatus/features/`.
- After each `agent.act`, assert exactly with `expect`. No mocks, request interception, or test-only endpoints.
- Declare credentials/secrets in `e2e.config.ts`, never in test code. Default agent uses Clef through Cloudflare AI Gateway (`maxSteps`/`maxModelCalls` 20). Never deploy, pay, or send from tests.
- Permanent exceptions to keep: better-auth (not Clerk), Cloudflare D1 (not PlanetScale), no turbo, existing Effect CLI stack, deploy-on-release, Tegami go/no-go.

## Release Management

- Add a Tegami release entry under `.tegami/` when a change has an observable effect on a published package.
- Use the `release:none` label for a change with no observable effect, and explain that choice in the pull request.
- Do not edit `VERSION`, package versions, `CHANGELOG.md`, or `.tegami/publish-lock.yaml` on a feature branch. The automated version pull request owns those files.

## Local Development

- Use `nub run dev` from the repository root to start the API workers and the TanStack Start app together.
- Copy `.env.example` to `.env` and `packages/infra/.dev.vars.example` to `packages/infra/.dev.vars` before local infra work.
- Do not deploy production infrastructure from a cloud agent without explicit approval.
