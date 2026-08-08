/**
 * Golden-image freeze switch. When set (via the ?freeze=1 launch param),
 * every self-running clock in the specimen holds still — the hold loop
 * never starts, the glyph does not draw itself, breath and sweeps pin at
 * their reduced-motion values — so a screenshot taken at any moment is the
 * same screenshot. Read wherever useReducedMotion is read; a frozen bench
 * and a reduce-motion bench are deliberately the same bench.
 */
export const freeze = { current: false };
