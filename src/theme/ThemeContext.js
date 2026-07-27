import React, { createContext, useContext, useMemo, useState } from 'react';
import { MOODS, DEFAULT_MOOD_KEY, resolveMoodColors, spacing, radii } from './colors';
import { typography } from './typography';

const ThemeContext = createContext(null);

// TODO (next iteration): persist the chosen mood with
// @react-native-async-storage/async-storage so it survives an app
// restart. Kept in-memory for now to keep the dependency list lean.
export function ThemeProvider({ children }) {
  const [moodKey, setMoodKey] = useState(DEFAULT_MOOD_KEY);

  const value = useMemo(() => {
    const mood = MOODS[moodKey] || MOODS[DEFAULT_MOOD_KEY];
    return {
      colors: resolveMoodColors(mood),
      mood,
      spacing,
      radii,
      typography,
      paletteKey: moodKey,
      palettes: Object.values(MOODS),
      setPalette: (key) => {
        if (MOODS[key]) setMoodKey(key);
      },
    };
  }, [moodKey]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
