/**
 * Merge channel comment pages into one stable chronological list.
 * Incoming rows win for duplicate IDs so refreshed comment edits are not lost.
 */
export function mergeChannelCommentPages(existing, incoming) {
  const byId = new Map();
  for (const comment of [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]) {
    if (!comment || typeof comment.id !== 'string' || !comment.id) continue;
    byId.set(comment.id, comment);
  }
  return [...byId.values()].sort((a, b) => {
    const aTime = Date.parse(a.created_at || '');
    const bTime = Date.parse(b.created_at || '');
    const aValid = Number.isFinite(aTime);
    const bValid = Number.isFinite(bTime);
    if (aValid && bValid && aTime !== bTime) return aTime - bTime;
    if (aValid !== bValid) return aValid ? -1 : 1;
    const aCreated = String(a.created_at || '');
    const bCreated = String(b.created_at || '');
    if (aCreated !== bCreated) return aCreated.localeCompare(bCreated);
    return a.id.localeCompare(b.id);
  });
}
