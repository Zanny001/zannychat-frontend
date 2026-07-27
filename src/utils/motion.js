import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// The app has exactly one deliberate animation — the Knot mark drawing
// itself in on the onboarding screen. This is what lets that respect
// a person's OS-level "reduce motion" setting instead of ignoring it.
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((value) => mounted && setReduced(Boolean(value)))
      .catch(() => {});

    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (value) =>
      setReduced(Boolean(value))
    );

    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  return reduced;
}
