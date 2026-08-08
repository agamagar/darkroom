import type { NegotiateButtonProps } from '../specimens/NegotiateButton';

/**
 * The bench's axes. Adding a variation should mean editing this file and
 * nothing else: add a value to an axis, teach `propsFor` what it means, and
 * the picker row grows to fit on its own.
 *
 * Axes are independent on purpose — every combination is reachable, including
 * the ones that turn out to be bad. Finding those is the point of a bench.
 */

export const STATES = ['default', 'pressed', 'inactive'] as const;
export type State = (typeof STATES)[number];

/**
 * `outline`, `ghost` and `beacon` are hidden from the bench — their specs
 * still live in NegotiateButton, so restoring one is a matter of adding its
 * name back to this list.
 */
export const TYPES = [
  'gradient',
  'eclipse',
  'ember',
  'molten',
  'drawn',
  'concave',
  'material',
  'safelight',
  'neon',
  'carve',
  'chrome',
  'blueprint',
  'aurora',
  'ripple',
  'prism',
  'hologram',
  'starfield',
  'filament',
  'spotlight',
  'inkwell',
  'stitch',
  'comet',
] as const;
export type Type = (typeof TYPES)[number];

/** The base UI under the specimen — rendered by `screens.tsx`, not the button. */
export const SCREENS = ['void', 'negotiate', 'globe', 'card', 'light'] as const;
export type Screen = (typeof SCREENS)[number];

/** Gyroscope-driven glow movement: how far the light leans with the device. */
export const GYROS = ['off', 'medium', 'extreme'] as const;
export type Gyro = (typeof GYROS)[number];

/**
 * Max glow offset in pt at full tilt, per level.
 *
 * These move the gradient's FOCAL POINT, not the wash itself — see GlowWash.
 * Expressed in pt of hotspot travel, then converted against each wash's own
 * radii, so the same number reads consistently across a tight ellipse and
 * molten's 2.4x spread.
 */
export const GYRO_AMPLITUDE: Record<Gyro, number> = {
  off: 0,
  medium: 12,
  extreme: 30,
};

/**
 * The self-drawing arrow. It belongs to the icon slot, not to any one style,
 * so the bench drives it across every variant rather than letting `drawn`
 * own it. A second arrow from the Working File slots in as another value.
 */
export const ICONS = ['off', 'trend'] as const;
export type Icon = (typeof ICONS)[number];

export type Selection = {
  state: State;
  type: Type;
  screen: Screen;
  gyro: Gyro;
  icon: Icon;
};

export const INITIAL_SELECTION: Selection = {
  state: 'default',
  type: 'gradient',
  screen: 'void',
  gyro: 'off',
  icon: 'off',
};

/**
 * Maps a selection onto the specimen's props. Keeping this translation in one
 * place means the specimen never learns about the bench — it keeps a plain
 * props API, and the bench does the adapting.
 */
export function propsFor({
  state,
  type,
  icon,
}: Selection): Partial<NegotiateButtonProps> {
  return {
    variant: type,
    icon,
    forcePressed: state === 'pressed',
    disabled: state === 'inactive',
  };
}
