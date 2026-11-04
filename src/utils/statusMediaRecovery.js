/** Accept only absolute web URLs for refreshed status media links. */
export function normalizeStatusMediaUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) return null;
    return url.toString();
  } catch {
    return null;
  }
}
