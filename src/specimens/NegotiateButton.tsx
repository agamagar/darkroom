import MaskedView from '@react-native-masked-view/masked-view';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

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
  | 'molten';

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
    edge: 'top' | 'bottom' | 'left';
    color: string;
    rest: number;
    lit: number;
    squash?: number;
    core?: string;
  };
  /** A halftone dot mesh over the fill, as on liquid-UI surfaces. */
  mesh?: boolean;
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
   * After Jakub Wuzik's "Recharge." liquid UI: molten liquid pooled in the
   * left cap of a dark meshed pill, white-hot at the core, bloom bleeding
   * past the rim. Pressing stokes the coal. The one variant that leaves the
   * indigo palette — the reference's identity IS the heat.
   */
  molten: {
    pill: {
      backgroundColor: '#161114',
      borderColor: 'rgba(255, 255, 255, 0.06)',
      boxShadow:
        'inset 18px 0px 44px 0px rgba(255, 61, 0, 0.55), 0px 4px 32px 0px rgba(255, 45, 0, 0.28)',
    },
    glow: {
      edge: 'left',
      color: '#FF3D00',
      core: '#FF8A3C',
      rest: 0.9,
      lit: 1,
    },
    mesh: true,
    label: { kind: 'solid', color: '#F5F0EC' },
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
  style?: StyleProp<ViewStyle>;
};

export function NegotiateButton({
  label = 'Negotiate flight',
  variant = 'gradient',
  onPress,
  disabled = false,
  haptics = true,
  forcePressed = false,
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
        {spec.glow && spec.glow.rest > 0 && (
          <GlowWash config={spec.glow} lit={false} />
        )}
        {spec.mesh && <DotMesh />}
        {/*
          The lit layer is the glow again at full strength, faded in on press.
          Stacking rather than swapping means the two states share their
          geometry exactly, so nothing shifts as it brightens.
        */}
        {spec.glow && (
          <Animated.View
            pointerEvents="none"
            style={[styles.litLayer, litStyle]}
            needsOffscreenAlphaCompositing>
            <GlowWash config={spec.glow} lit />
          </Animated.View>
        )}
        <ButtonLabel spec={spec.label}>{label}</ButtonLabel>
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
    edge === 'left'
      ? { cx: 22, cy: FRAME.height / 2, rx: 95 * squash, ry: FRAME.height * 0.85 }
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
          <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
            {core ? (
              <>
                <Stop offset="0" stopColor={core} stopOpacity={opacity} />
                <Stop offset="0.3" stopColor={color} stopOpacity={opacity} />
                <Stop
                  offset="0.65"
                  stopColor={color}
                  stopOpacity={opacity * 0.45}
                />
              </>
            ) : (
              <>
                <Stop offset="0" stopColor={color} stopOpacity={opacity} />
                <Stop
                  offset="0.6"
                  stopColor={color}
                  stopOpacity={opacity * 0.4}
                />
              </>
            )}
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={geom.cx} cy={geom.cy} rx={geom.rx} ry={geom.ry} fill={`url(#${id})`} />
      </Svg>
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
  label: {
    // Google Sans Flex Regular, per the design; bundled in src/assets/fonts.
    fontFamily: theme.font.flexRegular,
    fontSize: 16,
    textAlign: 'center',
  },
});
