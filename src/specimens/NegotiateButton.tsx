import MaskedView from '@react-native-masked-view/masked-view';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient as SvgLinearGradient,
  Mask,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { theme } from '../theme';

/**
 * Figma: Away Working File, node 31:293 ("Negotiate flight").
 *
 * The ported `gradient` variant stacks three effects, back to front:
 *   1. a flat `primary/950` fill,
 *   2. a wide ellipse bleeding off the bottom edge, clipped by the pill,
 *   3. an inset box-shadow throwing purple up from the bottom.
 *
 * Figma exported the ellipse as an empty SVG because it is a blur with no
 * vector geometry, so it is rebuilt here as a radial gradient at the same
 * position and size the design gives it (240x77 at x=20.6, y=41.2 in a
 * 272x68 frame).
 *
 * The pressed state and the non-gradient variants are NOT in the design —
 * node 31:293 is a plain frame with no variants. They are designed here in
 * the component's own language: light from somewhere. Pressing always means
 * more light; each variant just keeps its light in a different place.
 */

const FRAME = { width: 272, height: 68 } as const;
const GLOW_ELLIPSE = { x: 20.58, y: 41.15, width: 239.76, height: 76.61 } as const;

/** Enough travel to feel the press without the 272pt pill looking rubbery. */
/**
 * How far past its own bounds the wash throws light, standing in for the
 * gaussian blur Figma applies to the source ellipse. Sized so the pill's
 * caps and bottom corners — which sat at normalised r 1.11 to 1.37, i.e.
 * outside the gradient entirely — all fall inside it.
 */
const BLUR_BLEED = 1.45;

const PRESSED_SCALE = 0.97;
/** Press-down should read instantly; the release can breathe. */
const PRESS_IN_MS = 90;
const PRESS_OUT_MS = 260;

export type NegotiateButtonVariant =
  | 'gradient'
  | 'outline'
  | 'ghost'
  | 'beacon'
  | 'eclipse'
  | 'ember'
  | 'molten'
  | 'drawn'
  | 'concave'
  | 'material'
  | 'safelight'
  | 'neon'
  | 'carve'
  | 'chrome'
  | 'blueprint'
  | 'aurora'
  | 'ripple'
  | 'hologram'
  | 'starfield'
  | 'spotlight'
  | 'stitch'
  | 'comet'
  | 'glitch'
  | 'pixel';

/**
 * Everything that differs between variants, as data. A variant is a row here,
 * never a fork in the render tree — that keeps press/disabled/a11y behaviour
 * identical across all six.
 */
type VariantSpec = {
  /** Container overrides applied on top of the shared pill geometry. */
  pill: ViewStyle;
  /**
   * The ellipse wash. `edge` picks which rim it hugs — `left` pools it in
   * the cap like liquid; rest/lit are its opacity asleep and pressed.
   * `squash` < 1 flattens it into a band. `core` adds a hot centre stop.
   */
  glow?: {
    edge: 'top' | 'bottom' | 'left' | 'center';
    color: string;
    rest: number;
    lit: number;
    squash?: number;
    core?: string;
    /**
     * Multiplies the ellipse radii. Above 1 the wash runs past the pill on
     * every side, so `overflow: hidden` clips it mid-falloff instead of the
     * gradient visibly ending inside the button.
     */
    spread?: number;
  };
  /** A halftone dot mesh over the fill, as on liquid-UI surfaces. */
  mesh?: boolean;
  /** ember's compressed bottom band, faded in by the press (molten's pressed state). */
  emberPress?: boolean;
  /** The deep-violet radial base of node 48:12304, under everything else. */
  violetBase?: boolean;
  /** The self-drawing negotiate glyph beside the label (2s loop). */
  drawIcon?: boolean;
  /**
   * Node 48:12304's stroke is white with a HORIZONTAL alpha ramp — a rim
   * light on the caps, gone across the middle. RN cannot gradient a
   * borderColor, so this draws the ring as an SVG stroke.
   */
  gradientBorder?: boolean;
  /**
   * Node 51:92's dished surface — a radial that is DARK at its centre and
   * bright at the rim, so the face reads pressed in. The design ties it to
   * the press: absent at rest, full while held.
   */
  dish?: boolean;
  /**
   * Node 51:92's top-edge light, rebuilt as a gradient so it can take the
   * tilt (a CSS inset shadow is a string, and not animatable). See
   * InsetThrow — the stops ARE the measured render, so this is the same
   * picture the boxShadow drew, only now it can move.
   */
  insetThrow?: boolean;
  /**
   * Pressing crossfades the ENTIRE face to concave's pressed appearance —
   * primary/950 base, top-edge inset throw, dish — as an opaque overlay
   * riding the press value, while this variant's own chrome (border ring)
   * dims out beneath it. At full press the button IS concave pressed.
   */
  concavePress?: boolean;
  /** Photo-paper label: latent at rest, develops to full under the press. */
  developLabel?: boolean;
  /** The light as the EDGE: a neon tube ring, overdriven by the press. */
  neonRing?: boolean;
  /** Matte deboss that forms while pressed — carve's the only lightless press. */
  carveInset?: boolean;
  /** Banded steel fill with a sheen that sweeps on tilt and press. */
  chromeBase?: boolean;
  /** Design-tool chrome (dashed border, handles) that fades as the press renders. */
  blueprintChrome?: boolean;
  /**
   * Bespoke effect layer, one renderer per kind (see VariantFx). Each
   * receives the press, the hold clock and the tilt, and owns its whole
   * look beyond the pill/glow/label basics.
   */
  fx?:
    | 'aurora'
    | 'ripple'
      | 'hologram'
    | 'starfield'
    | 'spotlight'
    | 'stitch'
    | 'comet'
    | 'glitch'
    | 'pixel';
  /** Label treatment. Gradient is the design's masked fill. */
  label:
    | {
        kind: 'gradient';
        colors?: readonly [string, string, ...string[]];
        locations?: readonly [number, number, ...number[]];
        angle?: { start: { x: number; y: number }; end: { x: number; y: number } };
      }
    | { kind: 'solid'; color: string };
};

