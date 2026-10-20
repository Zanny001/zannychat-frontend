export function mergeChannelPostPages(existing, incoming) {
  const byId = new Map();
  for (const post of Array.isArray(existing) ? existing : []) {
    if (post && typeof post.id === 'string') byId.set(post.id, post);
  }
  for (const post of Array.isArray(incoming) ? incoming : []) {
    if (!post || typeof post.id !== 'string') continue;
    byId.set(post.id, { ...(byId.get(post.id) || {}), ...post });
  }
  return [...byId.values()].sort((a, b) =>
    Number(Boolean(b.is_pinned)) - Number(Boolean(a.is_pinned)) ||
    (new Date(b.created_at).getTime() || 0) - (new Date(a.created_at).getTime() || 0) ||
    String(b.id).localeCompare(String(a.id))
  );
}
