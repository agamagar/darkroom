import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>Dark Room</Text>
        </View>

        {/* The specimen sits alone in the middle with nothing to compare
            itself against — the pickers swap what is under the light. */}
        <View style={styles.stage}>
          <NegotiateButton
            // Remounts on state change so a specimen that pins its press
            // value at mount picks the new one up.
            key={`${selection.state}-${selection.type}`}
            onPress={() => {}}
            {...propsFor(selection)}
          />
        </View>

        <View style={styles.controls}>
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
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.color.bg,
  },
  header: {
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.md,
  },
  title: {
    color: theme.color.textPrimary,
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    paddingBottom: theme.space.xl,
    gap: theme.space.lg,
  },
});