const VARIANTS: Record<NegotiateButtonVariant, VariantSpec> = {
  /** The port of node 31:293, untouched. */
  gradient: {
    pill: {
      backgroundColor: '#181140',
      boxShadow: `inset 0px -16px 40px 0px ${theme.color.glow}`,
    },
    glow: { edge: 'bottom', color: theme.color.glow, rest: 0.55, lit: 0.95 },
    label: { kind: 'gradient' },
  },

  /** The quiet sibling: just a border until pressed, then the glow wakes. */
  outline: {
    pill: {
      backgroundColor: 'transparent',
      borderColor: 'rgba(139, 124, 246, 0.45)',
    },
    glow: { edge: 'bottom', color: theme.color.glow, rest: 0, lit: 0.6 },
    label: { kind: 'gradient' },
  },

  /** No container at all — the label carries it; press lights a halo. */
  ghost: {
    pill: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
    },
    glow: {
      edge: 'bottom',
      color: theme.color.glow,
      rest: 0,
      lit: 0.4,
      squash: 0.7,
    },
    label: { kind: 'gradient' },
  },

  /** Inverted: solid indigo, dark label, light thrown OUTWARD not held in. */
  beacon: {
    pill: {
      backgroundColor: theme.color.indigo500,
      borderColor: 'rgba(243, 241, 254, 0.18)',
      boxShadow: `0px 10px 44px 0px rgba(109, 92, 240, 0.55)`,
    },
    // Pressing floods the face with the lighter indigo from below.
    glow: { edge: 'bottom', color: theme.color.indigo400, rest: 0.35, lit: 0.9 },
    label: { kind: 'solid', color: '#181140' },
  },

  /** The gradient flipped: lit from above, bottom in shadow. The dark room. */
  eclipse: {
    pill: {
      backgroundColor: '#181140',
      boxShadow: `inset 0px 16px 40px 0px ${theme.color.glow}`,
    },
    glow: { edge: 'top', color: theme.color.glow, rest: 0.45, lit: 0.9 },
    label: { kind: 'gradient' },
  },

  /**
   * After Jakub Wuzik's "Recharge." liquid UI, recoloured into the house
   * indigo: a molten pool centred in a dark meshed pill, hot at the core,
   * bloom bleeding past the rim. Pressing stokes it.
   */
  molten: {
    pill: {
      backgroundColor: '#181140',
      // No border here: MoltenRim is the vessel's ONE stroke — a gradient
      // ring bright at the lip, settling to a crisp hairline down the sides.
      // Two nested strokes read as a double edge.
      borderWidth: 0,
      boxShadow: `inset 0px 0px 22px 0px rgba(109, 92, 240, 0.55), 0px 4px 32px 0px rgba(109, 92, 240, 0.28)`,
    },
    emberPress: true,
    glow: {
      edge: 'center',
      color: theme.color.glow,
      core: theme.color.indigo400,
      // Dimmer and tighter than before: the centre sat under the label at
      // near-full brightness and washed the text out. The pool now peaks at
      // 0.72 and hugs a smaller footprint, so it reads hot AND the label
      // reads at all.
      rest: 0.72,
      lit: 0.85,
      spread: 1.9,
    },
    mesh: true,
    label: { kind: 'solid', color: '#F3F1FE' },
  },

  /**
   * Port of node 48:12304 ("Negotiate", Portfolio file): deep-violet radial
   * base fading to black at the rim, glow off the bottom edge, an inset
   * throw from the bottom-RIGHT (#5847D6), a 1.5pt gradient stroke (see
   * gradientBorder), and the negotiate glyph that draws itself on a 2s loop.
   */
  drawn: {
    pill: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      boxShadow: 'inset -8px -16px 40px 0px #5847D6',
    },
    violetBase: true,
    drawIcon: true,
    gradientBorder: true,
    glow: { edge: 'bottom', color: theme.color.glow, rest: 0.5, lit: 0.9 },
    label: { kind: 'gradient' },
  },

  /**
   * Port of node 51:92 ("Concave button"), the one design that already has a
   * pressed variant. At rest: primary/950 lit from the top edge by an inset
   * #5847D6 throw. Pressed: a dish appears — a radial that is DARKEST at its
   * centre (#181140) and brightest at the rim (#4636B8), so the face reads
   * pushed in. The press does not brighten this button, it hollows it.
   */
  concave: {
    pill: {
      backgroundColor: '#181140',
      borderWidth: 0,
    },
    insetThrow: true,
    dish: true,
    label: {
      kind: 'gradient',
      // The sheen is a white band with one grey notch at 66%, angled
      // 114.6deg. (The node's 14px label is normalised to the bench-wide
      // 16px for cross-variant consistency.)
      colors: ['#F3F1FE', '#F3F1FE', '#CEC7FB', '#F3F1FE'],
      locations: [0.479, 0.623, 0.662, 0.698],
      // CSS 114.612deg -> pixel direction (0.909, 0.416). Converted to
      // normalised box coords for the label's own ~105x17 box, with CSS's
      // gradient-line length rule (|W sin| + |H cos| = 102.5, centred), the
      // axis runs off the box top and bottom - hence the out-of-range y.
      angle: { start: { x: 0.056, y: -0.753 }, end: { x: 0.944, y: 1.753 } },
    },
  },

  /**
   * The app's namesake, literally: a photographic darkroom. Deep red
   * safelight pooled low, and a label that behaves like photo paper — a
   * latent image at rest, developed to full white by the press. The one
   * variant where the light must NOT brighten (safelights cannot fog
   * paper); the press develops the print instead.
   */
  safelight: {
    pill: {
      backgroundColor: '#181140',
      borderColor: 'rgba(169, 155, 245, 0.14)',
      // The lamp hangs ABOVE the bench, as it does in a real darkroom.
      boxShadow: 'inset 0px 14px 36px 0px rgba(109, 92, 240, 0.5)',
    },
    glow: {
      edge: 'top',
      color: '#6D5CF0',
      core: '#A99BF5',
      rest: 0.5,
      lit: 0.5,
      squash: 0.75,
      spread: 1.3,
    },
    developLabel: true,
    label: { kind: 'solid', color: '#F3F1FE' },
  },

  /**
   * The light leaves the face and becomes the edge: a neon tube around a
   * near-empty interior, blooming outward. Pressing overdrives the tube.
   */
  neon: {
    pill: {
      backgroundColor: 'rgba(24, 17, 64, 0.35)',
      borderWidth: 0,
      boxShadow: '0px 0px 28px 0px rgba(109, 92, 240, 0.4)',
    },
    neonRing: true,
    label: { kind: 'solid', color: '#F3F1FE' },
  },

  /**
   * No light at all — the matte one. Raised out of the background by dual
   * shadows; pressing fades the raise and forms a deboss. Material instead
   * of luminance, as a control for the rest of the wheel.
   */
  carve: {
    pill: {
      // Lilac clay, lit: the surface carries the house hue and now also an
      // ambient sheen (the centre glow below) that drifts with the gyro's
      // focal shift — soft daylight moving over a matte object, not a lamp.
      backgroundColor: '#4636B8',
      borderColor: 'rgba(206, 199, 251, 0.2)',
      boxShadow:
        '-6px -8px 22px 0px rgba(206, 199, 251, 0.32), 8px 10px 24px 0px rgba(24, 17, 64, 0.6)',
    },
    glow: {
      edge: 'center',
      color: '#CEC7FB',
      core: '#F3F1FE',
      rest: 0.52,
      lit: 0.66,
      spread: 2.2,
    },
    carveInset: true,
    label: { kind: 'solid', color: '#F3F1FE' },
  },

  /**
   * Liquid metal: banded steel fill, dark label, and a diagonal sheen that
   * sweeps with the gyroscope — the one variant where tilt moves a
   * REFLECTION rather than a light. Pressing flicks the sheen across.
   */
  chrome: {
    pill: {
      backgroundColor: '#5847D6',
      borderColor: 'rgba(228, 212, 255, 0.45)',
      boxShadow: '0px 6px 24px 0px rgba(24, 17, 64, 0.55)',
    },
    chromeBase: true,
    label: { kind: 'solid', color: '#F3F1FE' },
  },

  /**
   * The bench looking at itself: dashed selection border, corner handles
   * and a dimension tag, over nothing. Pressing RENDERS the button — the
   * annotations fade out exactly as the finished glow fades in.
   */
  blueprint: {
    pill: {
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
    blueprintChrome: true,
    label: { kind: 'gradient' },
  },

  /**
   * drawn's body with concave's press: at rest the violet radial base,
   * bottom glow, bottom-right inset throw, gradient stroke and self-drawing
   * glyph — but pressing HOLLOWS it. The dish fades in and the glow holds
   * flat (lit = rest) so the press reads as concave's push-in, not drawn's
   * brightening. First deliberate cross-breed on the wheel.
   */
  material: {
    pill: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      boxShadow: 'inset -8px -16px 40px 0px #5847D6',
    },
    violetBase: true,
    drawIcon: true,
    gradientBorder: true,
    concavePress: true,
    glow: { edge: 'bottom', color: theme.color.glow, rest: 0.5, lit: 0.5 },
    label: { kind: 'gradient' },
  },

  /** Northern-light curtains drifting over a polar night. */
  aurora: {
    pill: { backgroundColor: '#181140', borderColor: 'rgba(169, 155, 245, 0.12)' },
    fx: 'aurora',
    label: { kind: 'solid', color: '#F3F1FE' },
  },

  /** neon's paradigm inverted: rings born at the centre, expanding out. */
  ripple: {
    pill: { backgroundColor: '#181140', borderColor: 'rgba(169, 155, 245, 0.16)' },
    fx: 'ripple',
    glow: { edge: 'center', color: '#6D5CF0', core: '#CEC7FB', rest: 0.25, lit: 0.4, spread: 2 },
    label: { kind: 'solid', color: '#F3F1FE' },
  },

  /** A translucent projection: scanlines, chromatic edges, hold flicker. */
  hologram: {
    pill: { backgroundColor: 'rgba(169, 155, 245, 0.07)', borderWidth: 0 },
    fx: 'hologram',
    label: { kind: 'solid', color: '#F3F1FE' },
  },

  /** Three star layers at different tilt depths; press ignites a nebula. */
  starfield: {
    pill: { backgroundColor: '#181140', borderColor: 'rgba(169, 155, 245, 0.1)' },
    fx: 'starfield',
    glow: { edge: 'center', color: '#6D5CF0', core: '#CEC7FB', rest: 0, lit: 0.55, spread: 2 },
    label: { kind: 'solid', color: '#E7E3FD' },
  },

  /** A lilac beam that follows the tilt at high gain; pressing widens it. */
  spotlight: {
    pill: { backgroundColor: '#181140', borderColor: 'rgba(206, 199, 251, 0.1)' },
    fx: 'spotlight',
    label: { kind: 'solid', color: '#F3F1FE' },
  },

  /** Just the beads: a running stitch with no fabric behind it. */
  stitch: {
    pill: { backgroundColor: 'transparent', borderWidth: 0 },
    fx: 'stitch',
    label: { kind: 'solid', color: '#E7E3FD' },
  },

  /** A comet parked on the rim; pressing sends it around the perimeter. */
  comet: {
    pill: { backgroundColor: '#181140', borderColor: 'rgba(169, 155, 245, 0.14)' },
    fx: 'comet',
    label: { kind: 'gradient' },
  },

  /** Clean at rest; pressing corrupts — slices shear and flicker. */
  glitch: {
    pill: { backgroundColor: '#181140', borderColor: 'rgba(169, 155, 245, 0.14)' },
    fx: 'glitch',
    label: { kind: 'gradient' },
  },

  /** A coarse retro grid; pressing sends brightness waves across it. */
  pixel: {
    pill: { backgroundColor: '#181140', borderWidth: 0 },
    fx: 'pixel',
    label: { kind: 'solid', color: '#F3F1FE' },
  },

  /** Light under a door: the glow compressed into a hot band at the rim. */
  ember: {
    pill: {
      backgroundColor: '#181140',
      boxShadow: `inset 0px -10px 18px 0px ${theme.color.glow}`,
    },
    glow: {
      edge: 'bottom',
      color: theme.color.indigo400,
      rest: 0.7,
      lit: 1,
      squash: 0.45,
    },
    label: { kind: 'gradient' },
  },
};

export type NegotiateButtonProps = {
  label?: string;
  variant?: NegotiateButtonVariant;
  onPress?: () => void;
  disabled?: boolean;
  /** Fires a light impact on press-down. */
  haptics?: boolean;
  /**
   * Pins the button to its pressed state. For the bench only — it lets the
   * held state sit still next to the resting one for comparison, which a real
   * press is far too brief to allow.
   */
  forcePressed?: boolean;
  /**
   * The icon slot. The arrow is a property of the button, not of any one
   * style, so the bench drives it across every variant; `'off'` suppresses
   * it even on variants whose own spec asks for it. Omit to let the spec
   * decide (which is what a consumer outside the bench wants).
   */
  icon?: ArrowKind | 'off';
  /**
   * Live offset (pt) applied to the glow layers — the bench's gyroscope
   * drives these so the light leans with the device. The pill itself never
   * moves; only its light does.
   */
  glowShift?: { x: SharedValue<number>; y: SharedValue<number> };
  style?: StyleProp<ViewStyle>;
};

