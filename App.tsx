import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { BenchSheet, SHEET_HEIGHT } from './src/bench/BenchSheet';
import { ScreenBackdrop } from './src/bench/screens';
import { VariantPicker } from './src/bench/VariantPicker';
import {
  INITIAL_SELECTION,
  SCREENS,
  STATES,
  TYPES,
  propsFor,
  type Selection,
} from './src/bench/variations';
import { NegotiateButton } from './src/specimens/NegotiateButton';
import { theme } from './src/theme';

export default function App() {
  const [selection, setSelection] = useState<Selection>(INITIAL_SELECTION);
  const [sheetOpen, setSheetOpen] = useState(false);

  // The sheet writes 0..1 here; the stage reads it. Split view means the
  // specimen gives up half the sheet's height and stays centred in the rest,
  // visible while the wheels turn.
  const sheetProgress = useSharedValue(0);
  const stageStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (-sheetProgress.value * SHEET_HEIGHT) / 2 }],
  }));

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      {/* The base UI behind everything — the backdrop moves with the stage
          so specimen and surface read as one screen. */}
      <SafeAreaView style={styles.root}>
        <Animated.View style={[styles.stage, stageStyle]}>
          <ScreenBackdrop screen={selection.screen} />
          <NegotiateButton
            // Remounts on selection change so a specimen that pins its press
            // value at mount picks the new one up.
            key={`${selection.state}-${selection.type}`}
            onPress={() => {}}
            {...propsFor(selection)}
          />
        </Animated.View>
      </SafeAreaView>

      <BenchSheet
        visible={sheetOpen}
        progress={sheetProgress}
        onOpen={() => setSheetOpen(true)}
        onClose={() => setSheetOpen(false)}>
        <VariantPicker
          label="State"
          options={STATES}
          value={selection.state}
          onChange={(state) => setSelection((s) => ({ ...s, state }))}
        />
        <VariantPicker
          label="Type"
          options={TYPES}
          value={selection.type}
          onChange={(type) => setSelection((s) => ({ ...s, type }))}
        />
        <VariantPicker
          label="Screen"
          options={SCREENS}
          value={selection.screen}
          onChange={(screen) => setSelection((s) => ({ ...s, screen }))}
        />
      </BenchSheet>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.color.bg,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
