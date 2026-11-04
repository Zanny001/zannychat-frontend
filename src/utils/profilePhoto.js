/** Return only absolute HTTP(S) photo URLs suitable for React Native Image. */
export function getSafeProfilePhotoUrl(value) {
  if (typeof value !== 'string') return null;
  const url = value.trim();
  if (!/^https?:\/\//i.test(url)) return null;
  try {
    const parsed = new URL(url);
    if (!parsed.hostname) return null;
    return url;
  } catch (_) {
    return null;
  }
}
