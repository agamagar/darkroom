import { BlurView } from 'expo-blur';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { theme } from '../theme';

/**
 * Figma: Portfolio 2026 · Site System, node 43:7125 ("Start negotiation") —
 * the FTUE negotiation demo, measured node by node.
 *
 * Rendered as an absolute 360x780 design canvas; the bench scales the canvas
 * to the device and drops the selected specimen into the design's own button
 * slot (SPECIMEN_SLOT below), so every element sits at its measured
 * coordinate instead of being approximated with flex.
 *
 * Coordinate provenance (all from get_design_context / metadata):
 *   headline 43:9706        x24   y143  312x92, lines at +12/+49, 24px/0.24
 *   stack    43:8701        x7.6  y294  345x252
 *     back   43:8704        x50.5 y294  259x143   (absolute = 18.6 + child x)
 *     mid    43:8951        x34.0 y309  292x142
 *     front  43:9198        x18.6 y323  322.7x142.6
 *     bar    43:9445        x32.0 y439  296x84
 *   button   43:9668        x44   y563  272x68   <- the specimen slot
 *
 * Known approximations, each forced by the platform:
 *   - The negotiated price's 5px gaussian blur: RN cannot blur text, so
 *     stacked ghost copies fake the spread.
 *   - The airline mark ships at 64px in the repo because Figma asset URLs
 *     expire in 7 days.
 */

export const DESIGN_FRAME = { width: 360, height: 780 } as const;
/** Where the design places the Negotiate button — the bench fills this. */
export const SPECIMEN_SLOT = { x: 44, y: 563, width: 272, height: 68 } as const;

export function NegotiationScreen() {
  return (
    <View style={styles.canvas} pointerEvents="none">
      {/* Headline — 43:9706 */}
      <View style={styles.headline}>
        <Text style={styles.headlineLine}>Don’t just search</Text>
        <Text style={[styles.headlineLine, styles.headlineIndigo]}>
          Ask Away to Negotiate
        </Text>
      </View>

      {/* Card stack — 43:8701. Ghost cards carry full content in the file
          but only their top padding strip escapes occlusion; rendering the
          strip alone is pixel-identical and cheaper. */}
      <GhostCard left={50.5} top={294} width={259} height={143} border={1.3} />
      <GhostCard left={34} top={309} width={292} height={142} border={1.3} />
      <FrontCard />
      <PriceBar />
    </View>
  );
}

function GhostCard({
  left,
  top,
  width,
  height,
  border,
}: {
  left: number;
  top: number;
  width: number;
  height: number;
  border: number;
}) {
  return (
    <View
      style={[styles.card, { left, top, width, height, borderWidth: border }]}
    />
  );
}

/** 43:9198 — border 0.5, radius 22.105, content column pt15.5/pb39.8 gap8.8. */
function FrontCard() {
  return (
    <View style={[styles.card, styles.frontCard]}>
      <View style={styles.frontCardContent}>
        {/* Airline row — 43:9214: 17.7px mark, 6.6 gap, 11.05 Light #64748B */}
        <View style={styles.airlineRow}>
          <Image
            source={require('../assets/etihad-logo.png')}
            style={styles.airlineLogo}
          />
          <Text style={styles.airlineName}>Etihad Airways</Text>
        </View>

        {/* Times row — Component 1489: cells padded 2.21, route line 61.9 wide */}
        <View style={styles.timesRow}>
          <Text style={[styles.time, styles.cell]}>06:50</Text>
          <Text style={[styles.port, styles.cell]}>DEL</Text>
          <View style={styles.routeLineBox}>
            <RouteLine />
          </View>
          <Text style={[styles.time, styles.cell]}>22:25</Text>
          <Text style={[styles.port, styles.cell]}>DXB</Text>
        </View>

        {/* Meta row — 43:9439: gap 2.21, px 4.42, dash glyph 9.9x8.8 */}
        <View style={styles.metaRow}>
          <Text style={styles.meta}>50h 35m</Text>
          <Svg width={9.95} height={8.84} viewBox="0 0 9.94737 8.8421">
            <Line
              x1={4.42}
              y1={4.42}
              x2={5.53}
              y2={4.42}
              stroke="#52525E"
              strokeWidth={1.105}
              strokeLinecap="round"
            />
          </Svg>
          <Text style={styles.meta}>2 stops</Text>
        </View>
      </View>
    </View>
  );
}

