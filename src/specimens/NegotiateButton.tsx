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
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient as SvgLinearGradient,
  Mask,
  Path,
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
  | 'blueprint';

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
  /** Label treatment. Gradient is the design's masked fill. */
  label:
    | {
        kind: 'gradient';
        fontSize?: number;
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
      backgroundColor: theme.color.primary950,
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
      borderColor: 'rgba(255, 255, 255, 0.18)',
      boxShadow: `0px 10px 44px 0px rgba(109, 92, 240, 0.55)`,
    },
    // Pressing floods the face with the lighter indigo from below.
    glow: { edge: 'bottom', color: theme.color.indigo400, rest: 0.35, lit: 0.9 },
    label: { kind: 'solid', color: theme.color.primary950 },
  },

  /** The gradient flipped: lit from above, bottom in shadow. The dark room. */
  eclipse: {
    pill: {
      backgroundColor: theme.color.primary950,
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
      backgroundColor: theme.color.primary950,
      borderColor: theme.color.hairline,
      boxShadow: `inset 0px 0px 30px 0px rgba(109, 92, 240, 0.5), 0px 4px 32px 0px rgba(109, 92, 240, 0.28)`,
    },
    glow: {
      edge: 'center',
      color: theme.color.glow,
      core: theme.color.indigo400,
      rest: 0.9,
      lit: 1,
      // Wider than the pill on both axes: the falloff gets clipped by the
      // edge rather than dying visibly inside it.
      spread: 2.4,
    },
    mesh: true,
    label: { kind: 'solid', color: '#F5F0EC' },
  },

  /**
   * Port of node 48:12304 ("Negotiate", Portfolio file): deep-violet radial
   * base fading to black at the rim, glow off the bottom edge, an inset
   * throw from the bottom-RIGHT (#3E01C8), a 1.5pt gradient stroke (see
   * gradientBorder), and the negotiate glyph that draws itself on a 2s loop.
   */
  drawn: {
    pill: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      boxShadow: 'inset -8px -16px 40px 0px #3E01C8',
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
   * #4D00FF throw. Pressed: a dish appears — a radial that is DARKEST at its
   * centre (#181140) and brightest at the rim (#3E2CA6), so the face reads
   * pushed in. The press does not brighten this button, it hollows it.
   */
  concave: {
    pill: {
      backgroundColor: theme.color.primary950,
      borderWidth: 0,
    },
    insetThrow: true,
    dish: true,
    label: {
      kind: 'gradient',
      // 14px here, not the 16 of node 31:293; the sheen is a white band with
      // one grey notch at 66%, angled 114.6deg.
      fontSize: 14,
      colors: ['#FFFFFF', '#FFFFFF', '#DBDBDB', '#FFFFFF'],
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
      backgroundColor: '#170403',
      borderColor: 'rgba(255, 69, 48, 0.12)',
      boxShadow: 'inset 0px -12px 36px 0px rgba(214, 40, 24, 0.5)',
    },
    glow: { edge: 'bottom', color: '#D62818', core: '#FF6A45', rest: 0.55, lit: 0.55 },
    developLabel: true,
    label: { kind: 'solid', color: '#FFE8E2' },
  },

  /**
   * The light leaves the face and becomes the edge: a neon tube around a
   * near-empty interior, blooming outward. Pressing overdrives the tube.
   */
  neon: {
    pill: {
      backgroundColor: 'rgba(15, 6, 32, 0.35)',
      borderWidth: 0,
      boxShadow: '0px 0px 28px 0px rgba(109, 92, 240, 0.4)',
    },
    neonRing: true,
    label: { kind: 'solid', color: '#F5F0FF' },
  },

  /**
   * No light at all — the matte one. Raised out of the background by dual
   * shadows; pressing fades the raise and forms a deboss. Material instead
   * of luminance, as a control for the rest of the wheel.
   */
  carve: {
    pill: {
      // Lilac clay rather than neutral slate: the surface itself carries
      // the house hue, and both shadows tint with it — lilac-white raise
      // from the upper left, deep violet fall to the lower right.
      backgroundColor: '#453A6B',
      borderColor: 'rgba(210, 198, 255, 0.1)',
      boxShadow:
        '-6px -8px 18px 0px rgba(200, 186, 255, 0.16), 8px 10px 22px 0px rgba(10, 4, 28, 0.65)',
    },
    carveInset: true,
    label: { kind: 'solid', color: '#F1ECFF' },
  },

  /**
   * Liquid metal: banded steel fill, dark label, and a diagonal sheen that
   * sweeps with the gyroscope — the one variant where tilt moves a
   * REFLECTION rather than a light. Pressing flicks the sheen across.
   */
  chrome: {
    pill: {
      backgroundColor: '#7A69C4',
      borderColor: 'rgba(230, 220, 255, 0.4)',
      boxShadow: '0px 6px 24px 0px rgba(20, 8, 50, 0.55)',
    },
    chromeBase: true,
    label: { kind: 'solid', color: '#1C1038' },
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
    glow: { edge: 'bottom', color: theme.color.glow, rest: 0, lit: 0.95 },
    label: { kind: 'gradient' },
  },

  /**
   * A copy of `drawn`, opened for divergence — same violet radial base,
   * bottom glow, bottom-right inset throw, gradient stroke and self-drawing
   * glyph. Fork it freely; `drawn` stays the faithful port of 48:12304.
   */
  material: {
    pill: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      boxShadow: 'inset -8px -16px 40px 0px #3E01C8',
    },
    violetBase: true,
    drawIcon: true,
    gradientBorder: true,
    glow: { edge: 'bottom', color: theme.color.glow, rest: 0.5, lit: 0.9 },
    label: { kind: 'gradient' },
  },

  /** Light under a door: the glow compressed into a hot band at the rim. */
  ember: {
    pill: {
      backgroundColor: theme.color.primary950,
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
  const reducedMotion = useReducedMotion();

  const pillStyle = useAnimatedStyle(() => ({
    // Reduce Motion kills the scale but keeps the glow — the press must still
    // be visible, just not by moving.
    transform: [
      { scale: reducedMotion ? 1 : 1 - press.value * (1 - PRESSED_SCALE) },
    ],
  }));

  const litStyle = useAnimatedStyle(() => ({ opacity: press.value }));
  /** Inverse of litStyle — for chrome the press must REMOVE, not add. */
  const dimStyle = useAnimatedStyle(() => ({ opacity: 1 - press.value }));
  /** Photo-paper development: latent at rest, full under the press. */
  const developStyle = useAnimatedStyle(() => ({
    opacity: spec.developLabel ? 0.22 + press.value * 0.78 : 1,
  }));
  /** Chrome sheen: tilt slides the reflection, the press flicks it across. */
  const sheenStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          (glowShift ? glowShift.x.value * 5 : 0) + press.value * 90 - 45,
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
        onPress={onPress}
        onPressIn={() => {
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
            <ChromeBase />
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
            <Animated.View pointerEvents="none" style={[styles.litLayer, litStyle]}>
              <NeonRing lit />
            </Animated.View>
          </>
        )}
        {spec.carveInset && (
          <Animated.View pointerEvents="none" style={[styles.litLayer, litStyle]}>
            <CarveInset />
          </Animated.View>
        )}
        {spec.blueprintChrome && (
          <Animated.View pointerEvents="none" style={[styles.litLayer, dimStyle]}>
            <BlueprintChrome />
          </Animated.View>
        )}
        {spec.dish && (
          <Animated.View
            pointerEvents="none"
            style={[styles.litLayer, litStyle]}>
            <ConcaveDish />
          </Animated.View>
        )}
        {spec.mesh && <DotMesh />}
        {showIcon && <NegotiateGlyph kind={iconKind} />}
        <Animated.View style={developStyle}>
          <ButtonLabel spec={spec.label}>{label}</ButtonLabel>
        </Animated.View>
        {spec.gradientBorder && <GradientBorderRing />}
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
    const dx = shift ? shift.x.value / (geom.rx * 2) : 0;
    const dy = shift ? shift.y.value / (geom.ry * 2) : 0;
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
 * Node 48:12304's base fill: a radial from #200363 at (0.5, 0.594) out
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
            <Stop offset="0" stopColor="#200363" />
            <Stop offset="0.25" stopColor="#18024A" />
            <Stop offset="0.5" stopColor="#100131" />
            <Stop offset="0.75" stopColor="#080119" />
            <Stop offset="0.875" stopColor="#04000C" />
            <Stop offset="1" stopColor="#000000" />
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
                stopColor="#FFFFFF"
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
 * Node 51:92's `inset 0 8px 36px #4D00FF`, rebuilt as a vertical gradient.
 *
 * The stops are not invented — they are the pixel-diff measurements, each
 * sampled alpha solved from observed = a*#4D00FF + (1-a)*#0F0620 down the
 * centreline. Reproducing the shadow this way costs nothing visually and
 * buys the one thing a CSS shadow string cannot do: respond to tilt.
 *
 * Tilt rotates the throw axis rather than sliding it, so the lit band stays
 * anchored to the rim and only its direction changes — the same reason the
 * washes move their focal point instead of translating.
 */
const THROW_STOPS: [number, number][] = [
  [0, 0.72],
  [0.132, 0.48],
  [0.25, 0.29],
  [0.368, 0.148],
  [0.485, 0.054],
  [0.603, 0.018],
  [0.72, 0.045],
  [0.838, 0.135],
  [1, 0.27],
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
    const dx = shift ? shift.x.value / FRAME.width / 2 : 0;
    const dy = shift ? shift.y.value / FRAME.height / 2 : 0;
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
                stopColor="#4D00FF"
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
            <Stop offset="0.125" stopColor="#1D144D" />
            <Stop offset="0.25" stopColor="#22185A" />
            <Stop offset="0.375" stopColor="#261C66" />
            <Stop offset="0.5" stopColor="#2B1F73" />
            <Stop offset="0.625" stopColor="#302285" />
            <Stop offset="0.75" stopColor="#352596" />
            <Stop offset="0.875" stopColor="#39289E" />
            <Stop offset="1" stopColor="#3E2CA6" />
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
            stroke="#3E2CA6"
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
          stroke="#FFFFFF"
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
            stroke="#FFFFFF"
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
    const phase = (t.value + index * NEON_STAGGER) % 1;
    const sink = Easing.in(Easing.quad)(phase);
    const ry = baseRy * (1 - sink);
    // Opacity outruns the collapse: gone by 55% of the cycle, squared so the
    // drop is front-loaded — the ring dims as soon as it starts to go under,
    // and the geometry finishes sinking already invisible.
    const fade = Math.min(1, phase / 0.55);
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
      stroke={index === 0 ? '#FFFFFF' : '#D8CFFF'}
      strokeWidth={width}
      animatedProps={props}
    />
  );
}

/** The neon tube: a bright ring hugging the rim, haloed inward and out. */
function NeonRing({ lit }: { lit: boolean }) {
  const inset = 2;
  const w = FRAME.width - inset * 2;
  const h = FRAME.height - inset * 2;
  const reducedMotion = useReducedMotion();
  // One clock drives all five rings; their stagger comes from phase offsets.
  // Runs only on the lit copy, whose visibility the press already gates.
  // Reduce Motion pins it: rings hold at their golden-ratio homes, still.
  const sinkT = useSharedValue(0);
  useEffect(() => {
    if (!lit || reducedMotion) return;
    sinkT.value = 0;
    sinkT.value = withRepeat(
      withTiming(1, { duration: NEON_SINK_MS, easing: Easing.linear }),
      -1,
    );
  }, [lit, reducedMotion, sinkT]);
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
            stroke="#D8CFFF" strokeOpacity={0.9} strokeWidth={1.6} />
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
            <Stop offset="0" stopColor="#0A041C" stopOpacity={0.55} />
            <Stop offset="0.4" stopColor="#0A041C" stopOpacity={0.12} />
            <Stop offset="0.8" stopColor="#0A041C" stopOpacity={0} />
            <Stop offset="1" stopColor="#C4B5FD" stopOpacity={0.12} />
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
  return (
    <View pointerEvents="none" style={styles.glowLayer}>
      <Svg width={FRAME.width} height={FRAME.height} style={styles.glowSvg}>
        <Defs>
          <SvgLinearGradient id="chromeBands" x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor="#CBB8FF" />
            <Stop offset="0.42" stopColor="#8B7CF6" />
            <Stop offset="0.5" stopColor="#453473" />
            <Stop offset="0.62" stopColor="#7563C9" />
            <Stop offset="1" stopColor="#B4A2F5" />
          </SvgLinearGradient>
        </Defs>
        <Rect width={FRAME.width} height={FRAME.height} fill="url(#chromeBands)" />
      </Svg>
    </View>
  );
}

/** The travelling reflection. Its parent animates translateX + rotation. */
function ChromeSheen() {
  return (
    <View pointerEvents="none" style={styles.glowLayer}>
      <Svg width={FRAME.width} height={FRAME.height} style={styles.glowSvg}>
        <Defs>
          <SvgLinearGradient id="chromeSheen" x1="0" y1="0.5" x2="1" y2="0.5">
            <Stop offset="0" stopColor="#EAE1FF" stopOpacity={0} />
            <Stop offset="0.42" stopColor="#EAE1FF" stopOpacity={0.06} />
            <Stop offset="0.5" stopColor="#EAE1FF" stopOpacity={0.5} />
            <Stop offset="0.58" stopColor="#EAE1FF" stopOpacity={0.06} />
            <Stop offset="1" stopColor="#EAE1FF" stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>
        <Rect x={-40} y={-20} width={FRAME.width + 80} height={FRAME.height + 40}
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
function BlueprintChrome() {
  const c = '#7FB8FF';
  const inset = 1.5;
  const w = FRAME.width - inset * 2;
  const h = FRAME.height - inset * 2;
  const handles: [number, number][] = [
    [inset, inset], [FRAME.width - inset, inset],
    [inset, FRAME.height - inset], [FRAME.width - inset, FRAME.height - inset],
  ];

  // The capsule being sectioned: slightly inside the rim.
  const f = { x: 8, y: 8, w: 256, h: 54 };
  const fr = f.h / 2;
  const cy = f.y + fr;
  const capL = f.x + fr;
  const capR = f.x + f.w - fr;
  /** How flat an edge-on circular section projects. */
  const FORESHORTEN = 0.3;

  // Body rings every ~26pt, plus a fixed cascade INSIDE each cap (at 45%,
  // 72% and 91% of the cap depth) so the rounding is drawn, not implied —
  // one ring per cap reads as a chamfer, three read as a sphere.
  const ringXs: number[] = [];
  for (let x = capL; x <= capR; x += 26) ringXs.push(x);
  for (const t of [0.45, 0.72, 0.91]) {
    ringXs.push(capL - fr * t);
    ringXs.push(capR + fr * t);
  }
  const rings = ringXs
    .map((x) => {
      const d = x < capL ? capL - x : x > capR ? x - capR : 0;
      const r = d === 0 ? fr : fr * Math.sqrt(Math.max(0, 1 - (d / fr) ** 2));
      return { x, ry: r, rx: Math.max(2, r * FORESHORTEN) };
    })
    .filter((ring) => ring.ry > 5);

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
          {/* Silhouette. */}
          <Rect x={f.x} y={f.y} width={f.w} height={f.h} rx={fr} fill="none"
            stroke={c} strokeOpacity={0.75} strokeWidth={1} />

          {/* Section rings — the capsule turned in depth. */}
          {rings.map(({ x, rx, ry }) => (
            <Ellipse key={x} cx={x} cy={cy} rx={rx} ry={ry} fill="none"
              stroke={c} strokeOpacity={0.45} strokeWidth={0.8} />
          ))}

        </G>

        {/* Selection chrome — annotation, unmasked. */}
        <Rect x={inset} y={inset} width={w} height={h} rx={h / 2} fill="none"
          stroke={c} strokeOpacity={0.8} strokeWidth={1} strokeDasharray="6 4" />
        {handles.map(([hx, hy]) => (
          <Rect key={`${hx}-${hy}`} x={hx - 3} y={hy - 3} width={6} height={6}
            fill={theme.color.bg} stroke={c} strokeWidth={1} />
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
        <Circle key={`${x}-${y}`} cx={x} cy={y} r={1.1} fill="#FFFFFF" />,
      );
    }
  }
  return (
    <View pointerEvents="none" style={styles.glowLayer}>
      <Svg
        width={FRAME.width}
        height={FRAME.height}
        style={styles.glowSvg}
        opacity={0.045}>
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
      <Text style={[styles.label, { color: spec.color, fontWeight: '500' }]}>
        {children}
      </Text>
    );
  }
  return <GradientLabel spec={spec}>{children}</GradientLabel>;
}

/**
 * Figma fills the label with a 115.7deg gradient running white -> #8375E5.
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
  const size = spec.fontSize ? { fontSize: spec.fontSize } : null;
  const colors = spec.colors ?? ['#FFFFFF', theme.color.labelGradientEnd];
  const locations = spec.locations ?? [0.2, 1];
  const start = spec.angle?.start ?? { x: 0, y: 0.1 };
  const end = spec.angle?.end ?? { x: 1, y: 0.9 };
  return (
    <MaskedView
      style={styles.labelMask}
      maskElement={
        <View style={styles.maskFill}>
          <Text style={[styles.label, size, styles.maskText]}>{children}</Text>
        </View>
      }>
      <LinearGradient
        colors={colors as readonly [string, string, ...string[]]}
        locations={locations as readonly [number, number, ...number[]]}
        start={start}
        end={end}>
        <Text style={[styles.label, size, styles.gradientSizer]}>
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
    borderColor: theme.color.hairline,
    overflow: 'hidden',
    // Inset shadows (used by several variants) need the New Architecture,
    // which Expo SDK 57 / RN 0.86 enables by default.
  },
  pillDisabled: {
    opacity: 0.5,
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
    color: '#000000',
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
