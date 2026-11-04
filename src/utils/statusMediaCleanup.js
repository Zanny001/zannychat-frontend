const PHOTO_PATH = /^[^/]+\/[^/]+\/photo\.(?:jpg|png|webp)$/;
const VIDEO_PATH = /^[^/]+\/[^/]+\/video\.mp4$/;

/** Return only expired-status media paths that match the signed-in owner and row ID. */
export function getSafeExpiredStatusMediaPaths(rows, userId) {
  if (typeof userId !== 'string' || !userId.trim() || !Array.isArray(rows)) return [];
  const owner = userId.trim();
  const paths = new Set();
  for (const row of rows) {
    if (!row || row.user_id !== owner || typeof row.id !== 'string' || !row.id.trim()) continue;
    const path = row.media_path;
    if (typeof path !== 'string' || !path || path === 'pending') continue;
    const expectedPrefix = `${owner}/${row.id}/`;
    if (!path.startsWith(expectedPrefix)) continue;
    const fileName = path.slice(expectedPrefix.length);
    if (PHOTO_PATH.test(`${owner}/${row.id}/${fileName}`) || VIDEO_PATH.test(`${owner}/${row.id}/${fileName}`)) {
      paths.add(path);
    }
  }
  return [...paths];
}
