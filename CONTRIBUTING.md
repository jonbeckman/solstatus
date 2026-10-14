# Contributing to SolStatus

This repository is the AGPL-3.0 SolStatus uptime monitor:
[github.com/jonbeckman/solstatus](https://github.com/jonbeckman/solstatus).
Read the [README](README.md) for the product picture and local setup.

SolStatus is a self-hosted Cloudflare uptime monitor. The repository publishes
the `solstatus` CLI and the `@solstatus/common`, `@solstatus/api`,
`@solstatus/app`, and `@solstatus/infra` packages.

## Before you start

- Search existing issues and pull requests before opening a new one.
- For substantial changes, open an issue first so maintainers can align on the
  problem and approach.
- Report suspected vulnerabilities privately to the maintainers. Do not include
  credentials or exploit details in a public issue.

## Development setup

This repository requires Node.js 24.15.0 and Nub 0.9.6. `.node-version`,
`.nvmrc`, and `packageManager` are the source of truth. Install Nub, then
install dependencies from the repository root:

```sh
nub install --frozen-lockfile
```

Keep oxlint and oxfmt. Do not add eslint, prettier, biome, or dprint.

Create a focused branch, keep changes scoped, and add or update tests for
behavior changes.

## Releases

This repository uses Tegami to version and publish the npm packages. Read
[docs/releasing.md](docs/releasing.md) for changelog format, the version pull
request, and npm publish. Do not bump `package.json` or `VERSION`, or rewrite
`CHANGELOG.md`, in a feature pull request. Add a `.tegami/` entry when a
published package has an observable change. Use the `release:none` label when
it does not.

## Validation

Run the repository checks before opening a pull request:

```sh
nub run typecheck
nub run lint
nub run format
nub run test
```

If a check cannot run in your environment, explain why in the pull request.

## Pull requests

A strong pull request includes:

- A concise explanation of the problem and solution
- Tests or a clear explanation of why tests are not needed
- Documentation and config example updates when behavior or configuration changes
- A `.tegami/` release entry, or a `release:none` explanation
- No credentials, private data, internal URLs, or organization-specific defaults
- No production deploy, npm publish, or paid spend

By submitting a contribution, you agree that it may be distributed under the
repository's AGPL-3.0 license and that you have the right to contribute it.
