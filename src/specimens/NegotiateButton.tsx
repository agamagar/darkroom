import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { theme } from '../theme';

/**
 * Figma: Away Working File, node 31:293 ("Negotiate flight").
 *
 * Three effects stack to make the look, from back to front:
 *   1. a flat `primary/950` fill,
 *   2. a wide ellipse bleeding off the bottom edge, clipped by the pill,
 *   3. an inset box-shadow throwing purple up from the bottom.
 *
 * Figma exported the ellipse as an empty SVG because it is a blur with no
 * vector geometry, so it is rebuilt here as a radial gradient at the same
 * position and size the design gives it (240x77 at x=20.6, y=41.2 in a
 * 272x68 frame).
 */

const FRAME = { width: 272, height: 68 } as const;
const GLOW_ELLIPSE = { x: 20.58, y: 41.15, width: 239.76, height: 76.61 } as const;

export type NegotiateButtonProps = {
  label?: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function NegotiateButton({
  label = 'Negotiate flight',
  onPress,
  disabled = false,
  style,
}: NegotiateButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.pill, disabled && styles.pillDisabled, style]}>
      <BottomGlow />
      <GradientLabel>{label}</GradientLabel>
    </Pressable>
  );
}

/**
 * The soft wash rising off the bottom edge. Rendered at the frame's intrinsic
 * size and absolutely positioned so it keeps its shape regardless of how wide
 * the pill stretches; the pill's `overflow: hidden` does the clipping.
 */
function BottomGlow() {
  return (
    <View pointerEvents="none" style={styles.glowLayer}>
      <Svg width={FRAME.width} height={FRAME.height} style={styles.glowSvg}>
        <Defs>
          <RadialGradient id="negotiateGlow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={theme.color.glow} stopOpacity={0.55} />
            <Stop offset="0.6" stopColor={theme.color.glow} stopOpacity={0.22} />
            <Stop offset="1" stopColor={theme.color.glow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse
          cx={GLOW_ELLIPSE.x + GLOW_ELLIPSE.width / 2}
          cy={GLOW_ELLIPSE.y + GLOW_ELLIPSE.height / 2}
          rx={GLOW_ELLIPSE.width / 2}
          ry={GLOW_ELLIPSE.height / 2}
          fill="url(#negotiateGlow)"
        />
      </Svg>
    </View>
  );
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
  pill: {
    // The design is a fixed 272x68 pill, not a stretch-to-fill bar.
    width: FRAME.width,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 24,
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    borderColor: theme.color.hairline,
    backgroundColor: theme.color.primary950,
    overflow: 'hidden',
    // Figma: inset 0 -16px 40px #6d5cf0. Inset shadows need the New
    // Architecture, which Expo SDK 57 / RN 0.86 enables by default.
    boxShadow: `inset 0px -16px 40px 0px ${theme.color.glow}`,
  },
  pillDisabled: {
    opacity: 0.5,
  },
  glowLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  glowSvg: {
    position: 'absolute',
    bottom: 0,
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
    fontSize: 16,
    textAlign: 'center',
    // Design specifies Google Sans Flex Regular; not bundled yet, so this
    // falls back to the platform UI font.
    fontWeight: '400',
  },
});
