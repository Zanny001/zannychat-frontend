/** User-scoped local favorites for the ZannyChat member directory. */
export function memberFavoritesStorageKey(userId) {
  const safeId = typeof userId === 'string' && userId.trim() ? userId.trim() : 'guest';
  return `zannychat:member-favorites:v1:${safeId}`;
}

export function normalizeMemberFavorites(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim()))].slice(0, 500);
}

export function toggleMemberFavorite(favorites, memberId) {
  if (typeof memberId !== 'string' || !memberId.trim()) return normalizeMemberFavorites(favorites);
  const current = normalizeMemberFavorites(favorites);
  return current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId].slice(-500);
}

export function filterMemberDirectory(members, query, filter = 'all', favorites = []) {
  const favoriteIds = new Set(normalizeMemberFavorites(favorites));
  const normalizedQuery = String(query || '').trim().toLocaleLowerCase();
  return (Array.isArray(members) ? members : [])
    .filter((member) => member && typeof member.id === 'string' && member.id.length > 0)
    .filter((member) => filter !== 'online' || member.online === true)
    .filter((member) => filter !== 'favorites' || favoriteIds.has(member.id))
    .filter((member) => !normalizedQuery || [member.name, member.status, member.username].filter((v) => typeof v === 'string').join(' ').toLocaleLowerCase().includes(normalizedQuery))
    .slice()
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }));
}
