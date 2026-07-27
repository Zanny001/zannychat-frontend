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
export function resolveMoodColors(mood) {
  return {
    background: mood.ink,
    surface: mood.inkRaised,
    surfaceAlt: mood.inkRaisedAlt,
    primary: mood.signal,
    primaryDark: mood.signal,
    accent: mood.thread,
    signal: mood.signal,
    thread: mood.thread,
    gold: mood.gold,
    bubbleMine: mood.signal,
    bubbleTheirs: mood.inkRaisedAlt,
    textPrimary: mood.paper,
    textSecondary: mood.inkSoft,
    border: mood.line,
    danger: mood.danger,
    online: ONLINE,
  };
}

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const radii = { sm: 8, md: 14, lg: 20, pill: 999 };
