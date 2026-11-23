#!/usr/bin/env bash
# Intended for a GitHub Codespace or VS Code devcontainer, not production.
set -euo pipefail
cd "$(dirname "$0")/.."
npm ci --no-audit --no-fund
if [[ ! -f .devcontainer/local.env ]]; then
  umask 077
  admin_password="$(openssl rand -hex 12)"
  session_secret="$(openssl rand -hex 32)"
  admin_hash="$(npm run -s password-hash -- "$admin_password")"
  {
    printf 'DATABASE_URL=postgres://party:curtbox-dev-only@db:5432/party\n'
    printf 'POSTGRES_PASSWORD=curtbox-dev-only\n'
    printf 'SESSION_SECRET=%s\n' "$session_secret"
    printf "ADMIN_PASSWORD_HASH='%s'\n" "$admin_hash"
    printf 'PORT=3000\n'
  } > .devcontainer/local.env
  printf '%s\n' "$admin_password" > .devcontainer/admin-password.local.txt
  echo "Generated isolated development configuration. Local admin password is saved in .devcontainer/admin-password.local.txt."
else
  echo "Reusing existing .devcontainer/local.env; not changing your development credentials."
fi
echo "Start Curtbox with: bash .devcontainer/start.sh"
