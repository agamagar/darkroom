import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { theme } from '../theme';
import { NegotiationScreen } from './NegotiationScreen';
import type { Screen } from './variations';

/**
 * The base UIs a specimen can sit on. A button that only ever gets judged on
 * a flat black void is being graded on its easiest exam — these backdrops
 * re-stage it on the surfaces it will actually meet.
 *
 * Rendered as an absolute fill BEHIND the stage; the specimen never knows.
 */
export function ScreenBackdrop({ screen }: { screen: Screen }) {
  switch (screen) {
    case 'void':
      return null; // the app background itself
    case 'negotiate':
      return <NegotiationScreen />;
    case 'globe':
      return <GlobeBackdrop />;
    case 'card':
      return <CardBackdrop />;
    case 'light':
      return <View style={[StyleSheet.absoluteFill, styles.light]} />;
  }
}

/**
 * Echo of the Away home: a planet rim cresting the top of the screen with a
 * purple atmosphere. Geometry only — enough to test the button against a
 * busy, already-glowing surface without importing the real globe.
 */
function GlobeBackdrop() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['#1A1240', theme.color.bg]}
        locations={[0, 0.55]}
        style={StyleSheet.absoluteFill}
      />
      <Svg width="100%" height="100%" viewBox="0 0 400 900" preserveAspectRatio="xMidYMin slice">
        <Defs>
          <RadialGradient id="atmosphere" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0.62" stopColor="#0A0A1E" stopOpacity={1} />
            <Stop offset="0.72" stopColor="#2B1C6B" stopOpacity={0.9} />
            <Stop offset="0.8" stopColor={theme.color.glow} stopOpacity={0.35} />
            <Stop offset="1" stopColor={theme.color.glow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {/* A planet far larger than the screen, mostly above it. */}
        <Ellipse cx={200} cy={-190} rx={430} ry={430} fill="url(#atmosphere)" />
      </Svg>
    </View>
  );
}

/** A surface panel behind the specimen, like sitting inside the search card. */
function CardBackdrop() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.cardWrap]} pointerEvents="none">
      <View style={styles.card} />
    </View>
  );
}

const styles = StyleSheet.create({
  light: {
    backgroundColor: '#F2F1F7',
  },
  cardWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '88%',
    height: 320,
    borderRadius: 24,
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: 'rgba(139, 124, 246, 0.18)',
  },
});
