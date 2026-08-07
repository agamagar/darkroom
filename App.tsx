import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { NegotiateButton } from './src/specimens/NegotiateButton';
import { theme } from './src/theme';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.root}>
        <ScrollView
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic">
          <Text style={styles.title}>Dark Room</Text>
          <Text style={styles.subtitle}>Button experiments</Text>

          <View style={styles.bench}>
            <Text style={styles.specimenName}>Default — press me</Text>
            <NegotiateButton onPress={() => {}} />

            <Text style={styles.specimenName}>Pressed (pinned)</Text>
            <NegotiateButton forcePressed />

            <Text style={styles.specimenName}>Disabled</Text>
            <NegotiateButton disabled />
          </View>
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.color.bg,
  },
  content: {
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.xl,
    paddingBottom: theme.space.xxl,
    gap: theme.space.sm,
  },
  title: {
    color: theme.color.textPrimary,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  subtitle: {
    color: theme.color.textSecondary,
    fontSize: 15,
  },
  bench: {
    marginTop: theme.space.xl,
    gap: theme.space.lg,
  },
  specimenName: {
    color: theme.color.textTertiary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
