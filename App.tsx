import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { BenchPanel, PANEL_HEIGHT, PANEL_PEEK } from './src/bench/BenchSheet';
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
import { freeze } from './src/freeze';
import { NegotiateButton } from './src/specimens/NegotiateButton';
import { theme } from './src/theme';

export default function App() {
  const [selection, setSelection] = useState<Selection>(INITIAL_SELECTION);
  // Golden-image drive: exp://.../--/?type=molten&state=pressed&chrome=off
  // &freeze=1 steers the bench from a script. chrome=off drops the control
  // pane entirely; freeze pins every self-running clock (src/freeze.ts).
  const [chromeHidden, setChromeHidden] = useState(false);
  const url = Linking.useURL();
  useEffect(() => {
    if (!url) return;
    const { queryParams } = Linking.parse(url);
    if (!queryParams) return;
    const q = (k: string) =>
      typeof queryParams[k] === 'string' ? (queryParams[k] as string) : undefined;
    freeze.current = q('freeze') === '1';
    setChromeHidden(q('chrome') === 'off');
    setSelection((sel) => ({
      ...sel,
      ...(q('type') && (TYPES as readonly string[]).includes(q('type')!)
        ? { type: q('type') as Selection['type'] }
        : null),
      ...(q('state') && (STATES as readonly string[]).includes(q('state')!)
        ? { state: q('state') as Selection['state'] }
        : null),
      ...(q('screen') && (SCREENS as readonly string[]).includes(q('screen')!)
        ? { screen: q('screen') as Selection['screen'] }
        : null),
    }));
  }, [url]);
  const { width, height } = useWindowDimensions();

  // 1 = collapsed to the peeking handle strip (the handle toggles this).
  const panelCollapsed = useSharedValue(0);


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

  // The stage cedes the pane's height while it is docked and reclaims it
  // when the pane tucks away — the split in the split view.
  const stageStyle = useAnimatedStyle(() => ({
    paddingBottom: chromeHidden
      ? 0
      : withTiming(
          panelCollapsed.value === 1 ? PANEL_PEEK : PANEL_HEIGHT,
          { duration: 260 },
        ),
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

  // The negotiate screen is a measured 360x780 design canvas: fit it to the
  // device and drop the specimen into the design's own button slot. Every
  // other screen is a wash behind a centred specimen.
  //
  // Capped at 1. A transform scale rasterises the subtree and then resamples
  // it, so scaling UP (1.12x on this phone) softens every edge and every
  // glyph on the screen. Below 1 the resample is a downsample, which is
  // harmless; at 1 there is no transform at all and it renders natively.
  const designScale = Math.min(
    1,
    width / DESIGN_FRAME.width,
    height / DESIGN_FRAME.height,
  );

  if (!fontsLoaded) {
    return <View style={styles.root} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
        <Animated.View
          style={[
            styles.stage,
            selection.screen === 'negotiate' && styles.stageBlack,
            stageStyle,
          ]}>
        {selection.screen === 'negotiate' ? (
          <View
            style={{
              width: DESIGN_FRAME.width,
              height: DESIGN_FRAME.height,
              transform: designScale === 1 ? undefined : [{ scale: designScale }],
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

      {chromeHidden ? null : (
      <BenchPanel collapsed={panelCollapsed}>
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
      </BenchPanel>
      )}
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
  // The negotiate canvas is pure black and no longer stretches to fill;
  // matching the stage keeps its edge invisible.
  stageBlack: {
    backgroundColor: '#000000',
  },
});
