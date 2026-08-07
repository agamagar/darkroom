import { useEffect } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';

import { theme } from '../theme';

/**
 * The bench's control drawer: a circular floater in the bottom-left corner
 * that raises a bottom sheet holding the variant pickers. The sheet is built
 * on reanimated + gesture-handler directly — a library sheet earns its keep
 * on multi-snap-point scrolling content, not two picker rows.
 *
 * Split view, not modal: there is no backdrop, and the caller receives the
 * same 0..1 `progress` value the sheet animates with, so it can shift the
 * stage up in lockstep and keep the specimen visible while the wheels turn.
 * That co-visibility is the whole point — you watch the component change as
 * you change it.
 */

export const SHEET_HEIGHT = 240;
const FLOATER_SIZE = 52;
/** Drag past this fraction of the sheet height (or fling) and it dismisses. */
const DISMISS_FRACTION = 0.33;

export function BenchSheet({
  visible,
  progress,
  onOpen,
  onClose,
  children,
}: {
  visible: boolean;
  /** Owned by the caller so the stage can animate off the same value. */
  progress: SharedValue<number>;
  onOpen: () => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { height: screenHeight } = useWindowDimensions();
  /** Extra translate while the finger drags the sheet down. */
  const drag = useSharedValue(0);

  // Parent state is the source of truth; the shared value follows it. (An
  // effect, not a render-time write — writing shared values during render
  // races reanimated's commit.)
  useEffect(() => {
    if (visible) {
      // Timing, not spring — the sheet should arrive and stop, no bounce.
      progress.value = withTiming(1, {
        duration: 260,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [visible, progress]);

  const close = () => {
    drag.value = withTiming(0, { duration: 120 });
    progress.value = withTiming(0, { duration: 200 });
    onClose();
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      // The sheet follows the finger down; upward drags compress to nothing.
      drag.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      const shouldDismiss =
        drag.value > SHEET_HEIGHT * DISMISS_FRACTION || e.velocityY > 800;
      if (shouldDismiss) {
        runOnJS(close)();
      } else {
        drag.value = withTiming(0, {
          duration: 180,
          easing: Easing.out(Easing.cubic),
        });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          interpolate(progress.value, [0, 1], [SHEET_HEIGHT, 0]) + drag.value,
      },
    ],
  }));

  const floaterStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 0.8]) }],
  }));

  return (
    <>
      {/* The floater. Sits out of the way bottom-left; fades as the sheet
          rises since the sheet replaces it. */}
      <Animated.View
        style={[styles.floaterWrap, floaterStyle]}
        pointerEvents={visible ? 'none' : 'auto'}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open variant controls"
          onPress={onOpen}
          style={styles.floater}>
          <SlidersIcon />
        </Pressable>
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View
          style={[styles.sheet, { top: screenHeight - SHEET_HEIGHT }, sheetStyle]}>
          {/* No backdrop in a split view, so the grabber is also the close
              button for anyone not inclined to drag. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close variant controls"
            hitSlop={12}
            onPress={close}>
            <View style={styles.grabber} />
          </Pressable>
          {children}
        </Animated.View>
      </GestureDetector>
    </>
  );
}

/** Two slider tracks with offset knobs — the universal "tweak me" glyph. */
function SlidersIcon() {
  const c = theme.color.indigo400;
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22">
      <Line x1={2} y1={7} x2={20} y2={7} stroke={c} strokeWidth={1.6} strokeLinecap="round" />
      <Circle cx={8} cy={7} r={3} fill={theme.color.primary950} stroke={c} strokeWidth={1.6} />
      <Line x1={2} y1={15} x2={20} y2={15} stroke={c} strokeWidth={1.6} strokeLinecap="round" />
      <Circle cx={14} cy={15} r={3} fill={theme.color.primary950} stroke={c} strokeWidth={1.6} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  floaterWrap: {
    position: 'absolute',
    left: theme.space.lg,
    bottom: theme.space.xl + theme.space.sm,
  },
  floater: {
    width: FLOATER_SIZE,
    height: FLOATER_SIZE,
    borderRadius: FLOATER_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.primary950,
    borderWidth: 1,
    borderColor: 'rgba(139, 124, 246, 0.35)',
    // A hint of the house glow so it reads as part of the family.
    boxShadow: `0px 4px 24px 0px rgba(109, 92, 240, 0.35)`,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    paddingTop: theme.space.sm,
    paddingBottom: theme.space.xl,
    gap: theme.space.lg,
    backgroundColor: theme.color.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: 'rgba(139, 124, 246, 0.15)',
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(154, 166, 184, 0.35)',
  },
});
