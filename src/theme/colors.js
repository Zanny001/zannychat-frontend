// ZannyChat — "Signal & Thread" design system
//
// The idea a conversation is two voices meeting is carried literally
// into color: every mood defines a warm SIGNAL hue (always "my"
// messages, always the primary action color) and a cool THREAD hue
// (always "their" voice, used as an accent rather than a full fill —
// see ChatBubble). Switching moods changes the whole feeling of the
// app without ever breaking that warm-is-mine / cool-is-theirs logic.

export const MOODS = {
  ember: {
    key: 'ember',
    label: 'Ember',
    ink: '#15111C',
    inkRaised: '#1F1A29',
    inkRaisedAlt: '#282232',
    signal: '#FF6A4D',
    thread: '#2FC1A8',
    gold: '#F3B94D',
    paper: '#F3EEE7',
    inkSoft: '#9C93AE',
    line: '#2C2740',
    danger: '#FF5C7A',
  },
  tide: {
    key: 'tide',
    label: 'Tide',
    ink: '#0B1720',
    inkRaised: '#11202B',
    inkRaisedAlt: '#182B38',
    signal: '#FF8F5E',
    thread: '#2FA9D6',
    gold: '#E8C468',
    paper: '#EAF3F5',
    inkSoft: '#7C97A3',
    line: '#1C3140',
    danger: '#FF6B6B',
  },
  aurora: {
    key: 'aurora',
    label: 'Aurora',
    ink: '#130E1F',
    inkRaised: '#1C1530',
    inkRaisedAlt: '#251D40',
    signal: '#FF7A9C',
    thread: '#5FE3A8',
    gold: '#F6C15E',
    paper: '#F2EEF9',
    inkSoft: '#9D93B8',
    line: '#2E2650',
    danger: '#FF5C7A',
  },
  dawn: {
    key: 'dawn',
    label: 'Dawn',
    ink: '#1C1512',
    inkRaised: '#271C18',
    inkRaisedAlt: '#312420',
    signal: '#FF8A5B',
    thread: '#4FBFA8',
    gold: '#F4C05C',
    paper: '#F7EFE6',
    inkSoft: '#B39C8E',
    line: '#3A2C24',
    danger: '#FF6157',
  },
  royalNeon: {
    key: 'royalNeon', label: 'Royal Neon', ink: '#080B18', inkRaised: '#11172A',
    inkRaisedAlt: '#1A2340', signal: '#7C60FF', thread: '#39E7E0', gold: '#FFD58A',
    paper: '#F4F2FF', inkSoft: '#A9A5D0', line: '#302B59', danger: '#FF6685',
  },
  ocean: {
    key: 'ocean', label: 'Ocean', ink: '#061722', inkRaised: '#0D2432',
    inkRaisedAlt: '#153447', signal: '#258BFF', thread: '#43E2D2', gold: '#FFD27D',
    paper: '#ECF8FF', inkSoft: '#91B6C7', line: '#24465A', danger: '#FF7188',
  },
  emerald: {
    key: 'emerald', label: 'Emerald', ink: '#071A16', inkRaised: '#102923',
    inkRaisedAlt: '#183A30', signal: '#35C98A', thread: '#70D9E8', gold: '#E9CF79',
    paper: '#F0FFF8', inkSoft: '#9BC5B3', line: '#285144', danger: '#FF7188',
  },
  roseGold: {
    key: 'roseGold', label: 'Rose Gold', ink: '#1B101A', inkRaised: '#2A1A29',
    inkRaisedAlt: '#3B2638', signal: '#F07FAE', thread: '#D8A6FF', gold: '#FFD59A',
    paper: '#FFF2F7', inkSoft: '#C7A5B8', line: '#55364D', danger: '#FF6685',
  },
  sunset: {
    key: 'sunset', label: 'Sunset', ink: '#1B101B', inkRaised: '#2A1A2C',
    inkRaisedAlt: '#3B2440', signal: '#FF7A59', thread: '#A77BFF', gold: '#FFD27D',
    paper: '#FFF3EC', inkSoft: '#C5A7B8', line: '#55364D', danger: '#FF6685',
  },
};

export const DEFAULT_MOOD_KEY = 'royalNeon';

// Fixed across every mood on purpose — "online" should mean the same
// thing regardless of which mood is active.
const ONLINE = '#4ADE80';

// Maps a mood's raw palette onto the semantic tokens components use.
// Keeping both semantic names (primary/accent) AND the concept names
// (signal/thread) means most screens never have to know the theme
// changed, while ChatBubble and the mood picker can reach for the
// literal "two voices" meaning.

