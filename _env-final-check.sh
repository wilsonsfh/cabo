#!/usr/bin/env bash
# Finite task-local verification, not a recurring service. All browser work shares the prescribed lock.
set -u
cd /home/ubuntu/AI-round/analysis/p2-prototype
TARGET=$(date -u -d '2026-11-25 15:40:00 UTC' +%s)
while [ "$(date -u +%s)" -lt "$TARGET" ]; do
  NOW=$(date -u +%s); LEFT=$((TARGET-NOW))
  printf 'Final environment regression reserved for 23:40 +08; %ss remain.\n' "$LEFT"
  if [ "$LEFT" -gt 120 ]; then sleep 120; else sleep "$LEFT"; fi
done
printf '\n23:40 +08 — final environment regression started.\n'
printf '23:40 +08 — Final regression started: Node tests, fresh 5818 responsive verification, existing smoke.py via 5818 port-only override. No rules/test source files edited.\n' >> _env-progress.txt
node --test tests/*.test.mjs > _env-node-tests.txt 2>&1
NODE_STATUS=$?
printf 'Node suite exit: %s\n' "$NODE_STATUS"
if [ -f _env-server.pid ]; then kill "$(cat _env-server.pid)" 2>/dev/null || true; fi
sleep 1
HOST=127.0.0.1 PORT=5818 node server.mjs > _env-server-final.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
sleep 1
flock -w 180 /tmp/chrome.lock python3 _env-verify.py > _env-verify-final.log 2>&1
ENV_STATUS=$?
kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
trap - EXIT
printf 'Responsive audit exit: %s\n' "$ENV_STATUS"
# Execute the existing smoke test source unchanged except its hardcoded verification port.
# __file__ remains its original location, preserving ROOT and all test assertions.
flock -w 180 /tmp/chrome.lock python3 - <<'PY' > _env-smoke-final.log 2>&1
from pathlib import Path
p=Path('/home/ubuntu/AI-round/analysis/p2-prototype/tests/smoke.py')
source=p.read_text().replace('5812','5818')
exec(compile(source,str(p),'exec'),{'__file__':str(p),'__name__':'__main__'})
PY
SMOKE_STATUS=$?
printf 'Existing smoke suite (5818) exit: %s\n' "$SMOKE_STATUS"
printf '{"nodeExit":%s,"environmentExit":%s,"smokeExit":%s,"finishedUtc":"%s"}\n' "$NODE_STATUS" "$ENV_STATUS" "$SMOKE_STATUS" "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" > _env-final-status.json
printf 'Final environment regression completed; all owned servers stopped.\n'
cat _env-final-status.json
