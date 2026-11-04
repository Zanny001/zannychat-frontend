/** Group active Status updates into one story entry per owner, newest first. */
export function groupStatusUpdates(statuses) {
  if (!Array.isArray(statuses)) return [];
  const groups = new Map();
  statuses.forEach((status, index) => {
    if (!status || !status.id) return;
    const ownerId = status.user_id || `status:${status.id}`;
    if (!groups.has(ownerId)) {
      groups.set(ownerId, {
        ownerId,
        isOwn: Boolean(status.is_own),
        statuses: [],
        latest: status,
        firstIndex: index,
      });
    }
    const group = groups.get(ownerId);
    group.statuses.push(status);
    const currentTime = new Date(group.latest?.created_at || 0).getTime();
    const candidateTime = new Date(status.created_at || 0).getTime();
    if (Number.isFinite(candidateTime) && (!Number.isFinite(currentTime) || candidateTime > currentTime)) {
      group.latest = status;
    }
  });
  return [...groups.values()].sort((a, b) => {
    const aTime = new Date(a.latest?.created_at || 0).getTime();
    const bTime = new Date(b.latest?.created_at || 0).getTime();
    const safeA = Number.isFinite(aTime) ? aTime : 0;
    const safeB = Number.isFinite(bTime) ? bTime : 0;
    return safeB - safeA || a.firstIndex - b.firstIndex;
  });
}