function parseHex(hex) {
  const clean = String(hex || '').replace('#', '');
  const expanded = clean.length === 3 ? clean.split('').map((part) => part + part).join('') : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return [0, 0, 0];
  return [0, 2, 4].map((offset) => parseInt(expanded.slice(offset, offset + 2), 16));
}

function relativeLuminance(hex) {
  const channels = parseHex(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first, second) {
  const values = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function accessibleForeground(background) {
  const blackContrast = contrastRatio('#080B18', background);
  const whiteContrast = contrastRatio('#FFFFFF', background);
  return blackContrast >= whiteContrast ? '#080B18' : '#FFFFFF';
}

function accessibleAccent(hex, background, minimum = 4.5) {
  const original = parseHex(hex);
  for (let step = 0; step <= 100; step += 2) {
    const factor = 1 - step / 100;
    const candidate = '#' + original.map((value) => Math.round(value * factor).toString(16).padStart(2, '0')).join('').toUpperCase();
    if (contrastRatio(candidate, background) >= minimum) return candidate;
  }
  return '#171925';
}

function tint(hex, amount = 0.84) {
  const foreground = parseHex(hex);
  const white = [255, 255, 255];
  return '#' + foreground.map((value, index) => Math.round(value * (1 - amount) + white[index] * amount).toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function resolveMoodColors(mood, mode = 'dark', highContrast = false) {
  const light = mode === 'light';
  const base = light ? {
    background: '#F7F8FC',
    surface: '#FFFFFF',
    surfaceAlt: '#EEF1F7',
    textPrimary: '#171925',
    textSecondary: highContrast ? '#414658' : '#62697A',
    border: highContrast ? '#9AA2B4' : '#DDE2EC',
    borderSubtle: highContrast ? '#B1B8C6' : '#E8EBF2',
    surfaceElevated: '#FFFFFF',
    surfaceGlass: '#FFFFFF',
    overlay: '#000000',
    scrim: '#000000',
    shadow: '#1B2030',
  } : {
    background: mood.ink,
    surface: mood.inkRaised,
    surfaceAlt: mood.inkRaisedAlt,
    textPrimary: mood.paper,
    textSecondary: highContrast ? '#D2CCDE' : mood.inkSoft,
    border: highContrast ? '#716A82' : mood.line,
    borderSubtle: highContrast ? '#5A536B' : mood.line,
    surfaceElevated: mood.inkRaisedAlt,
    surfaceGlass: mood.inkRaised,
    overlay: '#FFFFFF',
    scrim: '#000000',
    shadow: '#000000',
  };
  const signal = mood.signal;
  const thread = mood.thread;
  return {
    ...base,
    primary: light ? accessibleAccent(signal, '#FFFFFF', 4.5) : signal,
    primaryDark: light ? accessibleAccent(signal, '#FFFFFF', 5) : signal,
    onPrimary: light ? '#FFFFFF' : contrastRatio(mood.ink, signal) >= 4.5 ? mood.ink : accessibleForeground(signal),
    accent: light ? accessibleAccent(thread, '#FFFFFF', 4.5) : thread,
    onAccent: light ? '#FFFFFF' : accessibleForeground(thread),
    signal,
    thread,
    gold: mood.gold,
    bubbleMine: light ? tint(signal, 0.84) : signal,
    // Bright signal surfaces need dark foregrounds; use the mood's ink in
    // dark mode and a high-contrast neutral on tinted light-mode bubbles.
    bubbleMineText: light ? '#171925' : contrastRatio(mood.ink, signal) >= 4.5 ? mood.ink : accessibleForeground(signal),
    bubbleMineMeta: light ? '#414658' : contrastRatio(mood.inkRaised, signal) >= 4.5 ? mood.inkRaised : accessibleForeground(signal),
    bubbleTheirs: light ? '#E9EDF5' : mood.inkRaisedAlt,
    danger: light ? '#B4233A' : mood.danger,
    onDanger: accessibleForeground(light ? '#B4233A' : mood.danger),
    online: ONLINE,
    success: light ? '#16794B' : ONLINE,
    warning: light ? '#8A5A00' : mood.gold,
    focusRing: light ? '#2458D3' : thread,
  };
}

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 40 };

export const radii = { xs: 6, sm: 8, md: 14, lg: 20, xl: 28, pill: 999 };

// Shared interaction/layout tokens keep screens coherent as the app grows.
// 44pt is the minimum comfortable touch target for mobile controls.
export const layout = {
  touchTarget: 44,
  controlHeight: 48,
  headerHeight: 60,
  contentMaxWidth: 760,
  screenGutter: 16,
  sectionGap: 24,
};

export const elevation = {
  card: { shadowOpacity: 0.18, shadowRadius: 14, shadowOffsetY: 6, android: 3 },
  raised: { shadowOpacity: 0.24, shadowRadius: 20, shadowOffsetY: 9, android: 5 },
};
