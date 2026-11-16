const SEARCH_FIELDS = ['title', 'description', 'creator_name', 'creatorName'];

export function filterLiveStreams(streams, options = {}) {
  const { filter = 'all', followingIds = [], query = '' } = options;
  const followed = new Set(Array.isArray(followingIds) ? followingIds : []);
  const needle = String(query || '').trim().toLocaleLowerCase();

  return (Array.isArray(streams) ? streams : []).filter((stream) => {
    if (!stream || typeof stream !== 'object') return false;
    if (filter === 'following' && !followed.has(stream.creator_id)) return false;
    if (filter === 'public' && stream.visibility !== 'public') return false;
    if (!needle) return true;

    const creatorProfileName = stream.creator && typeof stream.creator.name === 'string'
      ? stream.creator.name : '';
    const searchable = SEARCH_FIELDS.map((field) => stream[field])
      .concat(creatorProfileName)
      .filter((value) => typeof value === 'string')
      .join(' ')
      .toLocaleLowerCase();
    return searchable.includes(needle);
  });
}