/** Exported asset is a single 1.105pt stroke, #52525E, x 4.42 -> 48.63. */
function RouteLine() {
  return (
    <Svg width={53.05} height={8.84} viewBox="0 0 53.0526 8.8421">
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

/**
 * 43:9445 — glass bar: bg rgba(15,11,43,0.04) over a 5.17px backdrop blur,
 * border 0.5 #443C7A, radius 24, glow 0 0 16 #261D4C. Left column flexes,
 * right column is a fixed 132, 16px chevron between, 8.84 gap, padded
 * 20/16/16.
 */
function PriceBar() {
  return (
    <View style={styles.priceBarShadow}>
      <BlurView intensity={12} tint="dark" style={styles.priceBar}>
        <View style={styles.priceBarFill} />
        <View style={styles.priceColLeft}>
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
        <View style={styles.priceColRight}>
          <Text style={styles.priceLabel}>NEGOTIATED PRICE</Text>
          <BlurredPrice>₹15,529</BlurredPrice>
        </View>
      </BlurView>
    </View>
  );
}

/**
 * Ghost-copy stand-in for the design's 5px text blur: four offset copies
 * spread the glyph edges, a dim core keeps the mass. Reads as "a number you
 * cannot have yet", which is the design's point.
 */
function BlurredPrice({ children }: { children: string }) {
  const offsets: [number, number][] = [
    [-3, 0],
    [3, 0],
    [-1.5, 1],
    [1.5, -1],
  ];
  return (
    <View>
      {offsets.map(([dx, dy]) => (
        <Text
          key={`${dx},${dy}`}
          style={[
            styles.priceValue,
            styles.blurGhost,
            { transform: [{ translateX: dx }, { translateY: dy }] },
          ]}>
          {children}
        </Text>
      ))}
      <Text style={[styles.priceValue, { opacity: 0.4 }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    width: DESIGN_FRAME.width,
    height: DESIGN_FRAME.height,
    // The design's screen is pure black, unlike the bench's navy void.
    backgroundColor: '#000000',
  },
  headline: {
    position: 'absolute',
    left: 24,
    top: 143,
    width: 312,
    paddingVertical: 12,
    gap: 6,
    alignItems: 'center',
  },
  headlineLine: {
    color: '#FFFFFF',
    fontFamily: theme.font.headlineLight,
    fontSize: 24,
    letterSpacing: 0.24,
    lineHeight: 31,
  },
  headlineIndigo: {
    color: theme.color.indigo500,
  },
  card: {
    position: 'absolute',
    borderRadius: 22.105,
    backgroundColor: '#000000',
    borderColor: '#000000',
    boxShadow: '0px 0px 10px 0px rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  frontCard: {
    left: 18.6,
    top: 323,
    width: 322.7,
    height: 142.6,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frontCardContent: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 15.47,
    paddingBottom: 39.79,
    paddingHorizontal: 15.47,
    gap: 8.84,
  },
  airlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6.63,
    width: '100%',
  },
  airlineLogo: {
    width: 17.68,
    height: 17.68,
  },
  airlineName: {
    color: '#64748B',
    fontFamily: theme.font.flexLight,
    fontSize: 11.05,
  },
  timesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  cell: {
    padding: 2.21,
  },
  time: {
    color: '#F1F5F9',
    fontFamily: theme.font.flexLight,
    fontSize: 15.47,
    lineHeight: 17.68,
  },
  port: {
    color: '#94A3B8',
    fontFamily: theme.font.flexLight,
    fontSize: 15.47,
  },
  routeLineBox: {
    width: 61.9,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4.42,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2.21,
    paddingHorizontal: 4.42,
  },
  meta: {
    color: '#64748B',
    fontFamily: theme.font.flexLight,
    fontSize: 11.05,
  },
  // Shadow lives on a wrapper because the BlurView must clip to its radius.
  priceBarShadow: {
    position: 'absolute',
    left: 32,
    top: 439,
    width: 296,
    height: 84,
    borderRadius: 24,
    boxShadow: '0px 0px 16px 0px #261D4C',
  },
  priceBar: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 16,
    paddingVertical: 16,
    gap: 8.84,
    borderRadius: 24,
    borderWidth: 0.5,
    borderColor: '#443C7A',
    overflow: 'hidden',
  },
  priceBarFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 11, 43, 0.04)',
  },
  priceColLeft: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  priceColRight: {
    width: 132,
    alignItems: 'center',
    gap: 6,
  },
  priceLabel: {
    color: theme.color.indigo400,
    fontFamily: theme.font.flexLight,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  priceValue: {
    color: '#E2E8F0',
    fontFamily: theme.font.flexRegular,
    fontSize: 20,
  },
  blurGhost: {
    position: 'absolute',
    opacity: 0.15,
  },
});
