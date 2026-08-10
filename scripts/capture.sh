#!/bin/bash
# Golden-image capture: drives the bench through every variant x state via
# launch URLs and screenshots the simulator. Prereqs: Metro on :8082, the
# bench already open in Expo Go on the booted simulator.
#
#   ./scripts/capture.sh candidates   # capture current build
#   ./scripts/capture.sh goldens      # capture straight into the goldens
#
# Then: python3 scripts/goldens.py check|bless
set -euo pipefail
OUT="${1:-candidates}"
UDID="${UDID:-booted}"
PORT="${PORT:-8082}"
SETTLE="${SETTLE:-2.4}"
mkdir -p "$OUT"

# Restart Metro before capturing. This repo lives on Google Drive, which
# starves Metro of filesystem events - a long-running Metro serves a STALE
# graph and the goldens pass against old code (observed: a silhouette
# removal that "changed nothing" until Metro restarted). A fresh process
# reads the tree as it is now.
if [ "${KEEP_METRO:-}" != "1" ]; then
  pkill -f "expo start" 2>/dev/null || true
  sleep 2
  (npx expo start --go --port "$PORT" > /tmp/capture-metro.log 2>&1 &)
  until grep -q "Waiting on" /tmp/capture-metro.log 2>/dev/null; do sleep 2; done
  # First bundle is the slow one; do it before the timed loop.
  xcrun simctl openurl "$UDID" "exp://127.0.0.1:${PORT}/--/?chrome=off&freeze=1"
  for i in $(seq 1 60); do
    grep -q "Bundled" /tmp/capture-metro.log 2>/dev/null && break
    sleep 2
  done
fi

VARIANTS=$(node -e "
const m=require('fs').readFileSync('src/bench/variations.ts','utf8');
console.log(m.match(/TYPES = \[(.*?)\]/s)[1].match(/'([a-z]+)'/g).map(x=>x.slice(1,-1)).join(' '));
")

for v in $VARIANTS; do
  for st in default pressed; do
    url="exp://127.0.0.1:${PORT}/--/?type=${v}&state=${st}&chrome=off&freeze=1"
    xcrun simctl openurl "$UDID" "$url"
    sleep "$SETTLE"
    xcrun simctl io "$UDID" screenshot "${OUT}/${v}-${st}.png" >/dev/null
    echo "captured ${v}-${st}"
  done
done
echo "done -> ${OUT}/"
