/** Pure chat-list filtering shared by the screen and unit tests. */
export function filterConversations(conversations, activeFilter = 'all', query = '') {
  const needle = String(query || '').trim().toLocaleLowerCase();
  return (Array.isArray(conversations) ? conversations : [])
    .filter((conversation) => activeFilter === 'archived'
      ? Boolean(conversation?.isArchived)
      : !conversation?.isArchived)
    .filter((conversation) => {
      if (!needle) return true;
      const searchable = [
        conversation?.participant?.name,
        conversation?.name,
        conversation?.lastMessage,
      ].filter((part) => typeof part === 'string').join(' ').toLocaleLowerCase();
      return searchable.includes(needle);
    })
    .filter((conversation) => {
      if (activeFilter === 'unread') return Number(conversation?.unreadCount) > 0;
      if (activeFilter === 'favorites') return Boolean(conversation?.isFavorite);
      if (activeFilter === 'groups') return Boolean(conversation?.isGroup);
      return true;
    });
}
