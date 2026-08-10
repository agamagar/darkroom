import Slider from '@react-native-community/slider';
import { StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { theme } from '../theme';

/**
 * Pixel's density slider — the bench's first continuous control. Live label
 * while dragging, commit on release (regenerating a few hundred grid cells
 * per drag frame would thrash; on release it costs one remount).
 */
export function DensitySlider({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (cols: number) => void;
}) {
  const [live, setLive] = useState(value);
  const rows = Math.max(2, Math.round((68 - 4) / (272 / live)));
  return (
    <View style={styles.row}>
      <Text style={styles.label}>
        PIXEL DENSITY · {live} × {rows}
      </Text>
      <Slider
        style={styles.slider}
        minimumValue={12}
        maximumValue={40}
        step={2}
        value={value}
        onValueChange={setLive}
        onSlidingComplete={onCommit}
        minimumTrackTintColor={theme.color.indigo400}
        maximumTrackTintColor="rgba(139, 124, 246, 0.2)"
        thumbTintColor={theme.color.indigo400}
      />
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
    fontVariant: ['tabular-nums'],
  },
  slider: {
    height: 30,
  },
});
