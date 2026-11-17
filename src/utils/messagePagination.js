const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIMESTAMPTZ_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;

export function createMessageCursor(message) {
  if (!message || typeof message.id !== 'string' || !UUID_RE.test(message.id)) return null;
  const createdAt = message.createdAtRaw || message.created_at;
  if (typeof createdAt !== 'string' || !TIMESTAMPTZ_RE.test(createdAt) || !Number.isFinite(Date.parse(createdAt))) return null;
  return { id: message.id, created_at: createdAt };
}

export function validateMessageCursor(cursor) {
  if (cursor == null) return null;
  if (typeof cursor !== 'object' || Array.isArray(cursor)) {
    throw new Error('Message history cursor is invalid. Refresh the conversation and try again.');
  }
  const normalized = createMessageCursor(cursor);
  if (!normalized) throw new Error('Message history cursor is invalid. Refresh the conversation and try again.');
  // Preserve the original PostgreSQL timestamp string, including microseconds.
  // Date.toISOString() would truncate values beyond JavaScript millisecond precision.
  return normalized;
}
