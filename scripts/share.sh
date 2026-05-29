#!/bin/sh
set -eu

python3 -m http.server 8080 >/tmp/os-oa-share.log 2>&1 &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

sleep 1
exec npx localtunnel --port 8080
