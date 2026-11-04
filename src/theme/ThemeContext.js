import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOODS, DEFAULT_MOOD_KEY, resolveMoodColors, spacing, radii, layout, elevation } from './colors';
import { typography as baseTypography } from './typography';

const ThemeContext = createContext(null);
const MOOD_STORAGE_KEY = 'zannychat.mood';
const APPEARANCE_STORAGE_KEY = 'zannychat.appearance';
const ACCESSIBILITY_STORAGE_KEY = 'zannychat.accessibility';
const TEXT_SCALES = { standard: 1, large: 1.12, extraLarge: 1.25 };

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [moodKey, setMoodKey] = useState(DEFAULT_MOOD_KEY);
  const [appearance, setAppearance] = useState('system');
  const [textScale, setTextScale] = useState('standard');
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet([MOOD_STORAGE_KEY, APPEARANCE_STORAGE_KEY, ACCESSIBILITY_STORAGE_KEY])
      .then((entries) => {
        const saved = Object.fromEntries(entries);
        if (saved[MOOD_STORAGE_KEY] && MOODS[saved[MOOD_STORAGE_KEY]]) setMoodKey(saved[MOOD_STORAGE_KEY]);
        if (['system', 'light', 'dark'].includes(saved[APPEARANCE_STORAGE_KEY])) setAppearance(saved[APPEARANCE_STORAGE_KEY]);
        if (saved[ACCESSIBILITY_STORAGE_KEY]) {
          try {
            const prefs = JSON.parse(saved[ACCESSIBILITY_STORAGE_KEY]);
            if (Object.prototype.hasOwnProperty.call(TEXT_SCALES, prefs.textScale)) setTextScale(prefs.textScale);
            if (typeof prefs.highContrast === 'boolean') setHighContrast(prefs.highContrast);
          } catch (_) {}
        }
      })
      .catch(() => {});
  }, []);

  const value = useMemo(() => {
    const mood = MOODS[moodKey] || MOODS[DEFAULT_MOOD_KEY];
    const resolvedMode = appearance === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : appearance;
    const scale = TEXT_SCALES[textScale] || 1;
    const typography = Object.fromEntries(Object.entries(baseTypography).map(([key, style]) => [key, {
      ...style,
      fontSize: Math.round(style.fontSize * scale * 10) / 10,
      ...(style.lineHeight ? { lineHeight: Math.round(style.lineHeight * scale) } : {}),
    }]));
    const persistAccessibility = (next) => AsyncStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
    return {
      colors: resolveMoodColors(mood, resolvedMode, highContrast),
      mood,
      spacing,
      radii,
      layout,
      elevation,
      typography,
      paletteKey: moodKey,
      palettes: Object.values(MOODS),
      appearance,
      resolvedMode,
      textScale,
      highContrast,
      setAppearance: (mode) => {
        if (['system', 'light', 'dark'].includes(mode)) {
          setAppearance(mode);
          AsyncStorage.setItem(APPEARANCE_STORAGE_KEY, mode).catch(() => {});
        }
      },
      setTextScale: (scaleKey) => {
        if (Object.prototype.hasOwnProperty.call(TEXT_SCALES, scaleKey)) {
          setTextScale(scaleKey);
          persistAccessibility({ textScale: scaleKey, highContrast });
        }
      },
      setHighContrast: (enabled) => {
        setHighContrast(Boolean(enabled));
        persistAccessibility({ textScale, highContrast: Boolean(enabled) });
      },
      setPalette: (key) => {
        if (MOODS[key]) {
          setMoodKey(key);
          AsyncStorage.setItem(MOOD_STORAGE_KEY, key).catch(() => {});
        }
      },
    };
  }, [moodKey, appearance, systemScheme, textScale, highContrast]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
