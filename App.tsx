import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { BenchSheet } from './src/bench/BenchSheet';
import { VariantPicker } from './src/bench/VariantPicker';
import {
  INITIAL_SELECTION,
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

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.root}>
        {/* The specimen sits alone in the middle with nothing to compare
            itself against — the sheet swaps what is under the light. */}
        <View style={styles.stage}>
          <NegotiateButton
            // Remounts on selection change so a specimen that pins its press
            // value at mount picks the new one up.
            key={`${selection.state}-${selection.type}`}
            onPress={() => {}}
            {...propsFor(selection)}
          />
        </View>
      </SafeAreaView>

      <BenchSheet
        visible={sheetOpen}
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
