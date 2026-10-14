import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOODS, DEFAULT_MOOD_KEY, resolveMoodColors, spacing, radii } from './colors';
import { typography } from './typography';

const ThemeContext = createContext(null);

const MOOD_STORAGE_KEY = 'zannychat.mood';

// The chosen mood persists via AsyncStorage (a dependency this project
// already carried for auth sessions) — the Oct 2026 audit flagged that
// a headline personalization feature reset to Ember on every launch.
// On a fresh install there's nothing stored and the default applies;
// a stored key that no longer exists in MOODS (a retired mood) falls
// back to the default rather than crashing the app.
export function ThemeProvider({ children }) {
  const [moodKey, setMoodKey] = useState(DEFAULT_MOOD_KEY);

  useEffect(() => {
    AsyncStorage.getItem(MOOD_STORAGE_KEY)
      .then((stored) => {
        if (stored && MOODS[stored]) setMoodKey(stored);
      })
      .catch(() => {});
  }, []);

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
        if (MOODS[key]) {
          setMoodKey(key);
          AsyncStorage.setItem(MOOD_STORAGE_KEY, key).catch(() => {});
        }
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
