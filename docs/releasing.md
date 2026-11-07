# Releasing SolStatus

SolStatus ships one release: the `solstatus` package in the
[alchemy.new](https://alchemy.new) registry, under the `solzero` org. A
deployer picks a version on alchemy.new and deploys it to their own Cloudflare
account. The workspace packages are private and are not published to npm.

[Tegami](https://tegami.fuma-nama.dev) tracks the release as
`release:solstatus`. It writes the next version to the root `VERSION` file,
prepends `CHANGELOG.md`, and tags `v<version>`.

## Version policy

From `2.1.0`, follow Semantic Versioning:

- `patch` for a compatible fix
- `minor` for a backward-compatible feature
- `major` for a breaking change

Do not bump the version in a feature pull request. Tegami writes the next
version in `tegami/version-packages`.

## Add a release entry

Every pull request with an observable effect on a deployment must add
a Markdown file under `.tegami/`. Use a clear file name such as
`.tegami/2026-08-27-fix-monitor-interval.md`.

```md
---
packages:
  "release:solstatus": patch
---

## Fix monitor interval parsing

The CLI now rejects a check interval below 30 seconds.
```

Target only `release:solstatus`. Choose `patch`, `minor`, or `major`
according to the version policy. Write the note for the people who deploy and run SolStatus. Include
required action in the note. Tegami adds pull request and contributor links to
the GitHub Release.

Run `nub run tegami` to create an entry interactively. The pull request preview
workflow posts the combined version and release-note preview. A change with no
observable effect on a deployment can use the `release:none` label
after the pull request explains why it needs no entry.

## Automated release flow

1. Merge a feature pull request with its pending `.tegami/` entries.
2. Wait for `Validate` to pass on `master`. The `Release` workflow then runs
   `nub run tegami ci` only for same-repository `push` events. It opens or
   updates `tegami/version-packages` with the solzero-release GitHub App
   token, so that pull request runs normal CI.
3. Review the version pull request. It updates `VERSION`,
   prepends `CHANGELOG.md`, consumes the pending entries, and writes
   `.tegami/publish-lock.yaml`.
4. Merge the version pull request. After validation, the release workflow
   tags `v<version>` and creates the GitHub Release. Then the `registry` job
   builds the stack, prunes development dependencies, and publishes that
   version to alchemy.new with `SolZeroAI/alchemy-new-publish-action`.

Do not edit generated version files in a feature pull request. Review them in
the version pull request before merge.

This workflow versions and publishes the registry package. It does not deploy
production Cloudflare infrastructure.

Every non-draft pull request runs `Registry dry run`, which packs the same
archive without uploading it. Keep its `exclude` list identical to the one in
the `registry` job.

## Repository settings

Enable **Allow GitHub Actions to create and approve pull requests** in the
repository Actions settings. Keep workflow permissions restricted to the values
in each workflow. The release workflow grants `contents: read` by default.
Contents and pull request writes use the solzero-release app token
(`RELEASE_APP_CLIENT_ID` and `RELEASE_APP_PRIVATE_KEY`). The job `GITHUB_TOKEN`
stays read-only.

Only the `registry` job requests `id-token: write`, and it runs in the
`alchemy-new` environment. The alchemy.new trusted publisher for
`solzero/solstatus` matches `SolZeroAI/solstatus`, `release.yml`, the
`alchemy-new` environment, and `refs/heads/master`. No registry token is
stored in the repository.

Create the `release:none` label for pull requests that have no user-visible
release note.

## Failure recovery

Re-run the failed `Release` workflow after a network, registry, or GitHub API
failure. Tegami checks existing tags and GitHub releases, so the retry
continues the same version without duplicating work. If only the `registry`
job failed, re-run that job.

If a released change has a defect, fix it in a new pull request and add a new
release entry. Keep an existing release tag at its original commit. Never
delete or move a published release tag.
