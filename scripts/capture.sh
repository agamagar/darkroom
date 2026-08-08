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