export function NegotiateButton({
  label = 'Negotiate flight',
  variant = 'gradient',
  onPress,
  disabled = false,
  haptics = true,
  forcePressed = false,
  icon,
  glowShift,
  style,
}: NegotiateButtonProps) {
  const spec = VARIANTS[variant];
  // An explicit `icon` wins over the variant's own drawIcon flag.
  const showIcon = icon === undefined ? !!spec.drawIcon : icon !== 'off';
  const iconKind: ArrowKind = icon && icon !== 'off' ? icon : 'trend';

  // 0 = at rest, 1 = held down. One value drives both the scale and the glow
  // so they can never disagree about the button's state.
  const press = useSharedValue(forcePressed ? 1 : 0);
  // Where the finger is, in pill coordinates. Captured on press-in and
  // tracked through the hold, for effects that respond to the touch POINT
  // rather than just its existence.
  const touchX = useSharedValue(FRAME.width / 2);
  const touchY = useSharedValue(FRAME.height / 2);
  const reducedMotion = useReducedMotion();

  /**
   * The hold clock — neon's paradigm, promoted system-wide. Press-in starts
   * it from zero, it repeats for as long as the finger stays down, release
   * cancels and rewinds. Declared BEFORE its first consumer: worklets run
   * at creation, so a later-declared shared value is undefined inside them
   * (the crash the scale-breath shipped with).
   */
  const holdT = useSharedValue(0);
  useAnimatedReaction(
    () => press.value > 0.05,
    (active, prev) => {
      if (active === prev) return;
      if (active) {
        holdT.value = 0;
        holdT.value = withRepeat(
          withTiming(1, { duration: 3200, easing: Easing.linear }),
          -1,
        );
      } else {
        cancelAnimation(holdT);
        holdT.value = withTiming(0, { duration: 200 });
      }
    },
  );

  const pillStyle = useAnimatedStyle(() => {
    // The strong pulse the opacity channel could not safely carry lives
    // here instead: while held, the whole pill breathes ±0.8% around its
    // pressed scale — clearly alive, never readable as a state change.
    const scaleBreath = reducedMotion
      ? 0
      : press.value * 0.008 * Math.sin(holdT.value * 2 * Math.PI);
    return {
      // Reduce Motion kills the scale but keeps the glow — the press must
      // still be visible, just not by moving.
      transform: [
        {
          scale: reducedMotion
            ? 1
            : 1 - press.value * (1 - PRESSED_SCALE) + scaleBreath,
        },
      ],
    };
  });

  /** Un-breathing press opacity, for variants that carry their own loop. */
  const litPlainStyle = useAnimatedStyle(() => ({ opacity: press.value }));
  const litStyle = useAnimatedStyle(() => {
    // STATE IS A FLOOR, LIFE PLAYS ABOVE IT. The deep 40-100% swing made
    // held buttons read as leaving pressed mode at the trough — state
    // flapping, not breathing. Opacity now never falls below 0.86 of full
    // pressed, so the state is unambiguous for the entire hold, and the
    // remaining pulse is life on top of it.
    const breath = reducedMotion
      ? 1
      : 0.93 + 0.07 * Math.sin(holdT.value * 2 * Math.PI);
    return { opacity: press.value * breath };
  });
  /** Inverse of litStyle — for chrome the press must REMOVE, not add. */
  const dimStyle = useAnimatedStyle(() => ({ opacity: 1 - press.value }));
  /**
   * Photo-paper development on chemical time, not press time. The press is
   * 90ms; a print is not. `develop` chases the press's on/off state on its
   * own clock — 750ms out-ease surfacing, 450ms fade back into the bath —
   * so holding the button feels like watching the image come up.
   */
  const develop = useSharedValue(0);
  useAnimatedReaction(
    () => press.value > 0.05,
    (active, prev) => {
      if (active === prev) return;
      develop.value = withTiming(active ? 1 : 0, {
        duration: active ? 750 : 450,
        easing: Easing.out(Easing.cubic),
      });
    },
  );
  const developStyle = useAnimatedStyle(() => ({
    opacity: spec.developLabel ? 0.35 + develop.value * 0.65 : 1,
  }));
  /** Under safelight, undeveloped paper reads red-tinted, not white. */
  const developTintStyle = useAnimatedStyle(() => ({
    opacity: (1 - develop.value) * 0.85,
  }));
  /**
   * Molten's depth stack: three layers ride the tilt at different rates —
   * pool focal at 1x (inside GlowWash), mesh at 0.35x, the white-hot spark
   * at 1.6x — and the parallax between them is what makes the liquid read
   * as having depth under the surface.
   */
  const meshParallax = useAnimatedStyle(() => ({
    transform: [
      { translateX: (glowShift?.x.value ?? 0) * 0.35 },
      { translateY: (glowShift?.y.value ?? 0) * 0.35 },
    ],
  }));
  const sparkParallax = useAnimatedStyle(() => ({
    transform: [
      { translateX: (glowShift?.x.value ?? 0) * 1.6 },
      { translateY: (glowShift?.y.value ?? 0) * 1.6 },
    ],
  }));
  /**
   * The metal itself answers the tilt: pitching the phone slides the band
   * horizon (translateY), rolling drifts it a touch sideways — the way a
   * real polished surface re-aims its reflections. The sheen streak rides
   * separately at 5x.
   */
  const bandTiltStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (glowShift?.x.value ?? 0) * 0.3 },
      { translateY: (glowShift?.y.value ?? 0) * 0.9 },
    ],
  }));
  /**
   * Chrome sheen: tilt slides the reflection; holding sweeps it back and
   * forth on the hold clock — polished metal turning under the light for as
   * long as the finger stays down, still the moment it lifts.
   */
  const sheenStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          (glowShift ? glowShift.x.value * 5 : 0) +
          (reducedMotion
            ? 0
            : Math.sin(holdT.value * 2 * Math.PI) * 60 * press.value),
      },
      { rotate: '18deg' },
    ],
  }));

  return (
    <Animated.View style={[styles.pillWrapper, pillStyle, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        // The hold is sacred, bench-wide: once a finger is down the pressed
        // state persists until it LIFTS. Without a generous retention zone,
        // Pressable fires onPressOut as soon as the finger drifts a few
        // points mid-hold — which read as the state randomly reverting
        // under a held finger. 120pt of drift is a deliberate slide-away.
        pressRetentionOffset={{ top: 120, left: 120, right: 120, bottom: 120 }}
        delayLongPress={1000000}
        onPress={onPress}
        onPressIn={(e) => {
          touchX.value = e.nativeEvent.locationX;
          touchY.value = e.nativeEvent.locationY;
          if (forcePressed) return;
          press.value = withTiming(1, { duration: PRESS_IN_MS });
          if (haptics) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
              () => {},
            );
          }
        }}
        onPressOut={() => {
          if (forcePressed) return;
          press.value = withTiming(0, { duration: PRESS_OUT_MS });
        }}
        onTouchMove={(e) => {
          // The lit area follows the finger as it drifts inside the hold.
          touchX.value = e.nativeEvent.locationX;
          touchY.value = e.nativeEvent.locationY;
        }}
        style={[styles.pill, spec.pill, disabled && styles.pillDisabled]}>
        {spec.violetBase && <VioletBase />}
        {spec.insetThrow && <InsetThrow shift={glowShift} />}
        {/*
          Both wash layers share one shifted parent so the gyroscope moves
          them as a single light source. The lit layer is the glow again at
          full strength, faded in on press — stacking rather than swapping
          means the two states share their geometry exactly.
        */}
        {spec.glow && (
          <View pointerEvents="none" style={styles.litLayer}>
            {spec.glow.rest > 0 && (
              <GlowWash config={spec.glow} lit={false} shift={glowShift} />
            )}
            {/*
              No needsOffscreenAlphaCompositing here: it pushes the subtree
              into an offscreen buffer that iOS may allocate at 1x rather
              than the device's 3x, which pixelates everything inside it.
              The layer holds a single SVG, so plain opacity composites
              correctly without it.
            */}
            <Animated.View
              pointerEvents="none"
              style={[styles.litLayer, litStyle]}>
              <GlowWash config={spec.glow} lit shift={glowShift} />
            </Animated.View>
          </View>
        )}
        {spec.chromeBase && (
          <>
            <Animated.View pointerEvents="none" style={[styles.litLayer, bandTiltStyle]}>
              <ChromeBase />
            </Animated.View>
            <Animated.View
              pointerEvents="none"
              style={[styles.litLayer, sheenStyle]}>
              <ChromeSheen />
            </Animated.View>
          </>
        )}
        {spec.neonRing && (
          <>
            <NeonRing lit={false} />
            {/* Plain press opacity, NOT the breathing litStyle: the sink loop
                is neon's animation, and the system breath sat on top of it,
                dimming the whole ring stack to 40% mid-cycle — which read as
                the loop breaking. One animation per element. */}
            <Animated.View
              pointerEvents="none"
              style={[styles.litLayer, litPlainStyle]}>
              <NeonRing lit press={press} />
            </Animated.View>
          </>
        )}
        {spec.carveInset && (
          <Animated.View pointerEvents="none" style={[styles.litLayer, litStyle]}>
            <CarveInset />
          </Animated.View>
        )}
        {spec.blueprintChrome && <BlueprintChrome press={press} holdT={holdT} />}
        {spec.concavePress && (
          <Animated.View
            pointerEvents="none"
            style={[styles.litLayer, litStyle]}>
            <View style={styles.concaveFill} />
            <InsetThrow />
            <ConcaveDish />
          </Animated.View>
        )}
        {spec.dish && (
          <Animated.View
            pointerEvents="none"
            style={[styles.litLayer, litStyle]}>
            <ConcaveDish />
          </Animated.View>
        )}
        {spec.emberPress && (
          <Animated.View pointerEvents="none" style={[styles.litLayer, litStyle]}>
            <GlowWash config={EMBER_PRESS_BAND} lit shift={glowShift} />
          </Animated.View>
        )}
        {spec.fx && (
          <VariantFx kind={spec.fx} press={press} holdT={holdT}
            shift={glowShift} touch={{ x: touchX, y: touchY }} />
        )}
        {spec.mesh && (
          <>
            <Animated.View pointerEvents="none" style={[styles.litLayer, sparkParallax]}>
              <MoltenSpark />
            </Animated.View>
            <Animated.View pointerEvents="none" style={[styles.litLayer, meshParallax]}>
              <DotMesh />
            </Animated.View>
            <MoltenRim />
          </>
        )}
        {showIcon && <NegotiateGlyph kind={iconKind} />}
        <Animated.View style={developStyle}>
          <ButtonLabel spec={spec.label}>{label}</ButtonLabel>
          {spec.developLabel && (
            <Animated.View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, developTintStyle]}>
              <ButtonLabel spec={{ kind: 'solid', color: '#8B7CF6' }}>
                {label}
              </ButtonLabel>
            </Animated.View>
          )}
        </Animated.View>
        {spec.gradientBorder &&
          (spec.concavePress ? (
            <Animated.View pointerEvents="none" style={[styles.litLayer, dimStyle]}>
              <GradientBorderRing />
            </Animated.View>
          ) : (
            <GradientBorderRing />
          ))}
      </Pressable>
    </Animated.View>
  );
}

/**
 * The soft wash hugging one rim. Rendered at the frame's intrinsic size and
 * absolutely positioned so it keeps its shape regardless of how wide the pill
 * stretches; the pill's `overflow: hidden` does the clipping.
 */
