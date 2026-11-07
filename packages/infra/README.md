# @solstatus/infra

Infrastructure configuration and deployment for SolStatus.

## Installation

```bash
nub add @solstatus/infra
```

## Database Management

`nub run dev` applies the D1 migrations to the local `alchemy dev` database. Deploys apply them
to the remote database through Alchemy (`nub run cli -- --stage prod`).

To generate the latest migration files, run:
```shell
nub run db:generate
```

Then restart `nub run dev` to apply it locally.

To view or edit a deployed database with Drizzle Studio, set `CLOUDFLARE_DATABASE_ID`,
`CLOUDFLARE_ACCOUNT_ID`, and `CLOUDFLARE_D1_TOKEN`, then run:
```shell
nub run db:studio
```
