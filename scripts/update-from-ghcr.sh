#!/usr/bin/env bash
# Pull the published image and recreate only containers that need changing.
# Uses the .env file in the repo root and preserves its named Postgres volume.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if [[ ! -f .env ]]; then
  echo 'Missing .env. Copy .env.example and configure your secrets and CURTBOX_IMAGE.' >&2
  exit 1
fi
if ! grep -Eq '^[[:space:]]*CURTBOX_IMAGE[[:space:]]*=[[:space:]]*ghcr\.io/' .env; then
  echo 'Set CURTBOX_IMAGE=ghcr.io/owner/repo:vX.Y.Z in .env first.' >&2
  exit 1
fi
if ! command -v docker >/dev/null 2>&1; then
  echo 'Docker CLI is required.' >&2
  exit 1
fi
# Docker Compose inherits this directory name as its project name, matching
# the original docker-compose.yml when run from the same directory.
compose=(docker compose -f compose.ghcr.yml)
"${compose[@]}" config --quiet
printf 'Pulling configured Curtbox app image...\n'
"${compose[@]}" pull app
printf 'Recreating app if the image changed (Postgres volume is retained)...\n'
"${compose[@]}" up -d --no-build
"${compose[@]}" ps
