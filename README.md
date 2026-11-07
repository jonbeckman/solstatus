[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/SolZeroAI/solstatus)
![GitHub](https://img.shields.io/github/license/SolZeroAI/solstatus)
![GitHub release (with filter)](https://img.shields.io/github/v/release/SolZeroAI/solstatus)
![GitHub contributors](https://img.shields.io/github/contributors/SolZeroAI/solstatus)
![GitHub commits since latest release (by SemVer including pre-releases)](https://img.shields.io/github/commits-since/SolZeroAI/solstatus/latest)

# SolStatus

An uptime monitoring service that is easy and cheap to run at scale. Create endpoint checks for uptime, latency, and status code. Supports OpsGenie, for alerts when there are two or more consecutive failures.

![Demo dashboard](./docs/dashboard-demo.gif)

## Quick Start

```bash
# Install dependencies
nub install

# Run the CLI
nub run cli --help
```

This repository requires Node.js 24.15.0 and Nub 0.9.6.

### Common Commands

```bash
# Deploy infrastructure
nub run cli -- --fqdn uptime.example.com

# Deploy to production
nub run cli -- --fqdn uptime.example.com --stage prod

# Destroy infrastructure
nub run cli -- --fqdn uptime.example.com --phase destroy
```

## Local Dev

`nub run dev` runs the whole stack on your machine with `alchemy dev`: the dashboard, both monitor workers, D1, and KV. It does not need a Cloudflare account.

```sh
cp .env.example .env
# Set BETTER_AUTH_SECRET in .env, for example with `openssl rand -hex 32`.
nub install
nub run dev
```

The dashboard is at http://127.0.0.1:3000. The monitor workers use ports 8787 and 8788. Alchemy applies the D1 migrations when the stack starts, and keeps local state under `packages/infra/.alchemy`.

The dashboard signs in with an email one-time code. No mailer is configured, so the code is printed in the `alchemy dev` log.

### Deployment

Production workers and the dashboard deploy through Alchemy:

```sh
nub run cli -- --fqdn uptime.example.com --stage prod
```

## Database Management

See the [infra README](./packages/infra/README.md#database-management) for more details.

## CI/CD

### Dependency Management
Renovate opens dependency pull requests from the shared `SolZeroAI/renovate-config` preset and merges them when CI passes.

### npm Publishing
Tegami versions and publishes the npm packages after Validate succeeds on `master`:
- `solstatus` - Main CLI package
- `@solstatus/common` - Shared utilities and schemas
- `@solstatus/api` - API workers
- `@solstatus/app` - Web application
- `@solstatus/infra` - Infrastructure tools

See [docs/releasing.md](./docs/releasing.md). To enable npm publishing:
1. Create an npm access token at https://www.npmjs.com/
2. Add it as a GitHub secret named `NPM_TOKEN`
3. Enable **Allow GitHub Actions to create and approve pull requests**
4. Create the `release:none` label for toolchain-only pull requests
