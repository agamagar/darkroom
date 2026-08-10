# Dark Room

A React Native / Expo staging rig for button design — 33 experimental
variants of one 272×68 pill, each a different material or physics: glow
washes, liquid chrome, ferrofluid, glazed ceramic, hyperspace, moiré
interference, a postage stamp, and friends.

Every variant inherits a shared skeleton: a press-owned hold clock,
state-floor breathing, gyroscope-driven light (focal points, never
layers), touch-position reactivity, and Reduce Motion fallbacks. A
variant is a data row plus (optionally) one effect renderer.

The bench: split-view control pane with axes for State · Type · Screen ·
Icon · Motion, a pixel-density slider, and staging screens including a
measured Figma-ported FTUE canvas the specimen drops into.

Golden-image pipeline included: `?type=&state=&chrome=off&freeze=1`
launch URLs drive the app deterministically, `scripts/capture.sh` walks
the matrix on a simulator, `scripts/goldens.py bless|check` gates every
change (64 goldens, byte-stable under freeze).

Run it: `npx expo start --go` (Expo Go, SDK 54). Fonts note: the design's
Google Sans Flex is proprietary and not included — the label falls back
to the platform font; drop instanced TTFs into `src/assets/fonts` and
set the names in `src/theme.ts` for full fidelity.

Built almost entirely in conversation with Claude.