function GlowWash({
  config,
  lit,
  shift,
}: {
  config: NonNullable<VariantSpec['glow']>;
  lit: boolean;
  shift?: { x: SharedValue<number>; y: SharedValue<number> };
}) {
  const { edge, color, core, squash = 1, spread = 1 } = config;
  const opacity = lit ? config.lit : config.rest;
  // Top/bottom washes reuse the design's ellipse, whose centre sits 79.5pt
  // past the rim it bleeds over. The left pool is its own geometry: an
  // ellipse centred in the cap, tall as the pill, falling off rightward.
  const cyBottom = GLOW_ELLIPSE.y + GLOW_ELLIPSE.height / 2;
  const geom =
    edge === 'left' || edge === 'center'
      ? {
          cx: edge === 'left' ? 22 : FRAME.width / 2,
          cy: FRAME.height / 2,
          rx: 62 * squash * spread * BLUR_BLEED,
          ry: FRAME.height * 0.85 * spread * BLUR_BLEED,
        }
      : {
          cx: GLOW_ELLIPSE.x + GLOW_ELLIPSE.width / 2,
          cy: edge === 'bottom' ? cyBottom : FRAME.height - cyBottom,
          rx: (GLOW_ELLIPSE.width / 2) * BLUR_BLEED,
          ry: (GLOW_ELLIPSE.height / 2) * squash * BLUR_BLEED,
        };
  const id = `wash-${edge}-${color.replace('#', '')}-${lit ? 'lit' : 'rest'}-${squash}-${spread}`;

  // Figma blurs this ellipse, and a blur throws light past the shape's own
  // bounds. A plain radial does not: it hits zero exactly at r=1, and since
  // the ellipse is 240pt wide inside a 272pt pill, both caps and all four
  // bottom corners sat past r=1 with nothing painted on them at all — a hard
  // unlit edge, not a falloff.
  //
  // So the ellipse grows by BLUR_BLEED and every stop is pulled in by the
  // same factor, which leaves the profile at any given physical distance
  // exactly as it was. Only the tail is new: where the gradient used to
  // terminate it now carries a little light and fades out past the pill
  // edge, so the caps resolve instead of stopping.
  // A wide wash needs a long tail; a tight one wants the original two-step
  // falloff. Extra stops keep the ramp smooth all the way to zero.
  const softTail = spread > 1;
  const B = BLUR_BLEED;
  const stops: [number, number][] = core
    ? softTail
      ? [[0, 1], [0.18 / B, 0.85], [0.34 / B, 0.6], [0.5 / B, 0.36],
         [0.68 / B, 0.18], [0.85 / B, 0.06], [1, 0]]
      : [[0, 1], [0.3 / B, 1], [0.65 / B, 0.45], [1 / B, 0.14], [1, 0]]
    : [[0, 1], [0.6 / B, 0.4], [1 / B, 0.14], [1, 0]];

  // Tilt moves where the light is BRIGHTEST, not where it reaches. The
  // ellipse only covers ~88% of the pill, so translating the layer drags its
  // falloff edge into frame and leaves the far side unlit — visibly broken.
  // Shifting the focal point instead keeps the lit area pinned and just
  // slides the hotspot inside it, which is also what a moving light does.
  const focal = useAnimatedProps(() => {
    // 2.2x gain: normalising the tilt against the ellipse's full diameter
    // made the focal swing ~12% on the broad washes — real but invisible on
    // a soft gradient, which is why gradient/eclipse/ember read as inert.
    const dx = shift ? (shift.x.value / (geom.rx * 2)) * 2.2 : 0;
    const dy = shift ? (shift.y.value / (geom.ry * 2)) * 2.2 : 0;
    return {
      fx: `${(0.5 + dx) * 100}%`,
      fy: `${(0.5 + dy) * 100}%`,
    };
  });
  return (
    <View pointerEvents="none" style={styles.glowLayer}>
      <Svg width={FRAME.width} height={FRAME.height} style={styles.glowSvg}>
        <Defs>
          {/* Stops are keyed arrays, never fragments: react-native-svg
              clones gradient children with a `parent` prop, and a Fragment
              rejects it ("Invalid prop `parent` supplied to React.Fragment"). */}
          <AnimatedRadialGradient
            id={id}
            cx="50%"
            cy="50%"
            rx="50%"
            ry="50%"
            animatedProps={focal}>
            {stops.map(([offset, weight], i) => (
              <Stop
                key={offset}
                offset={offset}
                // The hot core colour only holds for the first stop or two.
                stopColor={core && i === 0 ? core : color}
                stopOpacity={opacity * weight}
              />
            ))}
          </AnimatedRadialGradient>
        </Defs>
        <Ellipse cx={geom.cx} cy={geom.cy} rx={geom.rx} ry={geom.ry} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/**
 * Node 48:12304's base fill: a radial from #271D66 at (0.5, 0.594) out
 * through ever-darker violets to black. Figma bakes it as an inline SVG;
 * the stops and centre are lifted from that markup, radii scaled from the
 * node's 212x72 to the pill's 272x68.
 */
function VioletBase() {
  return (
    <View pointerEvents="none" style={styles.glowLayer}>
      <Svg width={FRAME.width} height={FRAME.height} style={styles.glowSvg}>
        <Defs>
          <RadialGradient
            id="violetBase"
            gradientUnits="userSpaceOnUse"
            cx={FRAME.width / 2}
            cy={40.4}
            rx={110}
            ry={27.6}>
            <Stop offset="0" stopColor="#271D66" />
            <Stop offset="0.25" stopColor="#181140" />
            <Stop offset="0.5" stopColor="#181140" />
            <Stop offset="0.75" stopColor="#181140" />
            <Stop offset="0.875" stopColor="#181140" />
            <Stop offset="1" stopColor="#181140" />
          </RadialGradient>
        </Defs>
        <Rect width={FRAME.width} height={FRAME.height} fill="url(#violetBase)" />
      </Svg>
    </View>
  );
}

/**
 * The stroke of node 48:12304, drawn as an SVG ring.
 *
 * Measured off the render rather than trusting codegen (which reported a
 * flat rgba(255,255,255,0.45)). The paint IS white — but its alpha ramps
 * HORIZONTALLY: ~0.45 at the caps, ~0.02 across the middle, symmetric. It
 * reads as a rim light on the two ends, invisible along the top and bottom
 * runs. Alpha solved per sample from observed = a*255 + (1-a)*fill:
 *   x/w 0.17 -> 0.41 | 0.26 -> 0.34 | 0.36 -> 0.23 | 0.45 -> 0.07
 *   0.50 -> 0.02 | 0.64 -> 0.20 | 0.74 -> 0.33 | 0.83 -> 0.42
 */
const BORDER_ALPHA_STOPS: [number, number][] = [
  [0, 0.45],
  [0.17, 0.41],
  [0.3, 0.3],
  [0.42, 0.12],
  [0.5, 0.02],
  [0.58, 0.12],
  [0.7, 0.3],
  [0.83, 0.42],
  [1, 0.45],
];

function GradientBorderRing() {
  const inset = 0.75; // centre a 1.5pt stroke on the frame edge
  return (
    <View pointerEvents="none" style={styles.glowLayer}>
      <Svg width={FRAME.width} height={FRAME.height} style={styles.glowSvg}>
        <Defs>
          <SvgLinearGradient id="borderRing" x1="0" y1="0" x2="1" y2="0">
            {BORDER_ALPHA_STOPS.map(([offset, alpha]) => (
              <Stop
                key={offset}
                offset={offset}
                stopColor="#F3F1FE"
                stopOpacity={alpha}
              />
            ))}
          </SvgLinearGradient>
        </Defs>
        <Rect
          x={inset}
          y={inset}
          width={FRAME.width - inset * 2}
          height={FRAME.height - inset * 2}
          rx={(FRAME.height - inset * 2) / 2}
          stroke="url(#borderRing)"
          strokeWidth={1.5}
          fill="none"
        />
      </Svg>
    </View>
  );
}

/**
 * Node 51:92's inset throw, rebuilt as a vertical gradient. The alpha
 * profile is the pixel-diff measurement (solved against the original
 * #4D00FF over #0F0620 render); the colours were later remapped onto the
 * indigo palette (#5847D6 over #181140), keeping the measured profile. Reproducing the shadow this way costs nothing visually and
 * buys the one thing a CSS shadow string cannot do: respond to tilt.
 *
 * Tilt rotates the throw axis rather than sliding it, so the lit band stays
 * anchored to the rim and only its direction changes — the same reason the
 * washes move their focal point instead of translating.
 */
const THROW_STOPS: [number, number][] = [
  // Stretched deeper than the measured render on purpose: the light now
  // descends most of the face before the bottom reflection picks up, so the
  // dished surface reads as one continuous form under one lamp — bigger,
  // softer, and with more room for the tilt to visibly re-aim it.
  [0, 0.72],
  [0.18, 0.5],
  [0.35, 0.32],
  [0.52, 0.18],
  [0.68, 0.09],
  [0.8, 0.05],
  [0.88, 0.08],
  [1, 0.22],
];

const AnimatedSvgLinearGradient =
  Animated.createAnimatedComponent(SvgLinearGradient);

function InsetThrow({
  shift,
}: {
  shift?: { x: SharedValue<number>; y: SharedValue<number> };
}) {
  const axis = useAnimatedProps(() => {
    // Lean is expressed as a fraction of the frame, then halved: a full-tilt
    // 30pt shift swings the axis about 5 degrees, which is plenty on a band
    // this soft.
    const dx = shift ? shift.x.value / FRAME.width / 1.3 : 0;
    const dy = shift ? shift.y.value / FRAME.height / 1.3 : 0;
    return {
      x1: 0.5 + dx,
      y1: dy,
      x2: 0.5 - dx,
      y2: 1 + dy,
    };
  });
  return (
    <View pointerEvents="none" style={styles.glowLayer}>
      <Svg width={FRAME.width} height={FRAME.height} style={styles.glowSvg}>
        <Defs>
          <AnimatedSvgLinearGradient
            id="insetThrow"
            x1="0.5"
            y1="0"
            x2="0.5"
            y2="1"
            animatedProps={axis}>
            {THROW_STOPS.map(([offset, alpha]) => (
              <Stop
                key={offset}
                offset={offset}
                stopColor="#5847D6"
                stopOpacity={alpha}
              />
            ))}
          </AnimatedSvgLinearGradient>
        </Defs>
        <Rect
          width={FRAME.width}
          height={FRAME.height}
          fill="url(#insetThrow)"
        />
      </Svg>
    </View>
  );
}

/**
 * The dished face of node 51:92, pressed state. A 260x56 rect inset 6pt from
 * the pill, filled with a radial whose centre sits on its TOP edge (130, 0)
 * and whose radii — decoded from the baked gradientTransform — are rx 168.8,
 * ry 70.5. Dark centre to bright rim is what sells the concavity.
 *
 * The design also layer-blurs this 1px; RN has no cheap view blur and at 1px
 * the difference is imperceptible, so the stops carry the softness instead.
 */
function ConcaveDish() {
  const inset = { x: 6, y: 6 };
  const w = FRAME.width - inset.x * 2;
  const h = FRAME.height - inset.y * 2;
  return (
    <View pointerEvents="none" style={styles.glowLayer}>
      <Svg width={FRAME.width} height={FRAME.height} style={styles.glowSvg}>
        <Defs>
          <RadialGradient
            id="concaveDish"
            gradientUnits="userSpaceOnUse"
            cx={inset.x + w / 2}
            cy={inset.y}
            rx={168.79}
            ry={70.5}>
            {/* The measured four stops, resampled to nine with smoothstep
                between them — same endpoints, no visible banding. */}
            <Stop offset="0" stopColor="#181140" />
            <Stop offset="0.125" stopColor="#1F1753" />
            <Stop offset="0.25" stopColor="#271D66" />
            <Stop offset="0.375" stopColor="#2E2378" />
            <Stop offset="0.5" stopColor="#36298F" />
            <Stop offset="0.625" stopColor="#36298F" />
            <Stop offset="0.75" stopColor="#3E2FA3" />
            <Stop offset="0.875" stopColor="#4636B8" />
            <Stop offset="1" stopColor="#4636B8" />
          </RadialGradient>
        </Defs>
        <Rect
          x={inset.x}
          y={inset.y}
          width={w}
          height={h}
          rx={h / 2}
          fill="url(#concaveDish)"
        />
        {/* Feather: the dish's bright rim melts into the base over a few pt
            instead of terminating on a hard rounded-rect edge — stacked
            fading strokes standing in for the gaussian RN does not have. */}
        {[
          { grow: 1, opacity: 0.3, width: 2 },
          { grow: 2.5, opacity: 0.16, width: 2.5 },
          { grow: 4.5, opacity: 0.07, width: 3 },
        ].map(({ grow, opacity, width }) => (
          <Rect
            key={grow}
            x={inset.x - grow}
            y={inset.y - grow}
            width={w + grow * 2}
            height={h + grow * 2}
            rx={(h + grow * 2) / 2}
            fill="none"
            stroke="#4636B8"
            strokeOpacity={opacity}
            strokeWidth={width}
          />
        ))}
      </Svg>
    </View>
  );
}

/**
 * The self-drawing arrow glyphs, as data. Both share one 2s timeline (the
 * motion data on the two source nodes is byte-identical); only the geometry
 * differs, so a new arrow is a row here and nothing else.
 *
 *   trail  — the line that draws itself, with its measured path length and
 *            its offset inside the 24pt box
 *   head   — the corner bracket that pops in, and where it sits
 */
export type ArrowKind = 'trend';

type ArrowSpec = {
  trail: { d: string; length: number; w: number; h: number; x: number; y: number };
  head: { d: string; w: number; h: number; x: number; y: number };
};

const ARROWS: Record<ArrowKind, ArrowSpec> = {
  /** Node 48:12306 — a downtrend settling into a corner at the bottom right. */
  trend: {
    trail: {
      d: 'M20.65 10.65L12.15 2.15L7.15 7.15L0.65 0.65',
      length: 28.3,
      w: 21.3,
      h: 11.3,
      x: 2,
      y: 7,
    },
    head: { d: 'M0.65 6.65H6.65V0.65', w: 7.3, h: 7.3, x: 16, y: 11 },
  },
};

const GLYPH_LOOP_MS = 2000;

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRadialGradient = Animated.createAnimatedComponent(RadialGradient);

/**
 * The negotiate glyph, per the file's motion data (2s loop): the downtrend
 * line draws itself over 0-25% (ease-in-out), then the arrowhead pops in
 * over 17.5-27.5% — opacity ease-out, scale 0.4->1 on an overshoot bezier
 * (0.45, 1.45, 0.8, 1). Reduce Motion shows the finished glyph, still.
 */
function NegotiateGlyph({ kind = 'trend' }: { kind?: ArrowKind }) {
  const arrow = ARROWS[kind];
  const reducedMotion = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      t.value = 1;
      return;
    }
    t.value = 0;
    t.value = withRepeat(
      withTiming(1, { duration: GLYPH_LOOP_MS, easing: Easing.linear }),
      -1,
    );
  }, [reducedMotion, t]);

  const zigzagProps = useAnimatedProps(() => {
    const p = Easing.inOut(Easing.ease)(
      Math.min(1, Math.max(0, t.value / 0.25)),
    );
    return {
      strokeDashoffset: arrow.trail.length * (1 - p),
      opacity: t.value > 0.001 ? 1 : 0,
    };
  });

  const headStyle = useAnimatedStyle(() => {
    const p = Math.min(1, Math.max(0, (t.value - 0.175) / 0.1));
    return {
      opacity: Easing.out(Easing.ease)(p),
      transform: [
        { scale: 0.4 + 0.6 * Easing.bezierFn(0.45, 1.45, 0.8, 1)(p) },
      ],
    };
  });

  return (
    <View style={styles.glyphBox}>
      <Svg
        width={arrow.trail.w}
        height={arrow.trail.h}
        viewBox={`0 0 ${arrow.trail.w} ${arrow.trail.h}`}
        style={[styles.glyphPart, { left: arrow.trail.x, top: arrow.trail.y }]}>
        <AnimatedPath
          d={arrow.trail.d}
          stroke="#F3F1FE"
          strokeWidth={1.3}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={`${arrow.trail.length} ${arrow.trail.length}`}
          animatedProps={zigzagProps}
        />
      </Svg>
      <Animated.View
        style={[
          styles.glyphPart,
          { left: arrow.head.x, top: arrow.head.y },
          headStyle,
        ]}>
        <Svg
          width={arrow.head.w}
          height={arrow.head.h}
          viewBox={`0 0 ${arrow.head.w} ${arrow.head.h}`}>
          <Path
            d={arrow.head.d}
            stroke="#F3F1FE"
            strokeWidth={1.3}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const PHI = 1.618;

/**
 * Pressed, the tube resonates: five concentric rings echoing inward, each
 * gap phi times the previous (insets 2, 5.2, 10.4, 18.8, 32.3 — the base
 * gap of 3.2 is chosen so the fifth ring lands just inside the pill's
 * 33pt vertical half-height). Inward, not outward, because the pill clips
 * at its own edge and outward echoes would never be seen. Brightness and
 * weight fall with each step, so it reads as the tube ringing, not five
 * tubes.
 *
 * While held they SINK: each ring's height and opacity run to zero on a
 * staggered loop — width stays, the stadium flattens to a line on the axis
 * and vanishes, like the surface swallowing the echo. Ease-in, because
 * things accelerate as they go under.
 */
const NEON_ECHOES = Array.from({ length: 5 }, (_, i) => ({
  inset: i === 0 ? 2 : 2 + 3.2 * ((PHI ** i - 1) / (PHI - 1)),
  opacity: [1, 0.55, 0.34, 0.2, 0.12][i],
  width: [1.6, 1.4, 1.2, 1.1, 1][i],
}));

const NEON_SINK_MS = 1400;
/** Phase offset between neighbouring rings — outer sinks first. */
const NEON_STAGGER = 0.16;

const AnimatedRect = Animated.createAnimatedComponent(Rect);

function NeonEchoRing({
  index,
  t,
}: {
  index: number;
  t: SharedValue<number>;
}) {
  const { inset, opacity, width } = NEON_ECHOES[index];
  const baseRy = (FRAME.height - inset * 2) / 2;
  const w = FRAME.width - inset * 2;
  const props = useAnimatedProps(() => {
    // Minus, not plus: the ring at the tube (index 0) leads and the echoes
    // follow it under — the surface swallows from the outside in.
    const phase =
      (((t.value - index * NEON_STAGGER) % 1) + 1) % 1;
    // The whole collapse lives inside the first 60% of the cycle, so the
    // motion happens while the ring can still be seen; the remaining 40% is
    // the gap before this ring's next echo.
    const sinkProg = Math.min(1, phase / 0.6);
    const sink = Easing.in(Easing.quad)(sinkProg);
    const ry = baseRy * (1 - sink);
    // Opacity still outruns the height — gone at 42% while the collapse
    // runs to 60% — but the two clocks are now proportioned so most of the
    // sinking is visible before the light dies.
    const fade = Math.min(1, phase / 0.42);
    return {
      y: FRAME.height / 2 - ry,
      height: ry * 2,
      rx: Math.min(ry, w / 2),
      strokeOpacity: opacity * (1 - fade) ** 2,
    };
  });
  return (
    <AnimatedRect
      x={inset}
      width={w}
      fill="none"
      stroke={index === 0 ? '#F3F1FE' : '#CEC7FB'}
      strokeWidth={width}
      animatedProps={props}
    />
  );
}

/** The neon tube: a bright ring hugging the rim, haloed inward and out. */
function NeonRing({
  lit,
  press,
}: {
  lit: boolean;
  press?: SharedValue<number>;
}) {
  const inset = 2;
  const w = FRAME.width - inset * 2;
  const h = FRAME.height - inset * 2;
  const reducedMotion = useReducedMotion();
  // One clock drives all five rings; their stagger comes from phase offsets.
  // The PRESS owns the clock: press-in starts the loop from zero (echoes
  // are born at the tube, deterministically, instead of catching a free-
  // running loop mid-phase) and it repeats for as long as the finger stays
  // down — release cancels and rewinds. Reduce Motion never starts it:
  // rings hold at their golden-ratio homes, still.
  const sinkT = useSharedValue(0);
  useAnimatedReaction(
    () => (press ? press.value > 0.05 : false),
    (active, prev) => {
      if (reducedMotion) return;
      if (active && prev !== true) {
        sinkT.value = 0;
        sinkT.value = withRepeat(
          withTiming(1, { duration: NEON_SINK_MS, easing: Easing.linear }),
          -1,
        );
      } else if (!active && prev === true) {
        cancelAnimation(sinkT);
        sinkT.value = withTiming(0, { duration: 160 });
      }
    },
    [reducedMotion],
  );
  return (
    <View pointerEvents="none" style={styles.glowLayer}>
      <Svg width={FRAME.width} height={FRAME.height} style={styles.glowSvg}>
        {/* Halo first, tube on top: stacked strokes at widening widths stand
            in for a gaussian glow, which SVG strokes cannot have. */}
        <Rect x={inset} y={inset} width={w} height={h} rx={h / 2} fill="none"
          stroke={theme.color.glow} strokeOpacity={lit ? 0.5 : 0.22} strokeWidth={9} />
        <Rect x={inset} y={inset} width={w} height={h} rx={h / 2} fill="none"
          stroke={theme.color.indigo400} strokeOpacity={lit ? 0.85 : 0.5} strokeWidth={4.5} />
        {lit ? (
          NEON_ECHOES.map((_, i) => (
            <NeonEchoRing key={i} index={i} t={sinkT} />
          ))
        ) : (
          <Rect x={inset} y={inset} width={w} height={h} rx={h / 2} fill="none"
            stroke="#CEC7FB" strokeOpacity={0.9} strokeWidth={1.6} />
        )}
      </Svg>
    </View>
  );
}

/** carve's press: a deboss forming — dark falls from the top, light rises. */
function CarveInset() {
  return (
    <View pointerEvents="none" style={styles.glowLayer}>
      <Svg width={FRAME.width} height={FRAME.height} style={styles.glowSvg}>
        <Defs>
          <SvgLinearGradient id="carveIn" x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor="#181140" stopOpacity={0.55} />
            <Stop offset="0.4" stopColor="#181140" stopOpacity={0.12} />
            <Stop offset="0.8" stopColor="#181140" stopOpacity={0} />
            <Stop offset="1" stopColor="#CEC7FB" stopOpacity={0.12} />
          </SvgLinearGradient>
        </Defs>
        <Rect width={FRAME.width} height={FRAME.height} fill="url(#carveIn)" />
      </Svg>
    </View>
  );
}

/**
 * Banded metal in the house lilac: the classic four-band ramp with every
 * band pulled toward indigo/400's hue instead of neutral grey — polished
 * amethyst rather than steel. Same band structure, same sheen behaviour.
 */
function ChromeBase() {
  // Oversized canvas: the band layer translates up to ~30pt on tilt, and an
  // SVG clips at its own bounds (chrome's sheen taught that lesson).
  const M = 80;
  return (
    <View pointerEvents="none" style={styles.glowLayer}>
      <Svg
        width={FRAME.width + M * 2}
        height={FRAME.height + M * 2}
        style={{ position: 'absolute', left: -M, top: -M }}>
        <Defs>
          <SvgLinearGradient id="chromeBands" x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor="#A99BF5" />
            <Stop offset="0.42" stopColor="#6D5CF0" />
            <Stop offset="0.5" stopColor="#36298F" />
            <Stop offset="0.62" stopColor="#5847D6" />
            <Stop offset="1" stopColor="#A99BF5" />
          </SvgLinearGradient>
        </Defs>
        <Rect width={FRAME.width + M * 2} height={FRAME.height + M * 2}
          fill="url(#chromeBands)" />
      </Svg>
    </View>
  );
}

/** The travelling reflection. Its parent animates translateX + rotation. */
function ChromeSheen() {
  // The canvas itself is oversized, not merely the rect inside it: an SVG
  // clips at its own bounds, so a frame-sized canvas showed its edge the
  // moment the layer translated — which is exactly what the big-rect "fix"
  // failed to address. 320pt of margin beats the worst case (150 tilt + 60
  // sweep + 18deg rotation).
  const M = 320;
  return (
    <View pointerEvents="none" style={styles.glowLayer}>
      <Svg
        width={FRAME.width + M * 2}
        height={FRAME.height + M * 2}
        style={{ position: 'absolute', left: -M, top: -M }}>
        <Defs>
          {/* The rect spans +/-320pt beyond the pill so its boundary can
              never enter the frame at any tilt (max 150pt) plus press sweep
              (45pt) plus the 18deg rotation. Stops are renormalised so the
              bright streak keeps its ~50pt physical width on the wider
              gradient line. */}
          <SvgLinearGradient id="chromeSheen" x1="0" y1="0.5" x2="1" y2="0.5">
            <Stop offset="0" stopColor="#F3F1FE" stopOpacity={0} />
            <Stop offset="0.472" stopColor="#F3F1FE" stopOpacity={0.1} />
            <Stop offset="0.5" stopColor="#F3F1FE" stopOpacity={0.72} />
            <Stop offset="0.528" stopColor="#F3F1FE" stopOpacity={0.1} />
            <Stop offset="1" stopColor="#F3F1FE" stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>
        <Rect width={FRAME.width + M * 2} height={FRAME.height + M * 2}
          fill="url(#chromeSheen)" />
      </Svg>
    </View>
  );
}

/**
 * The pill as a 3D capsule wireframe — a solid of revolution, not an
 * extrusion. Cross-section rings wrap the body along its axis: full-height
 * over the cylindrical middle, shrinking as sqrt(1 - (d/r)^2) once they
 * enter either hemispherical cap, so both ends read as ROUND in depth. Each
 * ring is an ellipse foreshortened to 30% of its radius, which is what a
 * circular section looks like seen nearly edge-on.
 *
 * Every construction line sits under a radial mask that reaches zero at the
 * centre, so the drawing dissolves exactly where the label lives and
 * resolves toward the rims. The selection chrome (dashed bounds and corner
 * handles) stays unmasked — annotation, not construction.
 */
/** Blueprint geometry, hoisted for the ring components. */
const BP = { fx: 8, fw: 256, fr: 27 } as const;
const BP_CY = 8 + BP.fr;
const BP_CAP_L = BP.fx + BP.fr;
const BP_CAP_R = BP.fx + BP.fw - BP.fr;
const BP_CENTRE = BP.fx + BP.fw / 2;

/** Capsule surface radius at x — full over the body, sqrt inside the caps. */
function capsuleRy(x: number): number {
  'worklet';
  const d = x < BP_CAP_L ? BP_CAP_L - x : x > BP_CAP_R ? x - BP_CAP_R : 0;
  return d === 0
    ? BP.fr
    : BP.fr * Math.sqrt(Math.max(0, 1 - (d / BP.fr) ** 2));
}

/** A resting station ring; yields to the flow as the press arrives. */
function BlueprintStaticRing({
  x, ry, press,
}: { x: number; ry: number; press: SharedValue<number> }) {
  const props = useAnimatedProps(() => ({
    opacity: 0.45 * (1 - press.value),
  }));
  return (
    <AnimatedEllipse cx={x} cy={BP_CY} ry={ry} rx={Math.max(2, ry * 0.3)}
      fill="none" stroke="#A99BF5" strokeWidth={0.8} animatedProps={props} />
  );
}

/**
 * One ring of the pressed-state flow: born at a cap tip, growing to full
 * height as it clears the cap (the capsule's own sqrt profile does the
 * growing), travelling inward, dissolving as it nears the centre. Five per
 * side on staggered phases of the hold clock = a continuous conveyor from
 * both ends for as long as the finger stays down.
 */
function BlueprintFlowRing({
  side, index, press, holdT,
}: {
  side: 1 | -1;
  index: number;
  press: SharedValue<number>;
  holdT: SharedValue<number>;
}) {
  const props = useAnimatedProps(() => {
    const phase = (((holdT.value - index * 0.2) % 1) + 1) % 1;
    const startX = BP_CAP_L - BP.fr + 4; // just inside the left cap tip
    const endX = BP_CENTRE - 14;
    const xL = startX + (endX - startX) * phase;
    const x = side === 1 ? xL : 2 * BP_CENTRE - xL;
    const ry = capsuleRy(xL);
    const fadeIn = Math.min(1, phase / 0.1);
    const fadeOut = phase > 0.7 ? 1 - (phase - 0.7) / 0.3 : 1;
    return {
      cx: x,
      ry,
      rx: Math.max(2, ry * 0.3),
      opacity: press.value * 0.5 * fadeIn * fadeOut,
    };
  });
  return (
    <AnimatedEllipse cy={BP_CY} fill="none" stroke="#A99BF5"
      strokeWidth={0.8} animatedProps={props} />
  );
}

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

function BlueprintChrome({
  press,
  holdT,
}: {
  press: SharedValue<number>;
  holdT: SharedValue<number>;
}) {
  const c = '#A99BF5';
  const inset = 1.5;
  const w = FRAME.width - inset * 2;
  const h = FRAME.height - inset * 2;
  const handles: [number, number][] = [
    [inset, inset], [FRAME.width - inset, inset],
    [inset, FRAME.height - inset], [FRAME.width - inset, FRAME.height - inset],
  ];
  const f = { x: BP.fx, y: 8, w: BP.fw, h: BP.fr * 2 };
  const fr = BP.fr;

  // Resting stations: body rings every ~26pt plus the cap cascades.
  const ringXs: number[] = [];
  for (let x = BP_CAP_L; x <= BP_CAP_R; x += 26) ringXs.push(x);
  for (const t of [0.45, 0.72, 0.91]) {
    ringXs.push(BP_CAP_L - fr * t);
    ringXs.push(BP_CAP_R + fr * t);
  }
  const rings = ringXs
    .map((x) => ({ x, ry: capsuleRy(x) }))
    .filter((ring) => ring.ry > 5);

  // The silhouette stays through the hold (dimmed) so the flow lives inside
  // a pill; the corner handles — pure annotation — fade out entirely.
  const silhouetteFade = useAnimatedStyle(() => ({
    opacity: 1 - 0.55 * press.value,
  }));
  const handleFade = useAnimatedStyle(() => ({
    opacity: 1 - press.value,
  }));

  return (
    <View pointerEvents="none" style={styles.glowLayer}>
      <Svg width={FRAME.width} height={FRAME.height} style={styles.glowSvg}>
        <Defs>
          {/* Black centre = hidden; construction resolves toward the rims. */}
          <RadialGradient id="lineFade" cx="50%" cy="50%" rx="52%" ry="72%">
            <Stop offset="0" stopColor="#000000" />
            <Stop offset="0.38" stopColor="#000000" />
            <Stop offset="0.85" stopColor="#FFFFFF" />
            <Stop offset="1" stopColor="#FFFFFF" />
          </RadialGradient>
          <Mask id="fadeMask">
            <Rect width={FRAME.width} height={FRAME.height} fill="url(#lineFade)" />
          </Mask>
        </Defs>

        <G mask="url(#fadeMask)">
          {/* Stations at rest; the flow takes over as the press arrives. */}
          {rings.map(({ x, ry }) => (
            <BlueprintStaticRing key={x} x={x} ry={ry} press={press} />
          ))}
          {([1, -1] as const).map((side) =>
            [0, 1, 2, 3, 4].map((i) => (
              <BlueprintFlowRing key={`${side}-${i}`} side={side} index={i}
                press={press} holdT={holdT} />
            )),
          )}
        </G>
      </Svg>

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, silhouetteFade]}>
        <Svg width={FRAME.width} height={FRAME.height} style={styles.glowSvg}>
          <Defs>
            {/* Own copy of the fade — RN-SVG cannot reference another
                svg's defs, and the silhouette should dissolve at the
                centre like every other construction line. */}
            <RadialGradient id="lineFadeSil" cx="50%" cy="50%" rx="52%" ry="72%">
              <Stop offset="0" stopColor="#000000" />
              <Stop offset="0.38" stopColor="#000000" />
              <Stop offset="0.85" stopColor="#FFFFFF" />
              <Stop offset="1" stopColor="#FFFFFF" />
            </RadialGradient>
            <Mask id="fadeMaskSil">
              <Rect width={FRAME.width} height={FRAME.height}
                fill="url(#lineFadeSil)" />
            </Mask>
          </Defs>
          <G mask="url(#fadeMaskSil)">
            <Rect x={f.x} y={f.y} width={f.w} height={f.h} rx={fr} fill="none"
              stroke={c} strokeOpacity={0.75} strokeWidth={1} />
          </G>
        </Svg>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, handleFade]}>
        <Svg width={FRAME.width} height={FRAME.height} style={styles.glowSvg}>
          {handles.map(([hx, hy]) => (
            <Rect key={`${hx}-${hy}`} x={hx - 3} y={hy - 3} width={6} height={6}
              fill={'#181140'} stroke={c} strokeWidth={1} />
          ))}
        </Svg>
      </Animated.View>
    </View>
  );
}

