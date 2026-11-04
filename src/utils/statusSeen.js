const MAX_SEEN_STATUS_IDS = 5000;

export function normalizeSeenStatusIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim()))].slice(-MAX_SEEN_STATUS_IDS);
}

export function markStatusSeen(currentIds, statusId) {
  if (typeof statusId !== 'string' || !statusId.trim()) return normalizeSeenStatusIds(currentIds);
  return normalizeSeenStatusIds([...(Array.isArray(currentIds) ? currentIds : []), statusId.trim()]);
}

export async function readSeenStatusIds(storage) {
  if (!storage || typeof storage.getItem !== 'function') return [];
  try {
    const raw = await storage.getItem('zannychat.status-seen.v1');
    return raw ? normalizeSeenStatusIds(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

/** Mark a collection of status IDs seen in one bounded, deduplicated update. */
export function markStatusesSeen(currentIds, statuses) {
  const ids = Array.isArray(statuses) ? statuses.map((status) => status?.id).filter((id) => typeof id === 'string' && id.trim()) : [];
  return normalizeSeenStatusIds([...(Array.isArray(currentIds) ? currentIds : []), ...ids]);
}

export function unreadStatusCount(statuses, seenIds, isOwn = false) {
  if (isOwn || !Array.isArray(statuses)) return 0;
  const seen = new Set(normalizeSeenStatusIds(seenIds));
  return statuses.reduce((count, status) => count + (status?.id && !seen.has(status.id) ? 1 : 0), 0);
}

/** Choose the oldest unseen update in a grouped story, falling back to its latest update. */
export function firstUnseenStatus(statuses, seenIds, fallback = null) {
  if (!Array.isArray(statuses) || statuses.length === 0) return fallback;
  const seen = new Set(normalizeSeenStatusIds(seenIds));
  const unseen = statuses.filter((status) => status?.id && !seen.has(status.id));
  if (!unseen.length) return fallback || statuses[0] || null;
  return unseen.sort((a, b) => {
    const aTime = new Date(a.created_at || 0).getTime();
    const bTime = new Date(b.created_at || 0).getTime();
    return (Number.isFinite(aTime) ? aTime : 0) - (Number.isFinite(bTime) ? bTime : 0);
  })[0];
}

/** Keep local read markers only for statuses that are still active. */
export function retainActiveSeenStatusIds(seenIds, activeStatuses) {
  if (!Array.isArray(activeStatuses)) return normalizeSeenStatusIds(seenIds);
  const activeIds = new Set(activeStatuses.filter((status) => status?.id).map((status) => status.id));
  return normalizeSeenStatusIds(seenIds).filter((id) => activeIds.has(id));
}
