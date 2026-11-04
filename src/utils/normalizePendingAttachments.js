import { normalizeSafeRetryError } from './safeRetryError.js';

/** Normalize persisted attachment outbox records before retry or rendering. */
export const MAX_PENDING_ATTACHMENTS = 20;
export const MAX_ATTACHMENT_URI_LENGTH = 4096;
export const MAX_ATTACHMENT_NAME_LENGTH = 255;
export const MAX_ATTACHMENT_CAPTION_LENGTH = 10_000;
const SUPPORTED_KINDS = new Set(['image', 'video', 'file', 'voice']);
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;

function normalizeTimestamp(value, fallback = null) {
  if (typeof value !== 'string' || value.length > 64) return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const milliseconds = Date.parse(trimmed);
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : fallback;
}

function boundedString(value, maxLength) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized || CONTROL_CHARACTERS.test(normalized)) return null;
  return normalized.slice(0, maxLength);
}

export function normalizePendingAttachments(value) {
  if (!Array.isArray(value)) return [];
  const byId = new Map();
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    if (typeof item.id !== 'string' || !item.id.trim() || item.id.length > 128 || CONTROL_CHARACTERS.test(item.id)) continue;
    if (typeof item.uri !== 'string' || !item.uri.trim() || item.uri.length > MAX_ATTACHMENT_URI_LENGTH || CONTROL_CHARACTERS.test(item.uri)) continue;
    if (!SUPPORTED_KINDS.has(item.kind)) continue;
    const id = item.id.trim();
    const name = boundedString(item.name, MAX_ATTACHMENT_NAME_LENGTH);
    const mimeType = boundedString(item.mimeType, 128);
    const size = Number.isSafeInteger(item.size) && item.size >= 0 ? item.size : null;
    const durationSeconds = Number.isFinite(item.durationSeconds) && item.durationSeconds >= 0 && item.durationSeconds <= 86_400
      ? Math.round(item.durationSeconds)
      : null;
    const caption = typeof item.caption === 'string' ? item.caption.slice(0, MAX_ATTACHMENT_CAPTION_LENGTH) : '';
    const attempts = Number.isInteger(item.attempts) ? Math.max(0, Math.min(100, item.attempts)) : 0;
    // Explicit allowlist prevents arbitrary fields from persisted JSON being
    // retained or reintroduced into UI and retry operations.
    const normalized = {
      id,
      uri: item.uri.trim(),
      kind: item.kind,
      ...(name ? { name } : {}),
      ...(mimeType ? { mimeType } : {}),
      ...(size !== null ? { size } : {}),
      ...(durationSeconds !== null ? { durationSeconds } : {}),
      caption,
      createdAt: normalizeTimestamp(item.createdAt, new Date(0).toISOString()),
      attempts,
      lastAttemptAt: normalizeTimestamp(item.lastAttemptAt, null),
      nextRetryAt: normalizeTimestamp(item.nextRetryAt, null),
      lastError: normalizeSafeRetryError(typeof item.lastError === 'string' ? item.lastError.replace(CONTROL_CHARACTERS, '') : null, 'attachment'),
    };
    // Keep the latest valid entry for an ID and preserve its latest FIFO position.
    byId.delete(id);
    byId.set(id, normalized);
  }
  return [...byId.values()].slice(-MAX_PENDING_ATTACHMENTS);
}
