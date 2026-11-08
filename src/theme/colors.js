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
};

export const DEFAULT_MOOD_KEY = 'ember';

// Fixed across every mood on purpose — "online" should mean the same
// thing regardless of which mood is active.
const ONLINE = '#4ADE80';

// Maps a mood's raw palette onto the semantic tokens components use.
// Keeping both semantic names (primary/accent) AND the concept names
// (signal/thread) means most screens never have to know the theme
// changed, while ChatBubble and the mood picker can reach for the
// literal "two voices" meaning.
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
    primary: light ? '#B93825' : signal,
    primaryDark: light ? '#8F2C1D' : signal,
    accent: light ? '#087C69' : thread,
    signal,
    thread,
    gold: mood.gold,
    bubbleMine: light ? '#FFE4DC' : signal,
    bubbleMineText: light ? '#512018' : '#FFFFFF',
    bubbleMineMeta: light ? '#744238' : 'rgba(255,255,255,0.82)',
    bubbleTheirs: light ? '#E9EDF5' : mood.inkRaisedAlt,
    danger: light ? '#B4233A' : mood.danger,
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
