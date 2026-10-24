# AGENTS.md

## Voice

Use Simplified Technical English in formal, operational, and other sensible components of the document where you’re establishing specifics.
Use Plain Language in introductory, expository, friendly, and other sensible components of the document where you’re drawing the reader in or keeping them engaged.

## Validation

- Before handing work back, run `nub run typecheck`, `nub run lint`, `nub run format`, and `nub run test` from the repo root.
- `nub run test` is tester-army/e2e exclusively (`docs/e2e.md`). Do not add Vitest or another runner.
- Treat the task as incomplete until those checks pass, unless you explicitly report why a command could not be run or why a failure is unrelated to your changes.
- During iteration, scoped or package-local checks are fine for speed, but the final handoff should still include the repo-root validation commands above.

## No guard scripts

Do not add scripts, tests, or CI steps that only police the repo's own files, history, or config (for example migration-history hashes, file-list or lockfile-shape checks). Fix the real cause, or rely on the tool that already enforces it (wrangler and Alchemy track applied migrations). Add a guard only when Jonathan asks for it in the PR or the card.

## End-to-end testing

- Pins: `e2e@0.21.3`, `@e2e-dev/web@0.15.3`, `@e2e-dev/github@0.4.3`, `@e2e-dev/decision@0.3.0`. Drizzle stays `drizzle-orm` / `drizzle-kit` `1.0.0-rc.5-ab785fc`.
- Layout: root `e2e.config.ts`, tests in `tests/**/*.e2e.ts`, helpers in `tests/support/`, lifecycle under `tests/lifecycle/` when needed, runner/cleanup/accounting under `scripts/e2e/` (copied `cf-clef-executor`, `ai-report`, `ai-usage`).
- Unmodified upstream skill: `.agents/skills/e2e/` (symlink `.claude/skills/e2e`). Coverage map: `.cursor/skills/verify-solstatus/features/`.
- After each `agent.act`, assert exactly with `expect`. No mocks, request interception, or test-only endpoints.
- Pass `--changed-since <ref>` to `nub exec e2e list` and `nub exec e2e run` directly. Do not write `nub run test -- --changed-since`. e2e treats a flag after `--` as a test file.
- Declare credentials/secrets in `e2e.config.ts`, never in test code. Default agent uses Clef through Cloudflare AI Gateway (`maxSteps`/`maxModelCalls` 20). Never deploy, pay, or send from tests.
- Permanent exceptions to keep: better-auth (not Clerk), Cloudflare D1 (not PlanetScale), no turbo, existing Effect CLI stack, deploy-on-release, Tegami go/no-go.

## Cloud-agent PR artifacts

Source: Jonathan, 2026-10-24, skill `cloud-agent-pr-artifacts`.

Every user-visible or behavioral pull request carries proof as cloud-agent artifacts. Attach screenshots. Attach a short video when a flow matters. Attach test or build logs. Drive the app first, then attach the proof. Do not commit screenshot binaries.

Skip this proof only for pin-only, config-only, or markdown-only work.

Boot the SolStatus app (the TanStack Start app and the API workers) from the repository root with `nub run dev`. Run the affected end-to-end tests through `.cursor/skills/verify-solstatus`. Select those tests with the e2e Test Filters API and the Cloudflare Clef decision model through Cloudflare AI Gateway. Never print gateway tokens or other secrets.

## Release Management

- Add a Tegami release entry under `.tegami/` when a change has an observable effect on a published package.
- Use the `release:none` label for a change with no observable effect, and explain that choice in the pull request.
- Do not edit `VERSION`, package versions, `CHANGELOG.md`, or `.tegami/publish-lock.yaml` on a feature branch. The automated version pull request owns those files.

## Local Development

- Use `nub run dev` from the repository root to start the API workers and the TanStack Start app together.
- Copy `.env.example` to `.env` and `packages/infra/.dev.vars.example` to `packages/infra/.dev.vars` before local infra work.
- Do not deploy production infrastructure from a cloud agent without explicit approval.
