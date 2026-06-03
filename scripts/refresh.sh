#!/bin/sh
set -eu

PORT="${PORT:-8080}"
ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
STAMP="$(date +%s)"

npm run build:bank

EXISTING_PID="$(lsof -ti tcp:${PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "${EXISTING_PID}" ]; then
  echo "Restarting server on port ${PORT}..."
  kill ${EXISTING_PID} >/dev/null 2>&1 || true
  sleep 1
fi

nohup sh -c "cd \"$ROOT_DIR\" && exec node ./scripts/dev-server.mjs" >/tmp/os-oa-web.log 2>&1 </dev/null &

for _ in 1 2 3 4 5; do
  sleep 1
  if curl -fsS "http://localhost:${PORT}/" >/dev/null 2>&1; then
    open "http://localhost:${PORT}/?t=${STAMP}&subject=os&type=mcq&chapter=all"
    echo "Updated and opened: http://localhost:${PORT}/?t=${STAMP}&subject=os&type=mcq&chapter=all"
    exit 0
  fi
done

echo "Server failed to start on http://localhost:${PORT}" >&2
exit 1
