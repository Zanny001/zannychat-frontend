import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOODS, DEFAULT_MOOD_KEY, resolveMoodColors, spacing, radii, layout, elevation } from './colors';
import { typography as baseTypography } from './typography';
import { createCustomMood, normalizeCustomPalette } from './customPalette';

const ThemeContext = createContext(null);
const MOOD_STORAGE_KEY = 'zannychat.mood';
const APPEARANCE_STORAGE_KEY = 'zannychat.appearance';
const ACCESSIBILITY_STORAGE_KEY = 'zannychat.accessibility';
const CUSTOM_PALETTE_STORAGE_KEY = 'zannychat.customPalette';
const TEXT_SCALES = { standard: 1, large: 1.12, extraLarge: 1.25 };

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [moodKey, setMoodKey] = useState(DEFAULT_MOOD_KEY);
  const [customPalette, setCustomPaletteState] = useState(null);
  const [appearance, setAppearance] = useState('system');
  const [textScale, setTextScale] = useState('standard');
  const [highContrast, setHighContrast] = useState(false);
  const [persistenceError, setPersistenceError] = useState('');
  const preferenceRevisionRef = useRef({ mood: 0, customPalette: 0, appearance: 0, accessibility: 0 });
  const persistenceAttemptRef = useRef({ mood: 0, customPalette: 0, appearance: 0, accessibility: 0 });
  const failedPreferencesRef = useRef(new Set());

  useEffect(() => {
    let active = true;
    const revisionAtStart = { ...preferenceRevisionRef.current };
    AsyncStorage.multiGet([MOOD_STORAGE_KEY, APPEARANCE_STORAGE_KEY, ACCESSIBILITY_STORAGE_KEY, CUSTOM_PALETTE_STORAGE_KEY])
      .then((entries) => {
        if (!active) return;
        const saved = Object.fromEntries(entries);
        let parsedPalette = null;
        if (saved[CUSTOM_PALETTE_STORAGE_KEY] && revisionAtStart.customPalette === preferenceRevisionRef.current.customPalette) {
          try {
            parsedPalette = normalizeCustomPalette(JSON.parse(saved[CUSTOM_PALETTE_STORAGE_KEY]));
            if (parsedPalette) setCustomPaletteState(parsedPalette);
          } catch (_) {}
        }
        if (revisionAtStart.mood === preferenceRevisionRef.current.mood) {
          if (saved[MOOD_STORAGE_KEY] === 'custom' && (parsedPalette || customPalette)) setMoodKey('custom');
          else if (saved[MOOD_STORAGE_KEY] && MOODS[saved[MOOD_STORAGE_KEY]]) setMoodKey(saved[MOOD_STORAGE_KEY]);
        }
        if (revisionAtStart.appearance === preferenceRevisionRef.current.appearance
          && ['system', 'light', 'dark'].includes(saved[APPEARANCE_STORAGE_KEY])) setAppearance(saved[APPEARANCE_STORAGE_KEY]);
        if (revisionAtStart.accessibility === preferenceRevisionRef.current.accessibility && saved[ACCESSIBILITY_STORAGE_KEY]) {
          try {
            const prefs = JSON.parse(saved[ACCESSIBILITY_STORAGE_KEY]);
            if (Object.prototype.hasOwnProperty.call(TEXT_SCALES, prefs.textScale)) setTextScale(prefs.textScale);
            if (typeof prefs.highContrast === 'boolean') setHighContrast(prefs.highContrast);
          } catch (_) {}
        }
      })
      .catch(() => {
        if (active) {
          failedPreferencesRef.current.add('load');
          setPersistenceError('Saved appearance preferences could not be loaded from this device. Current session defaults remain active.');
        }
      });
    return () => { active = false; };
  }, []);

  const value = useMemo(() => {
    const mood = (moodKey === 'custom' && customPalette ? createCustomMood(customPalette) : null)
      || MOODS[moodKey] || MOODS[DEFAULT_MOOD_KEY];
    const resolvedMode = appearance === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : appearance;
    const scale = TEXT_SCALES[textScale] || 1;
    const typography = Object.fromEntries(Object.entries(baseTypography).map(([key, style]) => [key, {
      ...style,
      fontSize: Math.round(style.fontSize * scale * 10) / 10,
      ...(style.lineHeight ? { lineHeight: Math.round(style.lineHeight * scale) } : {}),
    }]));
    const persist = async (write, key) => {
      const attempt = ++persistenceAttemptRef.current[key];
      try {
        await write();
        if (attempt === persistenceAttemptRef.current[key]) {
          failedPreferencesRef.current.delete(key);
          if (failedPreferencesRef.current.size === 0) setPersistenceError('');
        }
        return true;
      } catch (_) {
        if (attempt === persistenceAttemptRef.current[key]) {
          failedPreferencesRef.current.add(key);
          setPersistenceError('Your preferences are active for this session, but could not be saved on this device. Check device storage and try again.');
        }
        return false;
      }
    };
    const persistAccessibility = (next) => persist(() => AsyncStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(next)), 'accessibility');
    return {
      colors: resolveMoodColors(mood, resolvedMode, highContrast),
      mood,
      spacing,
      radii,
      layout,
      elevation,
      typography,
      paletteKey: moodKey,
      palettes: [...Object.values(MOODS), ...(customPalette ? [createCustomMood(customPalette)] : [])],
      customPalette,
      appearance,
      resolvedMode,
      textScale,
      highContrast,
      persistenceError,
      clearPersistenceError: () => {
        failedPreferencesRef.current.clear();
        setPersistenceError('');
      },
      setAppearance: (mode) => {
        if (['system', 'light', 'dark'].includes(mode)) {
          preferenceRevisionRef.current.appearance += 1;
          setAppearance(mode);
          void persist(() => AsyncStorage.setItem(APPEARANCE_STORAGE_KEY, mode), 'appearance');
        }
      },
      setTextScale: (scaleKey) => {
        if (Object.prototype.hasOwnProperty.call(TEXT_SCALES, scaleKey)) {
          preferenceRevisionRef.current.accessibility += 1;
          setTextScale(scaleKey);
          void persistAccessibility({ textScale: scaleKey, highContrast });
        }
      },
      setHighContrast: (enabled) => {
        preferenceRevisionRef.current.accessibility += 1;
        setHighContrast(Boolean(enabled));
        void persistAccessibility({ textScale, highContrast: Boolean(enabled) });
      },
      setPalette: (key) => {
        if (MOODS[key] || (key === 'custom' && customPalette)) {
          preferenceRevisionRef.current.mood += 1;
          setMoodKey(key);
          void persist(() => AsyncStorage.setItem(MOOD_STORAGE_KEY, key), 'mood');
        }
      },
      setCustomPalette: (nextPalette) => {
        const normalized = normalizeCustomPalette(nextPalette);
        if (!normalized) return false;
        preferenceRevisionRef.current.customPalette += 1;
        preferenceRevisionRef.current.mood += 1;
        setCustomPaletteState(normalized);
        setMoodKey('custom');
        void persist(() => AsyncStorage.multiSet([
          [CUSTOM_PALETTE_STORAGE_KEY, JSON.stringify(normalized)],
          [MOOD_STORAGE_KEY, 'custom'],
        ]), 'customPalette');
        return true;
      },
    };
  }, [moodKey, customPalette, appearance, systemScheme, textScale, highContrast, persistenceError]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
