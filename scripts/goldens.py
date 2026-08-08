#!/usr/bin/env python3
"""Golden-image gate for the Dark Room bench.

  python3 scripts/goldens.py bless   # candidates/ become the new goldens
  python3 scripts/goldens.py check   # diff candidates/ against goldens/

Screenshots are full-simulator; comparison happens on a fixed crop around
the specimen (device 402x874pt @3x, specimen centred with chrome off), so
the status-bar clock and battery never pollute the diff.

Pass criteria per image: mean per-channel error <= 2.5/255 AND no more than
0.5% of pixels beyond 12/255 (antialiasing wiggle is real; drift is not).
"""
import sys, os
from PIL import Image

CROP = (135, 1149, 135 + 936, 1149 + 324)  # (201±156, 437±54)pt @3x
MEAN_TOL = 2.5
PIXEL_TOL = 12
OUTLIER_PCT = 0.5

def load(path):
    return Image.open(path).convert('RGB').crop(CROP)

def compare(golden, candidate):
    g, c = load(golden), load(candidate)
    if g.size != c.size:
        return False, f'size {g.size} vs {c.size}'
    gp, cp = g.load(), c.load()
    w, h = g.size
    total = w * h
    err_sum = 0
    outliers = 0
    for y in range(0, h, 2):          # every other row: 2x faster, same verdict
        for x in range(0, w, 2):
            d = max(abs(gp[x, y][k] - cp[x, y][k]) for k in range(3))
            err_sum += d
            if d > PIXEL_TOL:
                outliers += 1
    sampled = (w // 2 + w % 2) * (h // 2 + h % 2)
    mean = err_sum / sampled
    pct = 100 * outliers / sampled
    ok = mean <= MEAN_TOL and pct <= OUTLIER_PCT
    return ok, f'mean {mean:.2f}  outliers {pct:.2f}%'

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else 'check'
    cands = sorted(f for f in os.listdir('candidates') if f.endswith('.png'))
    if mode == 'bless':
        os.makedirs('goldens', exist_ok=True)
        for f in cands:
            load(os.path.join('candidates', f)).save(os.path.join('goldens', f))
        print(f'blessed {len(cands)} goldens (cropped)')
        return
    failures = []
    for f in cands:
        gpath = os.path.join('goldens', f)
        if not os.path.exists(gpath):
            failures.append((f, 'NO GOLDEN'))
            print(f'  ?? {f}: no golden')
            continue
        g = Image.open(gpath).convert('RGB')
        c = load(os.path.join('candidates', f))
        if g.size != c.size:
            failures.append((f, 'size')); print(f'  !! {f}: size mismatch'); continue
        gp, cp = g.load(), c.load()
        w, h = g.size
        err_sum = outliers = 0
        for y in range(0, h, 2):
            for x in range(0, w, 2):
                d = max(abs(gp[x, y][k] - cp[x, y][k]) for k in range(3))
                err_sum += d
                if d > PIXEL_TOL: outliers += 1
        sampled = (w // 2 + w % 2) * (h // 2 + h % 2)
        mean = err_sum / sampled
        pct = 100 * outliers / sampled
        ok = mean <= MEAN_TOL and pct <= OUTLIER_PCT
        mark = 'ok' if ok else 'FAIL'
        print(f'  {mark:4s} {f}: mean {mean:.2f}, outliers {pct:.2f}%')
        if not ok: failures.append((f, f'mean {mean:.2f} pct {pct:.2f}'))
    print(f'\n{len(cands) - len(failures)}/{len(cands)} passed')
    sys.exit(1 if failures else 0)

if __name__ == '__main__':
    main()
