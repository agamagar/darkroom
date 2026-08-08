import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { theme } from '../theme';

/**
 * A segmented control for short axes (2-4 options): the whole range visible
 * at once, a sliding thumb marking the selection. The wheel (VariantPicker)
 * stays the right tool for axes that grow — this is the right one for axes
 * that don't.
 */

const TRACK_HEIGHT = 36;
const TRACK_PAD = 2;

export function SegmentedRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const segWidth = trackWidth > 0 ? (trackWidth - TRACK_PAD * 2) / options.length : 0;
  const selectedIndex = Math.max(0, options.indexOf(value));

  const thumbX = useSharedValue(0);
  // An effect, not a render-time write (that races reanimated's commit).
  // Follows selection AND layout: the first onLayout also lands the thumb.
  useEffect(() => {
    thumbX.value = withTiming(selectedIndex * segWidth, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [selectedIndex, segWidth, thumbX]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
  }));

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <View
        accessibilityRole="tablist"
        style={styles.track}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}>
        {segWidth > 0 && (
          <Animated.View
            style={[styles.thumb, { width: segWidth }, thumbStyle]}
          />
        )}
        {options.map((option) => (
          <Pressable
            key={option}
            accessibilityRole="tab"
            accessibilityState={{ selected: option === value }}
            accessibilityLabel={option}
            style={styles.segment}
            onPress={() => {
              if (option === value) return;
              Haptics.selectionAsync().catch(() => {});
              onChange(option);
            }}>
            <Text
              numberOfLines={1}
              style={[
                styles.segmentText,
                option === value && styles.segmentTextSelected,
              ]}>
              {option.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: theme.space.sm,
    paddingHorizontal: theme.space.lg,
  },
  label: {
    color: theme.color.textTertiary,
    fontSize: 11,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  track: {
    flexDirection: 'row',
    height: TRACK_HEIGHT,
    padding: TRACK_PAD,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(139, 124, 246, 0.15)',
    backgroundColor: 'rgba(139, 124, 246, 0.05)',
  },
  thumb: {
    position: 'absolute',
    top: TRACK_PAD,
    left: TRACK_PAD,
    bottom: TRACK_PAD,
    borderRadius: 999,
    backgroundColor: 'rgba(139, 124, 246, 0.18)',
    borderWidth: 1,
    borderColor: theme.color.indigo400,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    color: theme.color.textTertiary,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  segmentTextSelected: {
    color: theme.color.textPrimary,
  },
});
