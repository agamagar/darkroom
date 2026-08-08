import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { theme } from '../theme';

/**
 * Figma: Away Working File, node 38:5318 (bottom of "Start negotiation").
 *
 * A wheel, not a segmented control: options scroll horizontally and whichever
 * one is centred is the selected one. That is what makes it hold an arbitrary
 * number of variations — the row simply gets longer, and nothing has to shrink
 * to fit. Chips are also directly tappable, since scrolling to a far option is
 * tedious once the list is long.
 */

const CHIP_HEIGHT = 30;
const CHIP_GAP = 12;
/**
 * Chips are measured rather than fixed-width so labels of any length work, but
 * snapping needs a single stride. Each chip is padded out to this width, which
 * fits the longest label the bench currently uses with room to spare.
 */
const CHIP_WIDTH = 116;
const STRIDE = CHIP_WIDTH + CHIP_GAP;

export type VariantPickerProps<T extends string> = {
  /** Shown above the row, e.g. "STATE". */
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
};

export function VariantPicker<T extends string>({
  label,
  options,
  value,
  onChange,
}: VariantPickerProps<T>) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const selectedIndex = Math.max(0, options.indexOf(value));

  // Tracked separately from `value` so the highlight can follow the finger
  // mid-scroll, before the selection has actually committed.
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  // Half a screen minus half a chip, so the first and last options can both
  // reach the centre.
  const sidePad = Math.max(0, (width - CHIP_WIDTH) / 2);

  const scrollToIndex = useCallback(
    (index: number, animated = true) => {
      scrollRef.current?.scrollTo({ x: index * STRIDE, animated });
    },
    [],
  );

  // Keep the wheel honest when the value is changed from outside.
  useEffect(() => {
    setActiveIndex(selectedIndex);
    scrollToIndex(selectedIndex, false);
  }, [selectedIndex, scrollToIndex]);

  const indexFromOffset = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    Math.round(e.nativeEvent.contentOffset.x / STRIDE);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.min(options.length - 1, Math.max(0, indexFromOffset(e)));
    if (next !== activeIndex) {
      setActiveIndex(next);
      Haptics.selectionAsync().catch(() => {});
    }
  };

  const commit = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.min(options.length - 1, Math.max(0, indexFromOffset(e)));
    if (options[next] !== value) onChange(options[next]);
  };

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>

      <View>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={STRIDE}
          snapToAlignment="start"
          contentContainerStyle={{ paddingHorizontal: sidePad, gap: CHIP_GAP }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={commit}
          // Fires when the finger lifts without a fling; without it a slow
          // drag would move the highlight but never commit the value.
          onScrollEndDrag={commit}>
          {options.map((option, i) => (
            <Chip
              key={option}
              label={option}
              selected={i === activeIndex}
              onPress={() => {
                setActiveIndex(i);
                scrollToIndex(i);
                onChange(option);
              }}
            />
          ))}
        </ScrollView>

        {/* Options run off both edges; fading them makes the centre read as
            the live slot instead of the row looking arbitrarily clipped. */}
        <EdgeFade side="left" />
        <EdgeFade side="right" />
      </View>
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}>
      <Text
        numberOfLines={1}
        style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label.toUpperCase()}
      </Text>
    </Pressable>
  );
}

function EdgeFade({ side }: { side: 'left' | 'right' }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[theme.color.bg, 'rgba(11, 18, 32, 0)']}
      start={{ x: side === 'left' ? 0 : 1, y: 0 }}
      end={{ x: side === 'left' ? 1 : 0, y: 0 }}
      style={[styles.fade, side === 'left' ? styles.fadeLeft : styles.fadeRight]}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    gap: theme.space.sm,
  },
  label: {
    color: theme.color.textTertiary,
    fontSize: 11,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  chip: {
    width: CHIP_WIDTH,
    height: CHIP_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(139, 124, 246, 0.15)',
    backgroundColor: 'rgba(139, 124, 246, 0.04)',
  },
  chipSelected: {
    borderColor: theme.color.indigo400,
    backgroundColor: 'rgba(139, 124, 246, 0.12)',
  },
  chipText: {
    color: theme.color.textTertiary,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  chipTextSelected: {
    color: theme.color.textPrimary,
  },
  fade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 64,
  },
  fadeLeft: {
    left: 0,
  },
  fadeRight: {
    right: 0,
  },
});
