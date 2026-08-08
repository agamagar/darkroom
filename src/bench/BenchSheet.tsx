import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { theme } from '../theme';

/**
 * The bench's control pane — a PERMANENT split view, not a sheet. The
 * controls are always docked below the stage; there is no floater, no
 * open/close, no drag. The two-finger hold still tucks the whole pane away
 * for clean screenshots (the caller drives `hidden`), sliding it off the
 * bottom edge while the stage absorbs the space.
 */

export const PANEL_HEIGHT = 460;

export function BenchPanel({
  hidden,
  children,
}: {
  hidden: SharedValue<number>;
  children: React.ReactNode;
}) {
  const slide = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: withTiming(hidden.value * (PANEL_HEIGHT + 40), {
          duration: 240,
          easing: Easing.out(Easing.cubic),
        }),
      },
    ],
  }));

  return (
    <Animated.View style={[styles.panel, slide]}>
      <View style={styles.grabber} />
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
    paddingTop: theme.space.sm,
    paddingBottom: theme.space.xl,
    gap: theme.space.lg,
    backgroundColor: theme.color.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: 'rgba(139, 124, 246, 0.15)',
  },
  // Vestigial handle kept purely as a visual cap for the pane's top edge.
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(154, 166, 184, 0.35)',
  },
});
