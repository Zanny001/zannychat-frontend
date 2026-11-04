import { normalizeSafeRetryError } from './safeRetryError.js';

/** Normalize persisted outbox data before it reaches retry or rendering code. */
export const MAX_PENDING_MESSAGES = 50;
export const MAX_PENDING_MESSAGE_TEXT_LENGTH = 10_000;

function normalizeTimestamp(value, fallback = null) {
  if (typeof value !== 'string' || value.length > 64) return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const milliseconds = Date.parse(trimmed);
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : fallback;
}

export function normalizePendingMessages(value) {
  if (!Array.isArray(value)) return [];
  // A request ID is the idempotency key for a queued send. Corrupt/older
  // storage can contain duplicates, so keep only the latest valid entry for
  // each ID before retry logic sees the queue.
  const byRequestId = new Map();
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    if (typeof item.requestId !== 'string' || !item.requestId.trim() || item.requestId.length > 128) continue;
    if (typeof item.text !== 'string' || !item.text.trim()) continue;
    const requestId = item.requestId.trim();
    const attempts = Number.isInteger(item.attempts) ? Math.max(0, Math.min(100, item.attempts)) : 0;
    // Retry ordering depends on parseable timestamps. Canonicalize valid dates;
    // malformed creation dates sort to the oldest position and malformed retry
    // dates become null so they cannot accidentally delay a message forever.
    const createdAt = normalizeTimestamp(item.createdAt, new Date(0).toISOString());
    const lastAttemptAt = normalizeTimestamp(item.lastAttemptAt, null);
    const normalized = {
      requestId,
      text: item.text.trim().slice(0, MAX_PENDING_MESSAGE_TEXT_LENGTH),
      replyToId: typeof item.replyToId === 'string' && item.replyToId.length <= 128 ? item.replyToId : null,
      createdAt: createdAt || new Date(0).toISOString(),
      attempts,
      lastAttemptAt,
      lastError: normalizeSafeRetryError(item.lastError, 'message'),
    };
    // Delete before re-inserting so the retained latest entry also takes its
    // latest position in FIFO ordering.
    byRequestId.delete(requestId);
    byRequestId.set(requestId, normalized);
  }
  // Preserve the oldest pending sends when recovering oversized legacy data.
  // Dropping the tail is safer than silently losing messages already waiting to send.
  return [...byRequestId.values()].slice(0, MAX_PENDING_MESSAGES);
}
