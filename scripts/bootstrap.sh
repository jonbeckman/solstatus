#!/bin/bash
set -euo pipefail

cp packages/infra/.dev.vars.example packages/infra/.dev.vars
cp .env.example .env

# Install dependencies
nub install --frozen-lockfile

# Run migrations
yes | nub run db:setup
