export function getActiveCreatorStreamId(profile) {
  const recent = Array.isArray(profile?.streams?.recent) ? profile.streams.recent : [];
  const active = recent.find((stream) => stream?.status === 'live'
    && typeof stream.id === 'string' && stream.id.trim().length > 0);
  return active ? active.id : null;
}
