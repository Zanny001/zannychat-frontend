const PHOTO_PATH = /^[^/]+\/[^/]+\/photo\.(?:jpg|png|webp)$/;
const VIDEO_PATH = /^[^/]+\/[^/]+\/video\.mp4$/;

/** Validate a status media object key against the status row that references it. */
export function isSafeStatusMediaPath(row) {
  if (!row || typeof row !== 'object') return false;
  const { id, user_id: owner, media_kind: kind, media_path: path } = row;
  if (typeof id !== 'string' || !id.trim() || typeof owner !== 'string' || !owner.trim()) return false;
  if (typeof path !== 'string' || !path || path === 'pending') return false;
  if (!path.startsWith(`${owner}/${id}/`)) return false;
  if (kind === 'image') return PHOTO_PATH.test(path);
  if (kind === 'video') return VIDEO_PATH.test(path);
  return false;
}
