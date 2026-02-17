#!/usr/bin/env bash
set -euo pipefail

mkdir -p static/data

MANIFEST_URL="${MANIFEST_URL:-https://github.com/PaulHax/align-spark/releases/download/data/manifest.json}"

curl -fsSL -L "$MANIFEST_URL" -o static/data/manifest.json
echo "Fetched manifest.json from $MANIFEST_URL"
