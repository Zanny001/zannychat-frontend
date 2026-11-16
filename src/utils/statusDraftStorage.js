import { normalizeStatusExpiryHours, normalizeStatusText } from './statusRules.js';

// The legacy key had no account identity. It is intentionally discarded on
// the first authenticated read rather than migrated to an unknown account.
export const LEGACY_STATUS_DRAFT_STORAGE_KEY = 'zannychat.status-draft.v1';
export const STATUS_DRAFT_STORAGE_PREFIX = 'zannychat.status-draft.v1.';

export function getStatusDraftStorageKey(userId) {
  if (userId == null || String(userId).trim() === '') return null;
  return `${STATUS_DRAFT_STORAGE_PREFIX}${encodeURIComponent(String(userId))}`;
}

export function normalizeStatusDraft(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  let expiryHours = 24;
  try { expiryHours = normalizeStatusExpiryHours(value.expiryHours ?? 24); } catch { expiryHours = 24; }
  const audience = ['contacts', 'selected_contacts', 'only_me'].includes(value.audience) ? value.audience : 'contacts';
  const selectedAudienceIds = [...new Set((Array.isArray(value.selectedAudienceIds) ? value.selectedAudienceIds : [])
    .filter((id) => typeof id === 'string' && id.trim().length > 0 && id.length <= 200))].slice(0, 500);
  const text = normalizeStatusText(value.text);
  if (!text) return null;
  return { version: 1, text, audience, expiryHours, selectedAudienceIds };
}

export async function readStatusDraft(storage, userId) {
  const key = getStatusDraftStorageKey(userId);
  if (!storage || typeof storage.getItem !== 'function' || !key) return null;
  try {
    // Never attribute an old unscoped draft to whichever account signs in next.
    if (typeof storage.removeItem === 'function') {
      try { await storage.removeItem(LEGACY_STATUS_DRAFT_STORAGE_KEY); } catch { /* Never read or migrate the legacy key. */ }
    }
    const raw = await storage.getItem(key);
    return raw ? normalizeStatusDraft(JSON.parse(raw)) : null;
  } catch { return null; }
}

export async function writeStatusDraft(storage, userId, value) {
  const key = getStatusDraftStorageKey(userId);
  if (!storage || typeof storage.setItem !== 'function' || !key) return false;
  const draft = normalizeStatusDraft(value);
  try {
    if (!draft) {
      if (typeof storage.removeItem === 'function') await storage.removeItem(key);
      else await storage.setItem(key, '');
    } else await storage.setItem(key, JSON.stringify(draft));
    if (typeof storage.removeItem === 'function') {
      try { await storage.removeItem(LEGACY_STATUS_DRAFT_STORAGE_KEY); } catch { /* New account-scoped data is already persisted. */ }
    }
    return true;
  } catch { return false; }
}

export async function clearStatusDraft(storage, userId) {
  const key = getStatusDraftStorageKey(userId);
  if (!storage || typeof storage.removeItem !== 'function' || !key) return false;
  try {
    await storage.removeItem(key);
    await storage.removeItem(LEGACY_STATUS_DRAFT_STORAGE_KEY);
    return true;
  } catch { return false; }
}
