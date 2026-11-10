/**
 * Return optional, user-supplied profile details only when explicitly present.
 * This helper intentionally does not infer a person's location, employer,
 * birthday, language, or other profile information.
 */
const PROFILE_FIELDS = [
  { key: 'pronouns', aliases: ['pronouns'], label: 'Pronouns', icon: 'person-outline' },
  { key: 'location', aliases: ['location', 'city', 'city_name'], label: 'Location', icon: 'location-outline' },
  { key: 'work', aliases: ['occupation', 'work', 'workplace', 'company', 'organization'], label: 'Occupation', icon: 'briefcase-outline' },
  { key: 'website', aliases: ['website', 'website_url', 'web_url'], label: 'Website', icon: 'globe-outline' },
  { key: 'birthday', aliases: ['birthday', 'birth_date'], label: 'Birthday', icon: 'gift-outline' },
  { key: 'languages', aliases: ['languages', 'language'], label: 'Languages', icon: 'chatbubbles-outline' },
];

function normalizeDisplayText(value, limit = 160) {
  if (typeof value !== 'string') return '';
  // Remove invisible control characters, normalize Unicode, and collapse
  // whitespace so profile metadata cannot inject confusing line breaks.
  return value
    .normalize('NFC')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
}

function normalizeWebsite(value) {
  const cleaned = normalizeDisplayText(value, 2048);
  if (!cleaned) return null;
  const candidate = cleaned;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(candidate) ? candidate : `https://${candidate}`;
  try {
    const url = new URL(withScheme);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

function readValue(source, aliases) {
  for (const key of aliases) {
    const value = source?.[key];
    if (typeof value === 'string') {
      const cleaned = normalizeDisplayText(value);
      if (cleaned) return cleaned;
    }
    if (Array.isArray(value)) {
      // Bound both item count and item length before joining untrusted values.
      const items = value.slice(0, 12)
        .filter((item) => typeof item === 'string')
        .map((item) => normalizeDisplayText(item, 48))
        .filter(Boolean);
      if (items.length) return normalizeDisplayText(items.join(', '), 160);
    }
  }
  return null;
}

export function getProfileDetails(participant = {}) {
  return PROFILE_FIELDS.flatMap((field) => {
    const rawValue = readValue(participant, field.aliases);
    const value = field.key === 'website' ? normalizeWebsite(rawValue) : rawValue;
    return value ? [{ key: field.key, label: field.label, icon: field.icon, value }] : [];
  });
}
