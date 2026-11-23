#!/usr/bin/env bash
# Run from the devcontainer terminal. Do not source a production .env here.
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ ! -f .devcontainer/local.env ]]; then
  echo "Missing .devcontainer/local.env. Run bash .devcontainer/bootstrap.sh first." >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
source .devcontainer/local.env
set +a
exec npm run dev
