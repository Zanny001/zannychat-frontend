import AsyncStorage from '@react-native-async-storage/async-storage';

export const LIVE_PREFERENCE_CATEGORIES = [
  'entertainment', 'social', 'politics', 'science', 'education', 'finance',
  'technology', 'sports', 'business', 'health', 'other',
];

export const DEFAULT_LIVE_PREFERENCES = Object.freeze({
  experienceMode: 'broadcast',
  visibility: 'public',
  category: 'social',
  allowGuests: false,
});

const STORAGE_PREFIX = 'zannychat:live-creator-preferences:v1:';

export function normalizeLivePreferences(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    experienceMode: ['broadcast', 'video_chat', 'audio_room'].includes(source.experienceMode)
      ? source.experienceMode : DEFAULT_LIVE_PREFERENCES.experienceMode,
    visibility: ['public', 'followers', 'private'].includes(source.visibility)
      ? source.visibility : DEFAULT_LIVE_PREFERENCES.visibility,
    category: LIVE_PREFERENCE_CATEGORIES.includes(source.category)
      ? source.category : DEFAULT_LIVE_PREFERENCES.category,
    allowGuests: typeof source.allowGuests === 'boolean'
      ? source.allowGuests : DEFAULT_LIVE_PREFERENCES.allowGuests,
  };
}

function storageKey(userId) {
  const id = String(userId || '').trim();
  if (!id) throw new Error('Sign in to manage LIVE preferences.');
  return STORAGE_PREFIX + id;
}

export async function loadLivePreferences(userId) {
  const raw = await AsyncStorage.getItem(storageKey(userId));
  if (!raw) return { ...DEFAULT_LIVE_PREFERENCES };
  try {
    return normalizeLivePreferences(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_LIVE_PREFERENCES };
  }
}

export async function saveLivePreferences(userId, preferences) {
  const normalized = normalizeLivePreferences(preferences);
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(normalized));
  return normalized;
}
