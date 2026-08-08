import { Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  useAnimatedStyle,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { theme } from '../theme';

/**
 * The bench's control pane — a docked split view with a collapsible handle.
 * The handle at the pane's top edge collapses it down to a peeking strip
 * (handle stays reachable) and expands it back; the two-finger hold still
 * tucks the pane away entirely for clean screenshots.
 */

export const PANEL_HEIGHT = 460;
/** How much of the pane stays peeking when collapsed — just the handle. */
export const PANEL_PEEK = 34;

export function BenchPanel({
  hidden,
  collapsed,
  children,
}: {
  hidden: SharedValue<number>;
  collapsed: SharedValue<number>;
  children: React.ReactNode;
}) {
  const slide = useAnimatedStyle(() => {
    const target =
      hidden.value === 1
        ? PANEL_HEIGHT + 40
        : collapsed.value === 1
          ? PANEL_HEIGHT - PANEL_PEEK
          : 0;
    return {
      transform: [
        {
          translateY: withTiming(target, {
            duration: 260,
            easing: Easing.out(Easing.cubic),
          }),
        },
      ],
    };
  });
  const chevronFlip = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: withTiming(collapsed.value === 1 ? '180deg' : '0deg', {
          duration: 220,
        }),
      },
    ],
  }));

  return (
    <Animated.View style={[styles.panel, slide]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Collapse or expand controls"
        hitSlop={{ top: 10, bottom: 6, left: 40, right: 40 }}
        onPress={() => {
          collapsed.value = collapsed.value === 1 ? 0 : 1;
          Haptics.selectionAsync().catch(() => {});
        }}
        style={styles.handle}>
        <Animated.View style={chevronFlip}>
          <Svg width={16} height={16} viewBox="0 0 16 16">
            <Path d="M3.5 6.5 L8 10.5 L12.5 6.5" stroke={theme.color.indigo400}
              strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"
              fill="none" />
          </Svg>
        </Animated.View>
      </Pressable>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: PANEL_HEIGHT,
    paddingTop: 2,
    paddingBottom: theme.space.xl,
    gap: theme.space.md,
    backgroundColor: theme.color.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: 'rgba(139, 124, 246, 0.15)',
  },
  handle: {
    alignSelf: 'center',
    width: 56,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
});
