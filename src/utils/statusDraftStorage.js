import { normalizeStatusExpiryHours, normalizeStatusText } from './statusRules.js';

export const STATUS_DRAFT_STORAGE_KEY = 'zannychat.status-draft.v1';

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

export async function readStatusDraft(storage) {
  if (!storage || typeof storage.getItem !== 'function') return null;
  try {
    const raw = await storage.getItem(STATUS_DRAFT_STORAGE_KEY);
    return raw ? normalizeStatusDraft(JSON.parse(raw)) : null;
  } catch { return null; }
}

export async function writeStatusDraft(storage, value) {
  if (!storage || typeof storage.setItem !== 'function') return false;
  const draft = normalizeStatusDraft(value);
  try {
    if (!draft) {
      if (typeof storage.removeItem === 'function') await storage.removeItem(STATUS_DRAFT_STORAGE_KEY);
      else await storage.setItem(STATUS_DRAFT_STORAGE_KEY, '');
    } else await storage.setItem(STATUS_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    return true;
  } catch { return false; }
}

export async function clearStatusDraft(storage) {
  if (!storage || typeof storage.removeItem !== 'function') return false;
  try { await storage.removeItem(STATUS_DRAFT_STORAGE_KEY); return true; } catch { return false; }
}
