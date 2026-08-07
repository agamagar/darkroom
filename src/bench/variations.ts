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
] as const;
export type Type = (typeof TYPES)[number];

/** The base UI under the specimen — rendered by `screens.tsx`, not the button. */
export const SCREENS = ['void', 'negotiate', 'globe', 'card', 'light'] as const;
export type Screen = (typeof SCREENS)[number];

export type Selection = {
  state: State;
  type: Type;
  screen: Screen;
};

export const INITIAL_SELECTION: Selection = {
  state: 'default',
  type: 'gradient',
  screen: 'void',
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
