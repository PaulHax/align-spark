#!/usr/bin/env bash
set -euo pipefail

mkdir -p static/data

if [ -z "${MANIFEST_URL:-}" ]; then
  echo "Error: MANIFEST_URL environment variable is not set"
  exit 1
fi

curl -fsSL "$MANIFEST_URL" -o static/data/manifest.json
echo "Fetched manifest.json from MANIFEST_URL"
