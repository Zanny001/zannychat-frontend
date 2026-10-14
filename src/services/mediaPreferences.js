import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_MEDIA_PREFERENCES, normalizeMediaPreferences } from '../utils/mediaQuality';

const STORAGE_KEY = 'zannychat.mediaPreferences';
let cache = { ...DEFAULT_MEDIA_PREFERENCES };

export async function loadMediaPreferences() {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    cache = normalizeMediaPreferences(stored ? JSON.parse(stored) : DEFAULT_MEDIA_PREFERENCES);
  } catch (_) {
    cache = { ...DEFAULT_MEDIA_PREFERENCES };
  }
  return { ...cache };
}

export function getMediaPreferences() {
  return { ...cache };
}

export async function updateMediaPreferences(patch) {
  cache = normalizeMediaPreferences({ ...cache, ...(patch || {}) });
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (_) {
    // Keep the current in-memory preference; the UI can still operate this session.
  }
  return { ...cache };
}