/** ember's band, borrowed as molten's pressed state — heat sinking to the rim. */
const EMBER_PRESS_BAND: NonNullable<VariantSpec['glow']> = {
  edge: 'bottom',
  color: theme.color.indigo400,
  rest: 0,
  lit: 1,
  squash: 0.45,
};

/**
 * The white-hot centre of the pool: a small intense spark riding the tilt
 * at 1.6x, so it swims ahead of the wash it lives in — molecular heat, not
 * a second lamp.
 */
function MoltenSpark() {
  return (
    <View pointerEvents="none" style={styles.glowLayer}>
      <Svg width={FRAME.width} height={FRAME.height} style={styles.glowSvg}>
        <Defs>
          <RadialGradient id="moltenSpark" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor="#F3F1FE" stopOpacity={0.32} />
            <Stop offset="0.45" stopColor={theme.color.indigo400} stopOpacity={0.2} />
            <Stop offset="1" stopColor={theme.color.indigo400} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {/* Below the label band: the hot point reads without fighting text. */}
        <Ellipse cx={FRAME.width / 2} cy={47} rx={38} ry={15}
          fill="url(#moltenSpark)" />
      </Svg>
    </View>
  );
}

/**
 * The vessel's single stroke: one gradient ring, bright catch-light at the
 * lip settling into a crisp lilac hairline down the sides and floor. This
 * replaced the pill border + separate catch-light pair, which nested two
 * strokes a point apart and read as a double edge.
 */
