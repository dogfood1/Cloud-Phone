#!/usr/bin/env sh
set -e
cd "$(dirname "$0")"
ENV_FILE="../.env"
if [ -f .env ]; then
  ENV_FILE=".env"
elif [ ! -f "$ENV_FILE" ]; then
  echo "Missing env: copy .env.example to .env or create ../.env" >&2
  exit 1
fi
exec docker compose --env-file "$ENV_FILE" "$@"
