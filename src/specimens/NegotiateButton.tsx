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
  LinearGradient as SvgLinearGradient,
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
  | 'drawn';

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
  };
  /** A halftone dot mesh over the fill, as on liquid-UI surfaces. */
  mesh?: boolean;
  /** The deep-violet radial base of node 48:12304, under everything else. */
  violetBase?: boolean;
  /** The self-drawing negotiate glyph beside the label (2s loop). */
  drawIcon?: boolean;
  /**
   * Node 48:12304's stroke is a gradient, not a flat colour — near-invisible
   * at the top, violet at the caps and bottom (sampled from the render:
   * top-mid rgb(8,2,19) vs cap-mid rgb(94,57,178)). RN cannot gradient a
   * borderColor, so this draws the ring as an SVG stroke.
   */
  gradientBorder?: boolean;
  /** Label treatment. Gradient is the design's masked fill. */
  label: { kind: 'gradient' } | { kind: 'solid'; color: string };
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
      gap: 12,
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
  glowShift,
  style,
}: NegotiateButtonProps) {
  const spec = VARIANTS[variant];

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

  const shiftStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: glowShift?.x.value ?? 0 },
      { translateY: glowShift?.y.value ?? 0 },
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
        {/*
          Both wash layers share one shifted parent so the gyroscope moves
          them as a single light source. The lit layer is the glow again at
          full strength, faded in on press — stacking rather than swapping
          means the two states share their geometry exactly.
        */}
        {spec.glow && (
          <Animated.View
            pointerEvents="none"
            style={[styles.litLayer, shiftStyle]}>
            {spec.glow.rest > 0 && <GlowWash config={spec.glow} lit={false} />}
            <Animated.View
              pointerEvents="none"
              style={[styles.litLayer, litStyle]}
              needsOffscreenAlphaCompositing>
              <GlowWash config={spec.glow} lit />
            </Animated.View>
          </Animated.View>
        )}
        {spec.mesh && <DotMesh />}
        {spec.drawIcon && <NegotiateGlyph />}
        <ButtonLabel spec={spec.label}>{label}</ButtonLabel>
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
}: {
  config: NonNullable<VariantSpec['glow']>;
  lit: boolean;
}) {
  const { edge, color, core, squash = 1 } = config;
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
          rx: 62 * squash,
          ry: FRAME.height * 0.85,
        }
      : {
          cx: GLOW_ELLIPSE.x + GLOW_ELLIPSE.width / 2,
          cy: edge === 'bottom' ? cyBottom : FRAME.height - cyBottom,
          rx: GLOW_ELLIPSE.width / 2,
          ry: (GLOW_ELLIPSE.height / 2) * squash,
        };
  const id = `wash-${edge}-${color.replace('#', '')}-${lit ? 'lit' : 'rest'}-${squash}`;
  return (
    <View pointerEvents="none" style={styles.glowLayer}>
      <Svg width={FRAME.width} height={FRAME.height} style={styles.glowSvg}>
        <Defs>
          {/* Stops are keyed arrays, never fragments: react-native-svg
              clones gradient children with a `parent` prop, and a Fragment
              rejects it ("Invalid prop `parent` supplied to React.Fragment"). */}
          <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
            {(core
              ? [
                  <Stop key="s0" offset="0" stopColor={core} stopOpacity={opacity} />,
                  <Stop key="s1" offset="0.3" stopColor={color} stopOpacity={opacity} />,
                  <Stop key="s2" offset="0.65" stopColor={color} stopOpacity={opacity * 0.45} />,
                ]
              : [
                  <Stop key="s0" offset="0" stopColor={color} stopOpacity={opacity} />,
                  <Stop key="s1" offset="0.6" stopColor={color} stopOpacity={opacity * 0.4} />,
                ]
            ).concat(
              <Stop key="sEnd" offset="1" stopColor={color} stopOpacity={0} />,
            )}
          </RadialGradient>
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
 * The gradient stroke of node 48:12304, drawn as an SVG ring. Stops fitted
 * to the sampled render: gone at the top, waking through violet mid-height,
 * full at the bottom rim.
 */
function GradientBorderRing() {
  const inset = 0.75; // centre a 1.5pt stroke on the frame edge
  return (
    <View pointerEvents="none" style={styles.glowLayer}>
      <Svg width={FRAME.width} height={FRAME.height} style={styles.glowSvg}>
        <Defs>
          <SvgLinearGradient id="borderRing" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.05} />
            <Stop offset="0.5" stopColor="#8B7CF6" stopOpacity={0.4} />
            <Stop offset="1" stopColor="#975AFF" stopOpacity={0.95} />
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

/** Zigzag path from the exported vector; measured length for dash math. */
const GLYPH_ZIGZAG = 'M20.65 10.65L12.15 2.15L7.15 7.15L0.65 0.65';
const GLYPH_ZIGZAG_LENGTH = 28.3;
const GLYPH_LOOP_MS = 2000;

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * The negotiate glyph, per the file's motion data (2s loop): the downtrend
 * line draws itself over 0-25% (ease-in-out), then the arrowhead pops in
 * over 17.5-27.5% — opacity ease-out, scale 0.4->1 on an overshoot bezier
 * (0.45, 1.45, 0.8, 1). Reduce Motion shows the finished glyph, still.
 */
function NegotiateGlyph() {
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
      strokeDashoffset: GLYPH_ZIGZAG_LENGTH * (1 - p),
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
      {/* Downtrend line — 21.3x11.3 at (2, 7) in the 24px box. */}
      <Svg
        width={21.3}
        height={11.3}
        viewBox="0 0 21.3 11.3"
        style={styles.glyphZigzag}>
        <AnimatedPath
          d={GLYPH_ZIGZAG}
          stroke="#FFFFFF"
          strokeWidth={1.3}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={`${GLYPH_ZIGZAG_LENGTH} ${GLYPH_ZIGZAG_LENGTH}`}
          animatedProps={zigzagProps}
        />
      </Svg>
      {/* Arrowhead — 7.3x7.3 corner bracket at (16, 11). */}
      <Animated.View style={[styles.glyphHead, headStyle]}>
        <Svg width={7.3} height={7.3} viewBox="0 0 7.3 7.3">
          <Path
            d="M0.65 6.65H6.65V0.65"
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

/**
 * The liquid-UI halftone: a quiet dot grid over the pill, as on the
 * reference's meshed body. Faint on purpose — texture, not pattern.
 */
function DotMesh() {
  const dots: React.ReactNode[] = [];
  const step = 7;
  for (let x = step / 2; x < FRAME.width; x += step) {
    for (let y = step / 2; y < FRAME.height; y += step) {
      dots.push(
        <Circle key={`${x}-${y}`} cx={x} cy={y} r={0.7} fill="#FFFFFF" />,
      );
    }
  }
  return (
    <View pointerEvents="none" style={styles.glowLayer}>
      <Svg
        width={FRAME.width}
        height={FRAME.height}
        style={styles.glowSvg}
        opacity={0.05}>
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
  return <GradientLabel>{children}</GradientLabel>;
}

/**
 * Figma fills the label with a 115.7deg gradient running white -> #8375E5.
 * RN cannot gradient-fill text directly, so the text becomes a mask over a
 * gradient. The hidden copy underneath keeps the mask from collapsing the
 * layout and gives assistive tech something to measure.
 */
function GradientLabel({ children }: { children: string }) {
  return (
    <MaskedView
      style={styles.labelMask}
      maskElement={
        <View style={styles.maskFill}>
          <Text style={[styles.label, styles.maskText]}>{children}</Text>
        </View>
      }>
      <LinearGradient
        // 115.7deg measured clockwise from Figma's 12 o'clock lands just past
        // horizontal, sweeping left-to-right and slightly downward.
        colors={['#FFFFFF', theme.color.labelGradientEnd]}
        locations={[0.2, 1]}
        start={{ x: 0, y: 0.1 }}
        end={{ x: 1, y: 0.9 }}>
        <Text style={[styles.label, styles.gradientSizer]}>{children}</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 24,
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
  glyphZigzag: {
    position: 'absolute',
    left: 2,
    top: 7,
  },
  glyphHead: {
    position: 'absolute',
    left: 16,
    top: 11,
  },
  label: {
    // Google Sans Flex Regular, per the design; bundled in src/assets/fonts.
    fontFamily: theme.font.flexRegular,
    fontSize: 16,
    textAlign: 'center',
  },
});