function MoltenRim() {
  const inset = 1.2;
  const h = FRAME.height - inset * 2;
  return (
    <View pointerEvents="none" style={styles.glowLayer}>
      <Svg width={FRAME.width} height={FRAME.height} style={styles.glowSvg}>
        <Defs>
          <SvgLinearGradient id="moltenRim" x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor="#F3F1FE" stopOpacity={0.34} />
            <Stop offset="0.3" stopColor="#CEC7FB" stopOpacity={0.3} />
            <Stop offset="1" stopColor="#CEC7FB" stopOpacity={0.24} />
          </SvgLinearGradient>
        </Defs>
        <Rect x={inset} y={inset} width={FRAME.width - inset * 2} height={h}
          rx={h / 2} fill="none" stroke="url(#moltenRim)" strokeWidth={1.2} />
      </Svg>
    </View>
  );
}

type FxProps = {
  press: SharedValue<number>;
  holdT: SharedValue<number>;
  shift?: { x: SharedValue<number>; y: SharedValue<number> };
  touch?: { x: SharedValue<number>; y: SharedValue<number> };
};

/** Router for the bespoke effect layers. One renderer per physics. */
function VariantFx({ kind, ...fxp }: FxProps & { kind: NonNullable<VariantSpec['fx']> }) {
  switch (kind) {
    case 'aurora': return <AuroraFx {...fxp} />;
    case 'ripple': return <RippleFx {...fxp} />;
    case 'hologram': return <HologramFx {...fxp} />;
    case 'starfield': return <StarfieldFx {...fxp} />;
    case 'spotlight': return <SpotlightFx {...fxp} />;
    case 'stitch': return <StitchFx {...fxp} />;
    case 'comet': return <CometFx {...fxp} />;
    case 'glitch': return <GlitchFx {...fxp} />;
    case 'pixel': return <PixelFx {...fxp} />;
  }
}

/**
 * Aurora borealis, constructed as the phenomenon is: not drifting colour
 * blocks but RAYS — sixteen vertical shafts hanging from an arc, each with
 * a bright lower edge fading upward (that is how the physics reads: the
 * emission is brightest at the curtain's bottom). While held, a travelling
 * wave runs the curtain: each ray's height and brightness undulate with a
 * phase set by its position, so ripples visibly propagate along the arc.
 * Tilt sways the whole curtain gently. Rays sit on an arched baseline.
 */
const AURORA_RAYS = Array.from({ length: 16 }, (_, i) => ({
  x: 12 + i * 16.4,
  baseY: 46 - 9 * Math.sin((Math.PI * i) / 15),
  phase: i / 16,
  hue: i % 5 === 3 ? '#6D5CF0' : i % 2 === 0 ? '#A99BF5' : '#CEC7FB',
}));

function AuroraRay({
  ray, press, holdT, shift,
}: FxProps & { ray: (typeof AURORA_RAYS)[number] }) {
  const props = useAnimatedProps(() => {
    const wave =
      Math.sin(2 * Math.PI * (holdT.value * 2 + ray.phase * 2)) * 0.5 +
      Math.sin(2 * Math.PI * (holdT.value * 3 + ray.phase * 5)) * 0.5;
    const hgt = 16 + (6 + wave * 8) * (0.4 + press.value * 0.6);
    const sway = (shift?.x.value ?? 0) * 0.25;
    return {
      x: ray.x + sway,
      y: ray.baseY - hgt,
      height: hgt,
      fillOpacity: 0.5 + 0.35 * wave * press.value + press.value * 0.15,
    };
  });
  return (
    <AnimatedRect width={9} rx={2}
      fill={`url(#auroraRay${ray.hue.slice(1)})`} animatedProps={props} />
  );
}

function AuroraFx(fxp: FxProps) {
  const hues = ['#A99BF5', '#CEC7FB', '#6D5CF0'];
  return (
    <View pointerEvents="none" style={styles.glowLayer}>
      <Svg width={FRAME.width} height={FRAME.height} style={styles.glowSvg}>
        <Defs>
          {hues.map((hue) => (
            <SvgLinearGradient key={hue} id={`auroraRay${hue.slice(1)}`}
              x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={hue} stopOpacity={0} />
              <Stop offset="0.55" stopColor={hue} stopOpacity={0.4} />
              <Stop offset="0.92" stopColor={hue} stopOpacity={0.95} />
              <Stop offset="1" stopColor={hue} stopOpacity={0.5} />
            </SvgLinearGradient>
          ))}
        </Defs>
        {AURORA_RAYS.map((ray, i) => (
          <AuroraRay key={i} ray={ray} {...fxp} />
        ))}
      </Svg>
    </View>
  );
}

/** One outbound ripple ring. */
function RippleRing({ index, press, holdT }: FxProps & { index: number }) {
  const props = useAnimatedProps(() => {
    const phase = (((holdT.value - index * 0.25) % 1) + 1) % 1;
    const grow = Easing.out(Easing.quad)(phase);
    const ry = 4 + grow * 29;
    const rx = 8 + grow * 126;
    return {
      x: FRAME.width / 2 - rx,
      y: FRAME.height / 2 - ry,
      width: rx * 2,
      height: ry * 2,
      rx: Math.min(ry, rx),
      // Reversed on direction: born invisible at the centre, gaining light
      // as it expands — and the wrap is seamless for free, because a ring
      // resets to zero size exactly when its opacity is zero.
      strokeOpacity: press.value * 0.55 * grow,
    };
  });
  return (
    <AnimatedRect fill="none" stroke="#CEC7FB" strokeWidth={1.2}
      animatedProps={props} />
  );
}

function RippleFx(fxp: FxProps) {
  return (
    <View pointerEvents="none" style={styles.glowLayer}>
      <Svg width={FRAME.width} height={FRAME.height} style={styles.glowSvg}>
        {[0, 1, 2, 3].map((i) => (
          <RippleRing key={i} index={i} {...fxp} />
        ))}
      </Svg>
    </View>
  );
}

/**
 * A projection with a refresh rate. Three motions while held, all off the
 * hold clock: the scanlines CRAWL upward (one 4pt period every eighth of a
 * cycle, seamless), the whole projection flickers hard at ~13Hz, and the
 * chromatic edges split further apart with the press — plus a constant
 * gentle shimmer even at rest so the surface never reads as printed.
 */
