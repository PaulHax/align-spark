#!/usr/bin/env bash
set -euo pipefail

TAG="data"
FILE="static/data/manifest.json"

if [ ! -f "$FILE" ]; then
  echo "Error: $FILE not found"
  exit 1
fi

# Create the release if it doesn't exist
if ! gh release view "$TAG" &>/dev/null; then
  gh release create "$TAG" --title "Data" --notes "Auto-managed release for data assets"
fi

# Upload (overwrite if exists)
gh release upload "$TAG" "$FILE" --clobber

echo "Uploaded. Asset URL:"
gh release view "$TAG" --json assets --jq '.assets[] | select(.name == "manifest.json") | .url'
