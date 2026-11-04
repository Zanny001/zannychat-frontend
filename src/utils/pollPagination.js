export function validatePollPageArgs(offset = 0, limit = 40) {
  if (!Number.isSafeInteger(offset) || offset < 0) throw new Error('Poll page offset is invalid.');
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error('Poll page size must be between 1 and 100.');
  return { offset, limit };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** A keyset cursor is derived from the final visible row, never the look-ahead row. */
export function createPollCursor(poll) {
  if (!poll || typeof poll.id !== 'string' || !UUID_RE.test(poll.id) || typeof poll.created_at !== 'string' || !Number.isFinite(Date.parse(poll.created_at))) return null;
  return { id: poll.id, created_at: poll.created_at };
}

export function validatePollCursor(cursor) {
  if (cursor == null) return null;
  if (typeof cursor !== 'object' || typeof cursor.created_at !== 'string' || !Number.isFinite(Date.parse(cursor.created_at)) || typeof cursor.id !== 'string' || !UUID_RE.test(cursor.id)) {
    throw new Error('Poll page cursor is invalid. Refresh the poll list and try again.');
  }
  return { id: cursor.id, created_at: cursor.created_at };
}

export function slicePollPage(rows, offset = 0, limit = 40) {
  const fetched = Array.isArray(rows) ? rows : [];
  const hasMore = fetched.length > limit;
  const polls = fetched.slice(0, limit);
  const nextCursor = polls.length ? createPollCursor(polls[polls.length - 1]) : null;
  return { polls, hasMore, nextOffset: offset + polls.length, nextCursor };
}
