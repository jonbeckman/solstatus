# AGENTS.md

## Voice

Use Simplified Technical English in formal, operational, and other sensible components of the document where you’re establishing specifics.
Use Plain Language in introductory, expository, friendly, and other sensible components of the document where you’re drawing the reader in or keeping them engaged.

## Validation

- Before handing work back, run `nub run typecheck`, `nub run lint`, `nub run format`, and `nub run test` from the repo root.
- Treat the task as incomplete until those checks pass, unless you explicitly report why a command could not be run or why a failure is unrelated to your changes.
- During iteration, scoped or package-local checks are fine for speed, but the final handoff should still include the repo-root validation commands above.

## Release Management

- Add a Tegami release entry under `.tegami/` when a change has an observable effect on a published package.
- Use the `release:none` label for a change with no observable effect, and explain that choice in the pull request.
- Do not edit `VERSION`, package versions, `CHANGELOG.md`, or `.tegami/publish-lock.yaml` on a feature branch. The automated version pull request owns those files.

## Local Development

- Use `nub run dev` from the repository root to start the API workers and the TanStack Start app together.
- Copy `.env.example` to `.env` and `packages/infra/.dev.vars.example` to `packages/infra/.dev.vars` before local infra work.
- Do not deploy production infrastructure from a cloud agent without explicit approval.
