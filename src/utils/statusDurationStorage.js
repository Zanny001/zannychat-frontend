import { DEFAULT_STATUS_DURATIONS, getStatusDurationMs } from './statusNavigation.js';

export const LEGACY_STATUS_DURATION_STORAGE_KEY = 'zannychat.status-duration-preferences.v1';
export const STATUS_DURATION_STORAGE_PREFIX = 'zannychat.status-duration-preferences.v1.';

export function getStatusDurationStorageKey(userId) {
  if (userId == null || String(userId).trim() === '') return null;
  return `${STATUS_DURATION_STORAGE_PREFIX}${encodeURIComponent(String(userId))}`;
}

export function normalizeStatusDurationPreferences(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    text: getStatusDurationMs({ media_kind: 'text' }, source),
    image: getStatusDurationMs({ media_kind: 'image' }, source),
    video: getStatusDurationMs({ media_kind: 'video' }, source),
  };
}

export async function readStatusDurationPreferences(storage, userId) {
  const key = getStatusDurationStorageKey(userId);
  if (!storage || typeof storage.getItem !== 'function' || !key) return { ...DEFAULT_STATUS_DURATIONS };
  try {
    // Discard the old global preference record instead of sharing it between accounts.
    if (typeof storage.removeItem === 'function') {
      try { await storage.removeItem(LEGACY_STATUS_DURATION_STORAGE_KEY); } catch { /* Ignore legacy cleanup failure. */ }
    }
    const raw = await storage.getItem(key);
    return raw ? normalizeStatusDurationPreferences(JSON.parse(raw)) : { ...DEFAULT_STATUS_DURATIONS };
  } catch {
    return { ...DEFAULT_STATUS_DURATIONS };
  }
}

export async function writeStatusDurationPreferences(storage, userId, value) {
  const key = getStatusDurationStorageKey(userId);
  if (!storage || typeof storage.setItem !== 'function' || !key) return false;
  try {
    await storage.setItem(key, JSON.stringify(normalizeStatusDurationPreferences(value)));
    if (typeof storage.removeItem === 'function') {
      try { await storage.removeItem(LEGACY_STATUS_DURATION_STORAGE_KEY); } catch { /* New account-scoped data is already persisted. */ }
    }
    return true;
  } catch {
    return false;
  }
}
