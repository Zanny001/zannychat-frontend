const FILTERS = new Set(['all', 'subscribed', 'popular', 'newest', 'recent']);

function timestamp(value) {
  const parsed = typeof value === 'string' || typeof value === 'number' ? new Date(value).getTime() : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function subscribers(channel) {
  const count = Number(channel?.subscriberCount ?? channel?.subscriber_count ?? 0);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

/** Sort/filter only the directory rows already returned by the server. */
export function filterChannelDirectory(channels, filter = 'all', recentIds = []) {
  const rows = Array.isArray(channels) ? channels.filter((row) => row && typeof row.id === 'string' && row.id.length > 0) : [];
  const mode = FILTERS.has(filter) ? filter : 'all';
  const indexed = rows.map((channel, index) => ({ channel, index }));
  const recentRank = new Map((Array.isArray(recentIds) ? recentIds : []).filter((id) => typeof id === 'string').map((id, index) => [id, index]));
  const visible = mode === 'subscribed' ? indexed.filter(({ channel }) => Boolean(channel.subscribed)) : mode === 'recent' ? indexed.filter(({ channel }) => recentRank.has(channel.id)) : indexed;
  if (mode === 'recent') {
    visible.sort((a, b) => recentRank.get(a.channel.id) - recentRank.get(b.channel.id) || a.index - b.index);
  } else if (mode === 'popular') {
    visible.sort((a, b) => subscribers(b.channel) - subscribers(a.channel) || a.index - b.index);
  } else if (mode === 'newest') {
    visible.sort((a, b) => timestamp(b.channel.created_at) - timestamp(a.channel.created_at) || a.index - b.index);
  }
  return visible.map(({ channel }) => channel);
}

export function getChannelDirectoryCounts(channels, recentIds = []) {
  const rows = Array.isArray(channels) ? channels.filter((row) => row && typeof row.id === 'string' && row.id.length > 0) : [];
  return {
    all: rows.length,
    subscribed: rows.filter((channel) => Boolean(channel.subscribed)).length,
    recent: rows.filter((channel) => Array.isArray(recentIds) && recentIds.includes(channel.id)).length,
  };
}
