#!/bin/bash
set -euo pipefail

if [ ! -f .env ]; then
  cp .env.example .env
  # Each checkout signs local sessions with its own secret.
  sed -i.bak "s/^BETTER_AUTH_SECRET=\"\"/BETTER_AUTH_SECRET=\"$(openssl rand -hex 32)\"/" .env
  rm -f .env.bak
fi

nub install --frozen-lockfile
