import * as Haptics from 'expo-haptics';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { BenchSheet, SHEET_HEIGHT } from './src/bench/BenchSheet';
import {
  DESIGN_FRAME,
  SPECIMEN_SLOT,
} from './src/bench/NegotiationScreen';
import { ScreenBackdrop } from './src/bench/screens';
import { SegmentedRow } from './src/bench/SegmentedRow';
import { useGlowTilt } from './src/bench/useGlowTilt';
import { VariantPicker } from './src/bench/VariantPicker';
import {
  GYROS,
  ICONS,
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
  const [floaterHidden, setFloaterHidden] = useState(false);
  const { width, height } = useWindowDimensions();

  // Two-finger tap-and-hold anywhere on the stage tucks the floater away
  // (and brings it back) — for clean screenshots of a screen without the
  // bench chrome in the corner. Two fingers so it can never collide with
  // pressing a specimen.
  // (A Pan, not a LongPress — LongPress cannot require two pointers.)
  const toggleFloater = Gesture.Pan()
    .minPointers(2)
    .maxPointers(2)
    .activateAfterLongPress(350)
    .onStart(() => {
      setFloaterHidden((h) => !h);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    })
    .runOnJS(true);

  // Block first paint until the design's families are in — a flash of the
  // system font on a fidelity bench defeats the bench.
  const [fontsLoaded] = useFonts({
    'GoogleSansFlex-Light': require('./src/assets/fonts/GoogleSansFlex-Light.ttf'),
    'GoogleSansFlex-Regular': require('./src/assets/fonts/GoogleSansFlex-Regular.ttf'),
    'StackSansHeadline-Light': require('./src/assets/fonts/StackSansHeadline-Light.ttf'),
  });

  // Device tilt leans the specimen's light. See useGlowTilt for why this is
  // a hook and not four lines inline.
  const glowShift = useGlowTilt(selection.gyro);

  // The sheet writes 0..1 here; the stage reads it. Split view means the
  // stage gives up half the sheet's height and the specimen stays visible
  // while the wheels turn.
  const sheetProgress = useSharedValue(0);
  const stageStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (-sheetProgress.value * SHEET_HEIGHT) / 2 }],
  }));

  const specimen = (
    <NegotiateButton
      // Remounts on selection change so a specimen that pins its press
      // value at mount picks the new one up.
      key={`${selection.state}-${selection.type}-${selection.icon}`}
      onPress={() => {}}
      glowShift={glowShift}
      {...propsFor(selection)}
    />
  );

  // The negotiate screen is a measured 360x780 design canvas: scale it to
  // the device and drop the specimen into the design's own button slot.
  // Every other screen is a wash behind a centred specimen.
  const designScale = Math.min(
    width / DESIGN_FRAME.width,
    height / DESIGN_FRAME.height,
  );

  if (!fontsLoaded) {
    return <View style={styles.root} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      <GestureDetector gesture={toggleFloater}>
        <Animated.View style={[styles.stage, stageStyle]}>
        {selection.screen === 'negotiate' ? (
          <View
            style={{
              width: DESIGN_FRAME.width,
              height: DESIGN_FRAME.height,
              transform: [{ scale: designScale }],
            }}>
            <ScreenBackdrop screen={selection.screen} />
            <View
              style={{
                position: 'absolute',
                left: SPECIMEN_SLOT.x,
                top: SPECIMEN_SLOT.y,
                width: SPECIMEN_SLOT.width,
                height: SPECIMEN_SLOT.height,
              }}>
              {specimen}
            </View>
          </View>
        ) : (
          <>
            <ScreenBackdrop screen={selection.screen} />
            {specimen}
          </>
        )}
        </Animated.View>
      </GestureDetector>

      <BenchSheet
        visible={sheetOpen}
        progress={sheetProgress}
        floaterHidden={floaterHidden}
        onOpen={() => setSheetOpen(true)}
        onClose={() => setSheetOpen(false)}>
        <SegmentedRow
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
        <SegmentedRow
          label="Icon"
          options={ICONS}
          value={selection.icon}
          onChange={(icon) => setSelection((s) => ({ ...s, icon }))}
        />
        <SegmentedRow
          label="Motion"
          options={GYROS}
          value={selection.gyro}
          onChange={(gyro) => setSelection((s) => ({ ...s, gyro }))}
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
