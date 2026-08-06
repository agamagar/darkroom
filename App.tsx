import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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
            <Text style={styles.placeholder}>
              No specimens yet — drop a button in here.
            </Text>
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
  placeholder: {
    color: theme.color.textTertiary,
    fontSize: 14,
  },
});
