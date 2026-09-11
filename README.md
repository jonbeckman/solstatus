[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/jonbeckman/solstatus)
![GitHub](https://img.shields.io/github/license/jonbeckman/solstatus)
![GitHub release (with filter)](https://img.shields.io/github/v/release/jonbeckman/solstatus)
![GitHub contributors](https://img.shields.io/github/contributors/jonbeckman/solstatus)
![GitHub commits since latest release (by SemVer including pre-releases)](https://img.shields.io/github/commits-since/jonbeckman/solstatus/latest)

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

This repository requires Node.js 24.15.0 and Nub 0.4.11.

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

For a holistic dev experience, it is best to run dev from the root of the repo.

### Init

First, copy the `./packages/infra/.dev.vars.example` file to `./packages/infra/.dev.vars`.

Then, run the following command to confirm you're using the correct CF account:
and run to confirm you're using the correct CF account:
```sh
nub exec wrangler whoami
```

Run the migrations and (optionally) seed the database:
```sh
# this is a convenience script that runs db:touch, db:generate, db:migrate, and db:seed
nub run db:setup
```

### Dev
This repo uses multiple workers, each split into their own workspace. To run everything together:

```sh
# Start both the API (monitor workers) and the TanStack Start app
nub run dev
```

If you need to run components separately:

```sh
# Run just the API (includes both executor and trigger workers)
nub run dev:api

# Run just the TanStack Start app
nub run dev:app

# Run the API executor worker
nub run --filter '@solstatus/api' dev:api-exec

# Run the API trigger worker
nub run --filter '@solstatus/api' dev:api-trigger
```

### Deployment

To deploy the entire application:
```sh
nub run deploy:prod
```

To deploy components separately:
```sh
# Deploy just the TanStack Start app
nub run deploy:prod:app

# Deploy just the API workers
nub run deploy:prod:api
```

### Maintenance
Update dependencies

Dependabot automatically creates pull requests for dependency updates weekly. For manual updates:
```sh
nub exec ncu -t minor -u
nub install
```

## Database Management

See the [infra README](./packages/infra/README.md#database-management) for more details.

## CI/CD

### Dependency Management
This repository uses Dependabot to keep dependencies up to date:
- npm dependencies are checked weekly (grouped as minor and patch updates)
- GitHub Actions are checked monthly
- PR limits are set to avoid overwhelming with dependency updates

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
