// User-defined ZannyChat colour accents. Keep custom palettes deliberately
// small: surfaces and semantic contrast remain controlled by the design system.
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function normalizeHexColor(value) {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  if (!HEX_COLOR.test(candidate)) return null;
  if (candidate.length === 4) {
    return '#' + candidate.slice(1).split('').map((part) => part + part).join('').toUpperCase();
  }
  return candidate.toUpperCase();
}

export function normalizeCustomPalette(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const signal = normalizeHexColor(value.signal);
  const thread = normalizeHexColor(value.thread);
  const gold = normalizeHexColor(value.gold || '#FFD58A');
  if (!signal || !thread || !gold) return null;
  return { signal, thread, gold };
}

export function createCustomMood(palette) {
  const normalized = normalizeCustomPalette(palette);
  if (!normalized) return null;
  return {
    key: 'custom',
    label: 'My colours',
    ink: '#080B18',
    inkRaised: '#11172A',
    inkRaisedAlt: '#1A2340',
    signal: normalized.signal,
    thread: normalized.thread,
    gold: normalized.gold,
    paper: '#F3F5FF',
    inkSoft: '#A6B2D2',
    line: '#293553',
    danger: '#FF6685',
  };
}
