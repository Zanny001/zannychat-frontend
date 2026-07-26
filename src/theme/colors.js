// ZannyChat — Dynamic Theme Engine
// A handful of curated palettes. Users pick one in Settings and every
// screen re-renders through ThemeContext — no per-screen color logic.

export const PALETTES = {
  nexus: {
    key: 'nexus',
    label: 'Nexus (default)',
    primary: '#6C5CE7',
    primaryDark: '#4B3FCF',
    accent: '#00D2A0',
    background: '#0F1020',
    surface: '#191A2E',
    surfaceAlt: '#232544',
    bubbleMine: '#6C5CE7',
    bubbleTheirs: '#232544',
    textPrimary: '#F4F4FB',
    textSecondary: '#9C9BC2',
    border: '#2A2C4E',
    danger: '#FF5C7A',
    online: '#00D2A0',
  },
  midnight: {
    key: 'midnight',
    label: 'Midnight',
    primary: '#3E7BFA',
    primaryDark: '#2C5FD1',
    accent: '#7DE0FF',
    background: '#05070F',
    surface: '#0E1220',
    surfaceAlt: '#161B2E',
    bubbleMine: '#3E7BFA',
    bubbleTheirs: '#161B2E',
    textPrimary: '#EAF0FF',
    textSecondary: '#8792B0',
    border: '#20263D',
    danger: '#FF6B6B',
    online: '#4CE0B3',
  },
  sunset: {
    key: 'sunset',
    label: 'Sunset',
    primary: '#FF7A59',
    primaryDark: '#E0603F',
    accent: '#FFC15E',
    background: '#1A1113',
    surface: '#241619',
    surfaceAlt: '#2F1D20',
    bubbleMine: '#FF7A59',
    bubbleTheirs: '#2F1D20',
    textPrimary: '#FBEFEA',
    textSecondary: '#C4A39A',
    border: '#3A2226',
    danger: '#FF4D4D',
    online: '#5EE6A0',
  },
  ocean: {
    key: 'ocean',
    label: 'Ocean',
    primary: '#00A8CC',
    primaryDark: '#00839F',
    accent: '#7CF5D4',
    background: '#081418',
    surface: '#0F1E22',
    surfaceAlt: '#15292E',
    bubbleMine: '#00A8CC',
    bubbleTheirs: '#15292E',
    textPrimary: '#E7FBFF',
    textSecondary: '#89AEB5',
    border: '#1C3238',
    danger: '#FF6B6B',
    online: '#7CF5D4',
  },
};

export const DEFAULT_PALETTE_KEY = 'nexus';

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const radii = { sm: 8, md: 14, lg: 20, pill: 999 };
