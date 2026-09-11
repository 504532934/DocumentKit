#!/usr/bin/env sh
set -eu

curl -sS "${DOCUMENTKIT_URL:-http://127.0.0.1:3000}/v1/pdf" \
  -H 'content-type: application/json' \
  ${DOCUMENTKIT_API_KEY:+-H "authorization: Bearer $DOCUMENTKIT_API_KEY"} \
  -d '{"html":"<!doctype html><h1>Hello from DocumentKit</h1>"}' \
  --output document.pdf
