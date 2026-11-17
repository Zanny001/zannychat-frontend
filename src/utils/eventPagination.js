const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateEventPageArgs(limit = 40) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('Event page size must be between 1 and 100.');
  }
  return { limit };
}

export function createEventCursor(event) {
  if (!event || typeof event.id !== 'string' || !UUID_RE.test(event.id) || typeof event.starts_at !== 'string' || !Number.isFinite(Date.parse(event.starts_at))) return null;
  return { id: event.id, starts_at: event.starts_at };
}

export function validateEventCursor(cursor) {
  if (cursor == null) return null;
  if (typeof cursor !== 'object' || typeof cursor.starts_at !== 'string' || !Number.isFinite(Date.parse(cursor.starts_at)) || typeof cursor.id !== 'string' || !UUID_RE.test(cursor.id)) {
    throw new Error('Event page cursor is invalid. Refresh the event list and try again.');
  }
  return { id: cursor.id, starts_at: new Date(cursor.starts_at).toISOString() };
}

export function sliceEventPage(rows, limit = 40) {
  const fetched = Array.isArray(rows) ? rows : [];
  const hasMore = fetched.length > limit;
  const events = fetched.slice(0, limit);
  const nextCursor = events.length ? createEventCursor(events[events.length - 1]) : null;
  return { events, hasMore, nextCursor };
}