function HologramFx({ press, holdT }: FxProps) {
  const flicker = useAnimatedStyle(() => ({
    opacity:
      0.92 +
      0.08 * Math.sin(holdT.value * 26 * Math.PI) -
      press.value * 0.3 * (0.5 + 0.5 * Math.sin(holdT.value * 82 * Math.PI)),
  }));
  const crawl = useAnimatedStyle(() => ({
    transform: [{ translateY: -((holdT.value * 8) % 1) * 4 }],
  }));
  const lines: number[] = [];
  for (let y = -4; y < FRAME.height + 4; y += 4) lines.push(y);
  return (
    <Animated.View pointerEvents="none" style={[styles.litLayer, flicker]}>
      <Animated.View pointerEvents="none" style={[styles.litLayer, crawl]}>
        <Svg width={FRAME.width} height={FRAME.height + 8}
          style={styles.glowSvg}>
          {lines.map((y) => (
            <Line key={y} x1={0} y1={y + 4} x2={FRAME.width} y2={y + 4}
              stroke="#A99BF5" strokeOpacity={0.09} strokeWidth={1} />
          ))}
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

/**
 * One star population serves both states. Positions come from the R2
 * low-discrepancy sequence (two independent irrationals), which spreads
 * points evenly-but-randomly across the whole pill — the old golden-angle
 * scatter correlated x with y and banded the stars into diagonals.
 *
 * Each star is a zero-length round-capped line: at rest that renders as a
 * dot (with per-depth tilt parallax). Pressing is the throttle — the SAME
 * star accelerates outward from its own resting position (the rush offset
 * is scaled by press, so the transition is continuous, no swap), stretches
 * into a streak, fades as it passes the hull, and respawns at home for the
 * next rush. Four rushes per hold cycle, phase-staggered.
 */
const STARS = (() => {
  const A1 = 0.7548776662;
  const A2 = 0.5698402909; // R2 sequence
  const cx = FRAME.width / 2;
  const cy = FRAME.height / 2;
  return Array.from({ length: 26 }, (_, i) => {
    const x = ((0.5 + (i + 1) * A1) % 1) * FRAME.width;
    const y = ((0.5 + (i + 1) * A2) % 1) * FRAME.height;
    let dx = x - cx;
    let dy = y - cy;
    const len = Math.max(10, Math.hypot(dx, dy));
    dx /= len; dy /= len;
    return {
      x, y, dx, dy,
      r: 0.6 + ((i * 23.6068) % 1) * 1.1,
      depth: 0.45 + ((i * 41.4214) % 1) * 0.9,
      phase: (i * 0.618034) % 1,
    };
  });
})();

function Star({
  star, press, holdT, shift,
}: FxProps & { star: (typeof STARS)[number] }) {
  const props = useAnimatedProps(() => {
    const px = star.x + (shift?.x.value ?? 0) * star.depth * 0.8;
    const py = star.y + (shift?.y.value ?? 0) * star.depth * 0.8;
    const t = (holdT.value * 4 + star.phase) % 1;
    const rush = Easing.in(Easing.quad)(t);
    // Scaled by press: at press-in every star departs from ITS OWN dot.
    const out = rush * 150 * star.depth * press.value;
    const streak = (3 + rush * 36 * star.depth) * press.value;
    const hx = px + star.dx * out;
    const hy = py + star.dy * out;
    const restOp = 0.3 + star.depth * 0.5;
    const rushOp = star.depth * Math.min(1, t / 0.12) * (1 - rush * 0.55);
    return {
      x1: hx - star.dx * streak,
      y1: hy - star.dy * streak,
      x2: hx,
      y2: hy,
      strokeOpacity: restOp * (1 - press.value) + rushOp * press.value,
    };
  });
  return (
    <AnimatedLine stroke="#E7E3FD" strokeWidth={star.r * 2}
      strokeLinecap="round" animatedProps={props} />
  );
}

function StarfieldFx(fxp: FxProps) {
  return (
    <View pointerEvents="none" style={styles.glowLayer}>
      <Svg width={FRAME.width} height={FRAME.height} style={styles.glowSvg}>
        {STARS.map((star, i) => (
          <Star key={i} star={star} {...fxp} />
        ))}
      </Svg>
    </View>
  );
}

/** A warm beam chasing the tilt at high gain; press widens the cone. */
function SpotlightFx({ press, shift }: FxProps) {
  const M = 100;
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: (shift?.x.value ?? 0) * 2.2 },
      { translateY: (shift?.y.value ?? 0) * 1.4 },
      { scale: 1 + press.value * 0.4 },
    ],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.litLayer, style]}>
      <Svg width={FRAME.width + M * 2} height={FRAME.height + M * 2}
        style={{ position: 'absolute', left: -M, top: -M }}>
        <Defs>
          <RadialGradient id="spotBeam" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor="#E7E3FD" stopOpacity={0.5} />
            <Stop offset="0.4" stopColor="#CEC7FB" stopOpacity={0.18} />
            <Stop offset="1" stopColor="#CEC7FB" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={(FRAME.width + M * 2) / 2} cy={(FRAME.height + M * 2) / 2}
          rx={95} ry={62} fill="url(#spotBeam)" />
      </Svg>
    </Animated.View>
  );
}

/**
 * Beadwork, not thread: round dots along both rings. A zero-length dash on
 * a round-capped stroke renders each dash as a perfect circle, so the dot
 * ring is still one stroke and the march is still a dashoffset — same
 * machinery as before, dots instead of dashes.
 */
function StitchFx({ press, holdT }: FxProps) {
  // Dot cycle is 8 (0-length dash + 8 gap); 16 per loop = seamless march.
  const props = useAnimatedProps(() => ({
    strokeDashoffset: -holdT.value * 16 * press.value,
  }));
  const h = FRAME.height - 12;
  return (
    <View pointerEvents="none" style={styles.glowLayer}>
      <Svg width={FRAME.width} height={FRAME.height} style={styles.glowSvg}>
        <AnimatedRect x={6} y={6} width={FRAME.width - 12} height={h} rx={h / 2}
          fill="none" stroke="#CEC7FB" strokeWidth={2.6} strokeLinecap="round"
          strokeDasharray="0.1 8" animatedProps={props} />
        <Rect x={11} y={11} width={FRAME.width - 22} height={FRAME.height - 22}
          rx={(FRAME.height - 22) / 2} fill="none" stroke="#8B7CF6"
          strokeOpacity={0.4} strokeWidth={1.8} strokeLinecap="round"
          strokeDasharray="0.1 8" />
        {/* Third ring: finest beads, quietest, offset half a cycle so its
            dots sit between the inner ring's — three depths of beadwork. */}
        <Rect x={16} y={16} width={FRAME.width - 32} height={FRAME.height - 32}
          rx={(FRAME.height - 32) / 2} fill="none" stroke="#5847D6"
          strokeOpacity={0.3} strokeWidth={1.2} strokeLinecap="round"
          strokeDasharray="0.1 8" strokeDashoffset={4} />
      </Svg>
    </View>
  );
}

/** Comet: bright head, layered fading tail, orbiting the rim while held. */
function CometFx({ press, holdT, shift }: FxProps) {
  const inset = 2;
  const w = FRAME.width - inset * 2;
  const h = FRAME.height - inset * 2;
  const r = h / 2;
  // Perimeter of the stadium rim the comet rides.
  const P = 2 * (w - 2 * r) + 2 * Math.PI * r;
  // ONE comet, not three: nine short segments trail the head at stepped
  // offsets, opacity falling on a power curve and colour cooling from white
  // through lilac to indigo. Adjacent segments overlap by 1pt, so they fuse
  // into a single continuous body with a smoothly dying tail — one object
  // revolving the border, not layered strokes chasing each other.
  // Twenty-four segments at CONSTANT width, 5pt step with 5pt overlap:
  // the varying widths were themselves the visible joins (each step drew a
  // ledge), and 12pt gaps left the caps readable as separate dashes. At a
  // 5pt step every join is fully covered by the neighbouring round cap, and
  // a wide soft under-stroke (drawn first, below) blurs what remains.
  const segs = Array.from({ length: 24 }, (_, i) => ({
    len: 10,
    behind: i * 5,
    width: 2.1,
    opacity: (1 - i / 24) ** 1.7,
    color: ['#F3F1FE', '#F3F1FE', '#F3F1FE', '#E7E3FD', '#E7E3FD', '#E7E3FD',
            '#E7E3FD', '#CEC7FB', '#CEC7FB', '#CEC7FB', '#CEC7FB', '#CEC7FB',
            '#A99BF5', '#A99BF5', '#A99BF5', '#A99BF5', '#A99BF5', '#A99BF5',
            '#8B7CF6', '#8B7CF6', '#8B7CF6', '#8B7CF6', '#8B7CF6', '#8B7CF6'][i],
  }));
  return (
    <View pointerEvents="none" style={styles.glowLayer}>
      <Svg width={FRAME.width} height={FRAME.height} style={styles.glowSvg}>
        {/* Soft halo pass first: the same tail at 6pt width and quarter
            opacity — the poor man's layer blur, melting the joins. */}
        {segs.map((seg, i) => (
          <CometSeg key={`h${i}`} {...{ inset, w, h, r, P }}
            seg={{ ...seg, width: 6, opacity: seg.opacity * 0.22 }}
            press={press} holdT={holdT} shift={shift} />
        ))}
        {segs.map((seg, i) => (
          <CometSeg key={i} {...{ inset, w, h, r, P }} seg={seg}
            press={press} holdT={holdT} shift={shift} />
        ))}
      </Svg>
    </View>
  );
}

function CometSeg({
  inset, w, h, r, P, seg, press, holdT, shift,
}: FxProps & {
  inset: number; w: number; h: number; r: number; P: number;
  seg: { len: number; behind: number; width: number; opacity: number; color: string };
}) {
  const props = useAnimatedProps(() => {
    // Parked at the top-right arc at rest, nudged by roll; orbits on hold.
    const park = P * 0.12 + (shift?.x.value ?? 0) * 0.6;
    return {
      strokeDashoffset: -(park + holdT.value * P * press.value) + seg.behind,
      strokeOpacity: seg.opacity * (0.5 + 0.5 * press.value),
    };
  });
  return (
    <AnimatedRect x={inset} y={inset} width={w} height={h} rx={r} fill="none"
      stroke={seg.color} strokeWidth={seg.width} strokeLinecap="round"
      strokeDasharray={`${seg.len} ${P - seg.len}`} animatedProps={props} />
  );
}

const AnimatedLine = Animated.createAnimatedComponent(Line);
/**
 * Digital corruption, constructed rather than decorated.
 *
 * The realisation driving this rebuild: a glitch is not shapes ON an image,
 * it is the image ITSELF mis-assembled. So glitch now has a signal — a
 * horizontally-banded indigo fill — and the whole face is built from eight
 * clipped slices of that signal. At rest every slice sits at zero offset
 * and the fill is seamless; corruption is those same slices of CONTENT
 * displacing sideways, each dragging faint chromatic ghosts.
 *
 * The rest of the grammar, from how codecs actually fail:
 * - macroblocks: corruption blocks snap to an 8pt grid, and half are
 *   DROPOUTS (dark, missing data) rather than highlights
 * - bursts: a slow envelope (3 rolls per cycle) switches the whole system
 *   between calm (25% amplitude) and violent — glitches breathe, they are
 *   not uniformly chaotic
 * - everything advances in 14 discrete steps per cycle, hash-driven,
 *   reproducible frame-for-frame; nothing ever glides
 */
function glitchHash(n: number): number {
  'worklet';
  const x = Math.sin(n) * 43758.5453;
  return x - Math.floor(x);
}

/** Irregular slice heights covering the pill exactly (sum 68). */
const G_SLICES = (() => {
  const hs = [10, 8, 12, 6, 10, 8, 9, 5];
  let y = 0;
  return hs.map((h) => {
    const band = { y, h };
    y += h;
    return band;
  });
})();

