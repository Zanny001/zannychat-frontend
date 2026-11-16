import { unreadStatusCount } from './statusSeen.js';

// Build one privacy-filtered tray item per status owner. Callers must pass
// statuses returned by the authenticated status service, never raw rows.
export function buildStoryTrayGroups(statuses, names, seenIds) {
  const grouped = new Map();
  for (const status of Array.isArray(statuses) ? statuses : []) {
    if (!status?.user_id || !status?.id) continue;
    if (!grouped.has(status.user_id)) grouped.set(status.user_id, []);
    grouped.get(status.user_id).push(status);
  }
  return [...grouped.entries()].map(([userId, items]) => {
    const isOwn = Boolean(items[0]?.is_own);
    return {
      userId,
      isOwn,
      name: isOwn ? 'Your story' : (typeof profiles?.[userId] === 'string' ? profiles[userId] : profiles?.[userId]?.name) || 'ZannyChat user',
      avatarUrl: isOwn ? null : (profiles?.[userId]?.avatarUrl || profiles?.[userId]?.avatar_url || null),
      avatarColor: isOwn ? null : (profiles?.[userId]?.avatarColor || profiles?.[userId]?.avatar_color || null),
      online: isOwn ? false : Boolean(profiles?.[userId]?.online),
      count: items.length,
      unseenCount: unreadStatusCount(items, seenIds, isOwn),
    };
  }).sort((a, b) => Number(b.isOwn) - Number(a.isOwn));
}
