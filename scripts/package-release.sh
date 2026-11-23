#!/usr/bin/env bash
# Bundle compiled server/client and production manifests without .env or node_modules.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
version="${1:?Usage: package-release.sh <version> [output-dir]}"
out="${2:-release}"
if ! [[ "$version" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]; then
  echo 'Invalid version argument' >&2
  exit 1
fi
[[ -d server/dist && -d server/public ]] || { echo 'Run npm run build first' >&2; exit 1; }
mkdir -p "$out"
out="$(cd "$out" && pwd)"
staging="$(mktemp -d)"
trap 'rm -rf "$staging"' EXIT
mkdir -p "$staging/curtbox/server" "$staging/curtbox/client"
cp -R server/dist server/public "$staging/curtbox/server/"
cp package.json "$staging/curtbox/"
cp server/package.json "$staging/curtbox/server/"
cp client/package.json "$staging/curtbox/client/"
[[ ! -f package-lock.json ]] || cp package-lock.json "$staging/curtbox/"
cp README.md .env.example Dockerfile docker-compose.yml compose.ghcr.yml "$staging/curtbox/"
cp -R docs "$staging/curtbox/docs"
tar -C "$staging" -czf "$out/curtbox-${version}-app.tar.gz" curtbox
if command -v sha256sum >/dev/null 2>&1; then
  (cd "$out" && sha256sum "curtbox-${version}-app.tar.gz" > SHA256SUMS.txt)
else
  (cd "$out" && shasum -a 256 "curtbox-${version}-app.tar.gz" > SHA256SUMS.txt)
fi
printf 'Created %s and SHA256SUMS.txt\n' "$out/curtbox-${version}-app.tar.gz"
