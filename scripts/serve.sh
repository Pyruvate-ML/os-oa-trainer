#!/bin/sh
set -eu

PORT="${PORT:-8080}"

EXISTING_PID="$(lsof -ti tcp:${PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "${EXISTING_PID}" ]; then
  echo "Stopping existing server on port ${PORT}..."
  kill ${EXISTING_PID} >/dev/null 2>&1 || true
  sleep 1
fi

echo "Serving at http://localhost:${PORT}"
exec node ./scripts/dev-server.mjs
