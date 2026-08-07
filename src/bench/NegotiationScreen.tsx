import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { theme } from '../theme';

/**
 * Figma: Portfolio 2026 · Site System, node 43:7125 ("Start negotiation") —
 * the FTUE negotiation demo. Headline, a three-deep stack of flight cards,
 * and the public/negotiated price bar with the negotiated figure blurred.
 *
 * Built as a bench SCREEN: everything from the design EXCEPT the Negotiate
 * button, which is the specimen's slot — the stage centres whatever variant
 * is selected roughly where the design places the button.
 *
 * Deliberate departures, both bench-driven: the stack is scaled 0.92 so it
 * clears the specimen slot on tall devices, and the negotiated price uses
 * layered ghost text instead of a real gaussian blur (RN has no text blur;
 * three offset copies at low opacity read the same at 20px).
 */

const CARD_RADIUS = 22;

export function NegotiationScreen() {
  return (
    <View style={styles.fill} pointerEvents="none">
      <View style={styles.headline}>
        <Text style={styles.headlineWhite}>Don’t just search</Text>
        <Text style={styles.headlineIndigo}>Ask Away to Negotiate</Text>
      </View>

      <View style={styles.stack}>
        {/* Two ghost cards peeking out behind the front one. */}
        <FlightCard width={259} style={styles.cardBack} ghost />
        <FlightCard width={292} style={styles.cardMid} ghost />
        <FlightCard width={323} style={styles.cardFront} />
        <PriceBar />
      </View>
    </View>
  );
}

function FlightCard({
  width,
  ghost = false,
  style,
}: {
  width: number;
  ghost?: boolean;
  style?: object;
}) {
  return (
    <View style={[styles.card, { width }, style]}>
      {!ghost && (
        <>
          <View style={styles.airlineRow}>
            <Image
              source={require('../assets/etihad-logo.png')}
              style={styles.airlineLogo}
            />
            <Text style={styles.airlineName}>Etihad Airways</Text>
          </View>
          <View style={styles.timesRow}>
            <Text style={styles.time}>06:50</Text>
            <Text style={styles.port}>DEL</Text>
            <RouteLine />
            <Text style={styles.time}>22:25</Text>
            <Text style={styles.port}>DXB</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>50h 35m</Text>
            <View style={styles.metaDot} />
            <Text style={styles.meta}>2 stops</Text>
          </View>
        </>
      )}
    </View>
  );
}

/** The exported asset is a plain 1.1pt line, #52525E — drawn, not shipped. */
function RouteLine() {
  return (
    <Svg width={53} height={9} viewBox="0 0 53.0526 8.8421">
      <Line
        x1={4.42}
        y1={4.42}
        x2={48.63}
        y2={4.42}
        stroke="#52525E"
        strokeWidth={1.105}
      />
    </Svg>
  );
}

function PriceBar() {
  return (
    <View style={styles.priceBar}>
      <View style={styles.priceCol}>
        <Text style={styles.priceLabel}>PUBLIC PRICE</Text>
        <Text style={styles.priceValue}>₹16,529</Text>
      </View>
      <Svg width={16} height={16} viewBox="0 0 16 16">
        <Path
          d="M6 4L10 8L6 12"
          stroke="#E2E8F0"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
      <View style={styles.priceCol}>
        <Text style={styles.priceLabel}>NEGOTIATED PRICE</Text>
        <BlurredPrice>₹15,529</BlurredPrice>
      </View>
    </View>
  );
}

/**
 * The design blurs the negotiated figure (blur 5px). RN cannot blur text, so
 * three offset ghost copies fake the spread — at 20px the eye reads "there is
 * a number here and you cannot have it yet", which is the design's point.
 */
function BlurredPrice({ children }: { children: string }) {
  return (
    <View>
      <Text style={[styles.priceValue, styles.blurGhost, { left: -2 }]}>
        {children}
      </Text>
      <Text style={[styles.priceValue, styles.blurGhost, { left: 2 }]}>
        {children}
      </Text>
      <Text style={[styles.priceValue, { opacity: 0.35 }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
  },
  headline: {
    paddingTop: 48,
    gap: 6,
    alignItems: 'center',
  },
  headlineWhite: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '300',
    letterSpacing: 0.24,
  },
  headlineIndigo: {
    color: theme.color.indigo500,
    fontSize: 24,
    fontWeight: '300',
    letterSpacing: 0.24,
  },
  stack: {
    marginTop: 24,
    width: 345,
    height: 252,
    alignItems: 'center',
    // Clears the specimen slot on tall devices; see header comment.
    transform: [{ scale: 0.92 }],
  },
  card: {
    position: 'absolute',
    height: 143,
    borderRadius: CARD_RADIUS,
    backgroundColor: '#000000',
    borderWidth: 1.3,
    borderColor: '#000000',
    boxShadow: '0px 0px 10px 0px rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    paddingTop: 15,
    gap: 9,
  },
  cardBack: { top: 0 },
  cardMid: { top: 15 },
  cardFront: { top: 29 },
  airlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  airlineLogo: {
    width: 18,
    height: 18,
  },
  airlineName: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '300',
  },
  timesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  time: {
    color: '#F1F5F9',
    fontSize: 15.5,
    fontWeight: '300',
  },
  port: {
    color: '#94A3B8',
    fontSize: 15.5,
    fontWeight: '300',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  meta: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '300',
  },
  metaDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#52525E',
  },
  priceBar: {
    position: 'absolute',
    top: 145,
    width: 296,
    height: 84,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 16,
    gap: 9,
    borderRadius: 24,
    borderWidth: 0.5,
    borderColor: '#443C7A',
    backgroundColor: 'rgba(15, 11, 43, 0.9)',
    boxShadow: '0px 0px 16px 0px #261D4C',
  },
  priceCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  priceLabel: {
    color: theme.color.indigo400,
    fontSize: 10,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  priceValue: {
    color: '#E2E8F0',
    fontSize: 20,
  },
  blurGhost: {
    position: 'absolute',
    top: 0,
    opacity: 0.18,
  },
});
