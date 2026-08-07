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

export const TYPES = [
  'gradient',
  'outline',
  'ghost',
  'beacon',
  'eclipse',
  'ember',
  'molten',
  'drawn',
  'concave',
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
 * Sized against what is being moved, not against the button: the wash
 * ellipse is ~240pt wide inside a 272pt pill (wider still on molten, which
 * spreads 2.4x). A 10pt shift is 4% of that — below the perceptual floor for
 * a soft gradient, which is why the first pass read as nothing happening.
 */
export const GYRO_AMPLITUDE: Record<Gyro, number> = {
  off: 0,
  medium: 18,
  extreme: 48,
};

export type Selection = {
  state: State;
  type: Type;
  screen: Screen;
  gyro: Gyro;
};

export const INITIAL_SELECTION: Selection = {
  state: 'default',
  type: 'gradient',
  screen: 'void',
  gyro: 'off',
};

/**
 * Maps a selection onto the specimen's props. Keeping this translation in one
 * place means the specimen never learns about the bench — it keeps a plain
 * props API, and the bench does the adapting.
 */
export function propsFor({ state, type }: Selection): Partial<NegotiateButtonProps> {
  return {
    variant: type,
    forcePressed: state === 'pressed',
    disabled: state === 'inactive',
  };
}
