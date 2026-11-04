/**
 * Resolve profile presence without overriding explicit privacy preferences.
 * Missing privacy metadata preserves the legacy display behavior; an explicit
 * false visibility flag or true hide flag always suppresses the data.
 */
function firstBoolean(source, keys) {
  for (const key of keys) {
    if (typeof source?.[key] === 'boolean') return source[key];
  }
  return undefined;
}

function isVisible(participant, kind) {
  const keys = kind === 'online'
    ? { show: ['showOnlineStatus', 'show_online_status', 'onlineStatusVisible', 'online_status_visible'], hide: ['hideOnlineStatus', 'hide_online_status'] }
    : { show: ['showLastSeen', 'show_last_seen', 'lastSeenVisible', 'last_seen_visible'], hide: ['hideLastSeen', 'hide_last_seen'] };
  const visibility = firstBoolean(participant, keys.show);
  const hidden = firstBoolean(participant, keys.hide);
  if (visibility === false || hidden === true) return false;
  const privacy = participant?.presencePrivacy || participant?.presence_privacy || participant?.privacy || {};
  const nestedVisibility = firstBoolean(privacy, kind === 'online'
    ? ['showOnlineStatus', 'show_online_status', 'onlineStatusVisible', 'online_status_visible']
    : ['showLastSeen', 'show_last_seen', 'lastSeenVisible', 'last_seen_visible']);
  const nestedHidden = firstBoolean(privacy, kind === 'online'
    ? ['hideOnlineStatus', 'hide_online_status']
    : ['hideLastSeen', 'hide_last_seen']);
  return nestedVisibility !== false && nestedHidden !== true;
}

export function getProfilePresence(participant = {}, now = Date.now()) {
  const onlineVisible = isVisible(participant, 'online');
  const lastSeenVisible = isVisible(participant, 'lastSeen');
  const online = onlineVisible && Boolean(participant.online);
  const rawLastSeen = lastSeenVisible ? (participant.lastSeen || participant.last_seen_at) : null;
  const lastSeenDate = rawLastSeen ? new Date(rawLastSeen) : null;
  const validLastSeen = lastSeenDate && !Number.isNaN(lastSeenDate.getTime()) && lastSeenDate.getTime() <= now;
  const presence = online
    ? 'Online now'
    : validLastSeen
      ? `Last seen ${lastSeenDate.toLocaleString()}`
      : 'ZannyChat contact';
  return { online, presence, lastSeenVisible: Boolean(lastSeenVisible && validLastSeen), onlineVisible };
}
