const RULE_MATCHERS = {
  unread: (chat) => Number(chat?.unreadCount) > 0,
  favorites: (chat) => Boolean(chat?.isFavorite),
  groups: (chat) => Boolean(chat?.isGroup),
  private: (chat) => !Boolean(chat?.isGroup),
};

export function filterByChatFolder(conversations, folder) {
  if (!Array.isArray(conversations) || !folder) return [];
  const rules = Array.isArray(folder.rules) ? folder.rules : [];
  const excluded = Array.isArray(folder.excluded) ? folder.excluded : [];
  return conversations.filter((chat) => {
    if (excluded.includes('archived') && chat?.isArchived) return false;
    if (excluded.includes('muted') && chat?.isMuted) return false;
    if (excluded.includes('read') && Number(chat?.unreadCount) === 0) return false;
    if (!rules.length) return !chat?.isArchived;
    return rules.some((rule) => RULE_MATCHERS[rule]?.(chat) === true) && !chat?.isArchived;
  });
}
