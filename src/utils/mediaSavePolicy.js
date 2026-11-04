const SUPPORTED_MEDIA_KINDS = new Set(['image', 'video']);
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'm4v', 'webm']);

function extensionForPath(pathname, kind) {
  const match = String(pathname || '').toLowerCase().match(/\.([a-z0-9]{2,5})$/);
  const extension = match?.[1];
  const allowed = kind === 'image' ? IMAGE_EXTENSIONS : VIDEO_EXTENSIONS;
  if (extension && allowed.has(extension)) return extension === 'jpeg' ? 'jpg' : extension;
  return kind === 'video' ? 'mp4' : 'jpg';
}

export function isCompatibleMediaContentType(contentType, kind) {
  if (!contentType) return true; // Some signed-CDN responses omit this header.
  const type = String(contentType).split(';', 1)[0].trim().toLowerCase();
  if (kind === 'image') return ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'].includes(type);
  if (kind === 'video') return ['video/mp4', 'video/quicktime', 'video/x-m4v', 'video/webm', 'application/octet-stream'].includes(type);
  return false;
}

export function getMediaSaveRequest(uri, kind, prefix = 'zannychat-media') {
  if (typeof uri !== 'string' || uri.length > 8192 || !SUPPORTED_MEDIA_KINDS.has(kind)) return null;
  let parsed;
  try { parsed = new URL(uri); } catch (_) { return null; }
  if (!['https:', 'http:'].includes(parsed.protocol) || !parsed.hostname) return null;
  const safePrefix = String(prefix || 'zannychat-media').replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || 'zannychat-media';
  const extension = extensionForPath(parsed.pathname, kind);
  return {
    uri: parsed.toString(),
    kind,
    extension,
    filename: `${safePrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`,
  };
}
