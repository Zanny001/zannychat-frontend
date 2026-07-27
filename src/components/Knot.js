import React, { useEffect } from 'react';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useReducedMotion } from '../utils/motion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const VIEW_BOX = 180;
const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC_FRACTION = 0.66; // how much of each ring is drawn — the rest is the "opening"
const VISIBLE_LENGTH = CIRCUMFERENCE * ARC_FRACTION;

// The ZannyChat mark: two open rings — one in the mood's "signal" hue,
// one in "thread" — offset so they cross in the middle. It's the two
// halves of a conversation, meeting. Used large & animated on
// Onboarding, small & static as a wordmark elsewhere.
export default function Knot({ size = 96, signalColor, threadColor, strokeWidth = 10, animated = false }) {
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animated && !reducedMotion;

  const progressA = useSharedValue(shouldAnimate ? 0 : 1);
  const progressB = useSharedValue(shouldAnimate ? 0 : 1);

  useEffect(() => {
    if (!shouldAnimate) return;
    progressA.value = withTiming(1, { duration: 850, easing: Easing.out(Easing.cubic) });
    progressB.value = withDelay(220, withTiming(1, { duration: 850, easing: Easing.out(Easing.cubic) }));
    // progressA/progressB are Reanimated shared values — stable across renders, safe to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAnimate]);

  const animatedPropsA = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE - VISIBLE_LENGTH * progressA.value,
  }));
  const animatedPropsB = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE - VISIBLE_LENGTH * progressB.value,
  }));

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VIEW_BOX} ${VIEW_BOX}`}>
      <AnimatedCircle
        cx={78}
        cy={90}
        r={RADIUS}
        stroke={signalColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={CIRCUMFERENCE}
        animatedProps={animatedPropsA}
        rotation={-35}
        origin="78, 90"
      />
      <AnimatedCircle
        cx={102}
        cy={90}
        r={RADIUS}
        stroke={threadColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={CIRCUMFERENCE}
        animatedProps={animatedPropsB}
        rotation={145}
        origin="102, 90"
      />
    </Svg>
  );
}
