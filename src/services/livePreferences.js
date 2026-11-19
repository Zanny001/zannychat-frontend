import { backendFetch, BACKEND_ENABLED } from './backendClient';

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
    ...(typeof source.updatedAt === 'string' ? { updatedAt: source.updatedAt } : {}),
  };
}

function assertAccount(userId) {
  if (!String(userId || '').trim()) throw new Error('Sign in to manage LIVE preferences.');
  if (!BACKEND_ENABLED) throw new Error('LIVE settings require a connection to the ZannyChat service.');
}

export async function loadLivePreferences(userId) {
  assertAccount(userId);
  const response = await backendFetch('/live/creators/me/preferences');
  return normalizeLivePreferences(response?.preferences);
}

export async function saveLivePreferences(userId, preferences) {
  assertAccount(userId);
  const normalized = normalizeLivePreferences(preferences);
  const response = await backendFetch('/live/creators/me/preferences', {
    method: 'PUT',
    body: JSON.stringify(normalized),
  });
  return normalizeLivePreferences(response?.preferences);
}
