# Releasing SolStatus

This repository publishes five npm packages:

- `solstatus` — CLI
- `@solstatus/common` — shared schema and utilities
- `@solstatus/api` — monitor workers
- `@solstatus/app` — TanStack Start dashboard
- `@solstatus/infra` — Alchemy and Wrangler infrastructure

[Tegami](https://tegami.fuma-nama.dev) prepares versions, updates
`package.json` and the root `VERSION` file, and publishes to npm.

`VERSION` and the root `solstatus` package stay on the same SemVer value. The
current release is `2.1.0`.

## Version policy

From `2.1.0`, follow Semantic Versioning:

- `patch` for a compatible fix
- `minor` for a backward-compatible feature
- `major` for a breaking change

Do not bump the version in a feature pull request. Tegami writes the next
version in `tegami/version-packages`.

## Add a release entry

Every pull request with an observable effect on a published package must add
a Markdown file under `.tegami/`. Use a clear file name such as
`.tegami/2026-08-27-fix-monitor-interval.md`.

```md
---
packages:
  solstatus: patch
---

## Fix monitor interval parsing

The CLI now rejects a check interval below 30 seconds.
```

Target the package that changed. Choose `patch`, `minor`, or `major`
according to the version policy. Write the note for package consumers. Include
required action in the note. Tegami adds pull request and contributor links to
the GitHub Release.

Run `nub run tegami` to create an entry interactively. The pull request preview
workflow posts the combined version and release-note preview. A change with no
observable effect on a published package can use the `release:none` label
after the pull request explains why it needs no entry.

## Automated release flow

1. Merge a feature pull request with its pending `.tegami/` entries.
2. Wait for `Validate` to pass on `master`. The `Release` workflow then runs
   `nub run tegami ci` only for same-repository `push` events and opens or
   updates `tegami/version-packages`.
3. Review the version pull request. It updates `package.json` and `VERSION`,
   prepends `CHANGELOG.md`, consumes the pending entries, and writes
   `.tegami/publish-lock.yaml`.
4. Merge the version pull request. After validation, the release workflow
   builds the packages, publishes them to npm, and creates the GitHub Release.
   GitHub releases are not created until publish succeeds (`eager: false`).

Do not edit generated version files in a feature pull request. Review them in
the version pull request before merge.

This workflow versions and publishes npm packages. It does not deploy
production Cloudflare infrastructure.

## Repository settings

Enable **Allow GitHub Actions to create and approve pull requests** in the
repository Actions settings. Keep workflow permissions restricted to the values
in each workflow. The version and publish job needs `contents: write`,
`pull-requests: write`, and `id-token: write` for npm trusted publishing.

Create the `release:none` label for pull requests that have no user-visible
release note.

## Failure recovery

Re-run the failed `Release` workflow after a network, npm, or GitHub API
failure. Tegami checks existing tags, npm versions, and GitHub releases, so the
retry continues the same version without duplicating work.

If a released change has a defect, fix it in a new pull request and add a new
release entry. Keep an existing release tag at its original commit. Never
delete or move a published release tag.
