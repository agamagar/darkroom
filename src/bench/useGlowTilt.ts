import { DeviceMotion } from 'expo-sensors';
import { useEffect, useRef } from 'react';
import { useSharedValue, withTiming } from 'react-native-reanimated';

import { GYRO_AMPLITUDE, type Gyro } from './variations';

/**
 * Device tilt -> glow offset, in points.
 *
 * Three things this has to get right, all of which the first pass got wrong:
 *
 *  1. Never animate per sample. A `withTiming` started on every sensor tick
 *     is restarted before it finishes, so the value chases a moving target
 *     and lands well short of it — the effect reads laggy and undersized.
 *     The sensor stream is already continuous; smooth it and assign.
 *
 *  2. Never assume a neutral posture. Hard-coding "40 degrees in the hand"
 *     pins the pitch axis at its clamp for anyone holding the phone flatter
 *     or more upright, which kills vertical response entirely. The first
 *     settled reading becomes zero instead, so the effect is centred on however
 *     the device is actually being held.
 *
 *  3. Ask for permission. Motion is gated on iOS; without the grant the
 *     listener simply never fires and the setting looks broken.
 */

/** Tilt (radians) that reaches full deflection. ~26deg, comfortably in-wrist. */
const FULL_TILT = 0.45;
/** Exponential smoothing per sample at 60Hz. Lower = smoother, laggier. */
const SMOOTHING = 0.22;
/** Samples to discard while the sensor settles, before taking the neutral. */
const CALIBRATION_SAMPLES = 6;

export function useGlowTilt(level: Gyro) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  /** Filtered tilt, kept on the JS side between samples. */
  const filtered = useRef({ x: 0, y: 0 });
  const neutral = useRef<{ beta: number; gamma: number } | null>(null);
  const settling = useRef(0);

  useEffect(() => {
    const amplitude = GYRO_AMPLITUDE[level];

    if (amplitude === 0) {
      x.value = withTiming(0, { duration: 220 });
      y.value = withTiming(0, { duration: 220 });
      neutral.current = null;
      return;
    }

    let sub: { remove: () => void } | undefined;
    let cancelled = false;

    (async () => {
      // Gated on iOS; without this the listener never fires.
      const { granted } = await DeviceMotion.requestPermissionsAsync().catch(
        () => ({ granted: false }),
      );
      if (!granted || cancelled) return;
      if (!(await DeviceMotion.isAvailableAsync()) || cancelled) return;

      // Re-zero each time the level changes, so switching medium -> extreme
      // also re-centres on the current posture.
      neutral.current = null;
      settling.current = 0;
      filtered.current = { x: 0, y: 0 };

      DeviceMotion.setUpdateInterval(16); // 60Hz
      sub = DeviceMotion.addListener(({ rotation }) => {
        if (!rotation) return;
        const { beta, gamma } = rotation;
        if (typeof beta !== 'number' || typeof gamma !== 'number') return;

        if (settling.current < CALIBRATION_SAMPLES) {
          settling.current += 1;
          return;
        }
        if (!neutral.current) {
          neutral.current = { beta, gamma };
          return;
        }

        const clamp = (v: number) => Math.max(-1, Math.min(1, v));
        // Roll leans the light sideways, pitch leans it vertically. Both are
        // measured against the posture the device was actually held in.
        const targetX = clamp((gamma - neutral.current.gamma) / FULL_TILT);
        const targetY = clamp((beta - neutral.current.beta) / FULL_TILT);

        filtered.current.x += (targetX - filtered.current.x) * SMOOTHING;
        filtered.current.y += (targetY - filtered.current.y) * SMOOTHING;

        // Direct assignment: the stream is the animation.
        x.value = filtered.current.x * amplitude;
        y.value = filtered.current.y * amplitude;
      });
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [level, x, y]);

  return { x, y };
}