/** One slice of the signal: clipped band, content shifts inside it. */
function GlitchSliceV2({
  band, index, press, holdT,
}: FxProps & { band: (typeof G_SLICES)[number]; index: number }) {
  const mk = (layer: number, opacity: number) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useAnimatedProps(() => {
      const step = Math.floor(holdT.value * 14);
      const burst = glitchHash(Math.floor(holdT.value * 3) * 97.7);
      const violence = burst < 0.5 ? 0.25 : 1;
      const r = glitchHash(index * 91.17 + step * 13.7);
      const active = r < 0.55;
      const shear =
        (r - 0.5) * 34 * press.value * violence * (active ? 1 : 0.1);
      const chroma = layer === 0 ? 0 : (layer === 1 ? -1 : 1) * (2 + Math.abs(shear) * 0.5);
      return {
        x: -40 + shear + chroma,
        opacity: layer === 0 ? 1 : press.value * opacity * (active ? 1 : 0),
      };
    });
  };
  const core = mk(0, 1);
  const ghostA = mk(1, 0.3);
  const ghostB = mk(2, 0.3);
  return (
    <G clipPath={`url(#gclip${index})`}>
      <AnimatedRect y={0} width={FRAME.width + 80} height={FRAME.height}
        fill="url(#glitchSignal)" animatedProps={core} />
      <AnimatedRect y={0} width={FRAME.width + 80} height={FRAME.height}
        fill="url(#glitchGhostA)" animatedProps={ghostA} />
      <AnimatedRect y={0} width={FRAME.width + 80} height={FRAME.height}
        fill="url(#glitchGhostB)" animatedProps={ghostB} />
    </G>
  );
}

/** Macroblocks: 8pt-grid-aligned, half dropouts, half hot. */
const G_BLOCKS = Array.from({ length: 12 }, (_, i) => ({
  x: 8 * Math.floor(((0.5 + (i + 1) * 0.7548776662) % 1) * 33),
  y: 8 * Math.floor(((0.5 + (i + 1) * 0.5698402909) % 1) * 8),
  w: 8 * (1 + (i % 3)),
  h: 8 * (1 + (i % 2)),
  dropout: i % 2 === 0,
}));

function GlitchMacroblock({
  b, index, press, holdT,
}: FxProps & { b: (typeof G_BLOCKS)[number]; index: number }) {
  const props = useAnimatedProps(() => {
    const step = Math.floor(holdT.value * 14);
    const burst = glitchHash(Math.floor(holdT.value * 3) * 97.7);
    const violence = burst < 0.5 ? 0.3 : 1;
    const r = glitchHash(index * 47.9 + step * 23.1);
    return {
      fillOpacity: press.value * violence * (r < 0.28 ? (b.dropout ? 0.85 : 0.5 + r) : 0),
    };
  });
  return (
    <AnimatedRect x={b.x} y={b.y} width={b.w} height={b.h}
      fill={b.dropout ? '#181140' : '#CEC7FB'} animatedProps={props} />
  );
}

function GlitchTear({
  index, press, holdT,
}: FxProps & { index: number }) {
  const props = useAnimatedProps(() => {
    const step = Math.floor(holdT.value * 14);
    const burst = glitchHash(Math.floor(holdT.value * 3) * 97.7);
    const r = glitchHash(index * 71.3 + step * 31.7);
    // Tears prefer slice boundaries — they are where the assembly fails.
    const edges = [10, 18, 30, 36, 46, 54, 63];
    const y = edges[Math.floor(r * edges.length)] ?? 34;
    return {
      y,
      fillOpacity: press.value * (burst >= 0.5 && r < 0.7 ? 0.55 : 0),
    };
  });
  return (
    <AnimatedRect x={0} width={FRAME.width} height={1}
      fill="#E7E3FD" animatedProps={props} />
  );
}

function GlitchFlash({ press, holdT }: FxProps) {
  const props = useAnimatedProps(() => {
    const step = Math.floor(holdT.value * 14);
    const r = glitchHash(step * 57.77);
    return { fillOpacity: press.value * (r < 0.06 ? 0.14 : 0) };
  });
  return (
    <AnimatedRect width={FRAME.width} height={FRAME.height}
      fill="#F3F1FE" animatedProps={props} />
  );
}

function GlitchFx(fxp: FxProps) {
  return (
    <View pointerEvents="none" style={styles.glowLayer}>
      <Svg width={FRAME.width} height={FRAME.height} style={styles.glowSvg}>
        <Defs>
          {/* The signal: irregular horizontal bands, so displacement is
              VISIBLE — a vertical-only gradient would shear invisibly. */}
          <SvgLinearGradient id="glitchSignal" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#36298F" />
            <Stop offset="0.16" stopColor="#5847D6" />
            <Stop offset="0.27" stopColor="#271D66" />
            <Stop offset="0.44" stopColor="#4636B8" />
            <Stop offset="0.55" stopColor="#181140" />
            <Stop offset="0.71" stopColor="#36298F" />
            <Stop offset="0.84" stopColor="#6D5CF0" />
            <Stop offset="1" stopColor="#271D66" />
          </SvgLinearGradient>
          <SvgLinearGradient id="glitchGhostA" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#A99BF5" />
            <Stop offset="1" stopColor="#A99BF5" />
          </SvgLinearGradient>
          <SvgLinearGradient id="glitchGhostB" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#5847D6" />
            <Stop offset="1" stopColor="#5847D6" />
          </SvgLinearGradient>
          {G_SLICES.map((band, i) => (
            <ClipPath key={i} id={`gclip${i}`}>
              <Rect x={0} y={band.y} width={FRAME.width} height={band.h} />
            </ClipPath>
          ))}
        </Defs>
        {G_SLICES.map((band, i) => (
          <GlitchSliceV2 key={i} band={band} index={i} {...fxp} />
        ))}
        {G_BLOCKS.map((b, i) => (
          <GlitchMacroblock key={i} b={b} index={i} {...fxp} />
        ))}
        <GlitchTear index={0} {...fxp} />
        <GlitchTear index={1} {...fxp} />
        <GlitchFlash {...fxp} />
      </Svg>
    </View>
  );
}

/**
 * A 20x5 grid (100 cells at 12pt). The pixels light around the TOUCH, not
 * randomly: each cell's brightness falls off with its distance from the
 * finger (radius breathing on the hold clock), the lit region follows the
 * finger as it drifts, and a per-step hash shimmers the cells inside the
 * halo so the area reads as live static rather than a flat disc.
 */
const PIXELS = Array.from({ length: 100 }, (_, i) => ({
  col: i % 20,
  row: Math.floor(i / 20),
}));

function Pixel({
  px, index, press, holdT, touch,
}: FxProps & { px: (typeof PIXELS)[number]; index: number }) {
  const cx = 1.6 + px.col * 13.6 + 6;
  const cy = 0.8 + px.row * 13.6 + 6;
  const props = useAnimatedProps(() => {
    const tx = touch?.x.value ?? FRAME.width / 2;
    const ty = touch?.y.value ?? FRAME.height / 2;
    const d = Math.hypot(cx - tx, cy - ty);
    const radius = 48 + 12 * Math.sin(holdT.value * 2 * Math.PI * 2);
    const fall = Math.max(0, 1 - d / radius);
    const step = Math.floor(holdT.value * 8);
    const shimmer = 0.6 + 0.4 * glitchHash(index * 12.9898 + step * 78.233);
    return { fillOpacity: 0.07 + press.value * fall * shimmer * 0.8 };
  });
  return (
    <AnimatedRect x={1.6 + px.col * 13.6} y={0.8 + px.row * 13.6} width={12}
      height={12} rx={2} fill="#8B7CF6" animatedProps={props} />
  );
}

function PixelFx(fxp: FxProps) {
  return (
    <View pointerEvents="none" style={styles.glowLayer}>
      <Svg width={FRAME.width} height={FRAME.height} style={styles.glowSvg}>
        {PIXELS.map((px, i) => (
          <Pixel key={i} px={px} index={i} {...fxp} />
        ))}
      </Svg>
    </View>
  );
}

/**
 * The liquid-UI halftone: a quiet dot grid over the pill, as on the
 * reference's meshed body. Faint on purpose — texture, not pattern.
 */
function DotMesh() {
  // Larger, sparser, fainter than the first pass: r=0.7 dots land near the
  // sub-pixel floor once the pill is composited, and alias into grain rather
  // than reading as a mesh. 390 nodes was also a lot to rasterise per frame.
  const dots: React.ReactNode[] = [];
  const step = 9;
  for (let x = step / 2; x < FRAME.width; x += step) {
    for (let y = step / 2; y < FRAME.height; y += step) {
      dots.push(
        <Circle key={`${x}-${y}`} cx={x} cy={y} r={1.1} fill="#F3F1FE" />,
      );
    }
  }
  return (
    <View pointerEvents="none" style={styles.glowLayer}>
      <Svg
        width={FRAME.width}
        height={FRAME.height}
        style={styles.glowSvg}
        opacity={0.06}>
        {dots}
      </Svg>
    </View>
  );
}

function ButtonLabel({
  spec,
  children,
}: {
  spec: VariantSpec['label'];
  children: string;
}) {
  if (spec.kind === 'solid') {
    return (
      <Text style={[styles.label, { color: spec.color }]}>
        {children}
      </Text>
    );
  }
  return <GradientLabel spec={spec}>{children}</GradientLabel>;
}

/**
 * Figma fills the label with a 115.7deg gradient running white -> #8B7CF6.
 * RN cannot gradient-fill text directly, so the text becomes a mask over a
 * gradient. The hidden copy underneath keeps the mask from collapsing the
 * layout and gives assistive tech something to measure.
 */
function GradientLabel({
  spec,
  children,
}: {
  spec: Extract<VariantSpec['label'], { kind: 'gradient' }>;
  children: string;
}) {
  // Defaults are node 31:293's: 115.7deg measured clockwise from Figma's 12
  // o'clock, which lands just past horizontal, sweeping left-to-right and
  // slightly downward. Variants ported from other nodes override.
  const colors = spec.colors ?? ['#F3F1FE', theme.color.indigo400];
  const locations = spec.locations ?? [0.2, 1];
  const start = spec.angle?.start ?? { x: 0, y: 0.1 };
  const end = spec.angle?.end ?? { x: 1, y: 0.9 };
  return (
    <MaskedView
      style={styles.labelMask}
      maskElement={
        <View style={styles.maskFill}>
          <Text style={[styles.label, styles.maskText]}>{children}</Text>
        </View>
      }>
      <LinearGradient
        colors={colors as readonly [string, string, ...string[]]}
        locations={locations as readonly [number, number, ...number[]]}
        start={start}
        end={end}>
        <Text style={[styles.label, styles.gradientSizer]}>
          {children}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  pillWrapper: {
    // The design is a fixed 272x68 pill, not a stretch-to-fill bar. The scale
    // transform lives out here so the Pressable's own layout never changes.
    width: FRAME.width,
    alignSelf: 'center',
  },
  pill: {
    // PINNED to the design's height, not left intrinsic.
    //
    // Every decorative layer — washes, violet base, dish, mesh, border ring —
    // is drawn into a FRAME-sized SVG. While the pill sized itself to its
    // content, those layers only matched by luck: 67pt with a 16pt label,
    // 65 with concave's 14, and 72 once the icon slot pushed it out. Any
    // shortfall showed as unpainted button, which is the gap you could see
    // along the bottom edge with the icon on.
    height: FRAME.height,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // The design's icon-to-label gap; harmless when there is no icon.
    gap: 12,
    paddingHorizontal: 16,
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    borderColor: 'rgba(169, 155, 245, 0.2)',
    overflow: 'hidden',
    // Inset shadows (used by several variants) need the New Architecture,
    // which Expo SDK 57 / RN 0.86 enables by default.
  },
  pillDisabled: {
    opacity: 0.5,
  },
  concaveFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#181140',
  },
  litLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  glowLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  glowSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  labelMask: {
    flexShrink: 1,
  },
  maskFill: {
    backgroundColor: 'transparent',
  },
  maskText: {
    color: '#181140',
  },
  gradientSizer: {
    opacity: 0,
  },
  glyphBox: {
    width: 24,
    height: 24,
  },
  glyphPart: {
    position: 'absolute',
  },
  label: {
    // Google Sans Flex Regular, per the design; bundled in src/assets/fonts.
    fontFamily: theme.font.flexRegular,
    fontSize: 16,
    textAlign: 'center',
  },
});
