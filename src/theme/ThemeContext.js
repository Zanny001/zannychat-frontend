import React, { createContext, useContext, useMemo, useState } from 'react';
import { PALETTES, DEFAULT_PALETTE_KEY, spacing, radii } from './colors';
import { typography } from './typography';

const ThemeContext = createContext(null);

// TODO (next iteration): persist the chosen palette with
// @react-native-async-storage/async-storage so it survives an app
// restart. Kept in-memory for now to keep the dependency list lean
// for the first Snack import.
export function ThemeProvider({ children }) {
  const [paletteKey, setPaletteKey] = useState(DEFAULT_PALETTE_KEY);

  const value = useMemo(() => {
    const colors = PALETTES[paletteKey] || PALETTES[DEFAULT_PALETTE_KEY];
    return {
      colors,
      spacing,
      radii,
      typography,
      paletteKey,
      palettes: Object.values(PALETTES),
      setPalette: (key) => {
        if (PALETTES[key]) setPaletteKey(key);
      },
    };
  }, [paletteKey]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
