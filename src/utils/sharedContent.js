const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;

/** Accept only absolute HTTP(S) media URLs without embedded credentials. */
export function getSafeSharedMediaUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
    return url.toString();
  } catch (_) {
    return null;
  }
}

export function extractSafeLinks(text) {
  if (typeof text !== 'string' || !text) return [];
  const matches = text.match(URL_PATTERN) || [];
  const unique = new Map();
  for (const raw of matches) {
    const cleaned = raw.replace(/[),.!?;:]+$/g, '');
    try {
      const url = new URL(cleaned);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') continue;
      if (!url.hostname || url.username || url.password) continue;
      const normalized = url.toString();
      if (!unique.has(normalized)) unique.set(normalized, {
        url: normalized,
        host: url.hostname.replace(/^www\./i, ''),
        title: url.pathname === '/' ? url.hostname.replace(/^www\./i, '') : `${url.hostname.replace(/^www\./i, '')}${url.pathname}`,
      });
    } catch (_) {
      // Ignore malformed URLs rather than surfacing them as openable links.
    }
  }
  return [...unique.values()];
}

export function classifySharedContent(messages) {
  const photos = [];
  const files = [];
  const links = [];
  for (const message of messages || []) {
    if (!message || message.deletedAt) continue;
    const safeMediaUrl = getSafeSharedMediaUrl(message.mediaUrl);
    if (safeMediaUrl && message.mediaType === 'image') photos.push({ ...message, mediaUrl: safeMediaUrl });
    else if (safeMediaUrl && ['file', 'voice', 'audio', 'video'].includes(message.mediaType)) files.push({ ...message, mediaUrl: safeMediaUrl });
    if (typeof message.text === 'string') {
      for (const link of extractSafeLinks(message.text)) links.push({ ...link, messageId: message.id, createdAt: message.createdAt, senderName: message.senderName || '' });
    }
  }
  return { photos, files, links };
}

/** Filter the active shared-content tab without changing the underlying result set. */
export function filterSharedItems(items, query) {
  const needle = typeof query === 'string' ? query.trim().toLocaleLowerCase() : '';
  if (!needle) return Array.isArray(items) ? items : [];
  return (Array.isArray(items) ? items : []).filter((item) => {
    const fields = [
      item?.mediaName, item?.text, item?.createdAt, item?.senderName,
      item?.title, item?.host, item?.url, item?.mediaType,
    ];
    return fields.some((value) => typeof value === 'string' && value.toLocaleLowerCase().includes(needle));
  });
}

/** Merge a fetched older page before existing messages without duplicate or malformed rows. */
export function mergeOlderMessages(existing, older) {
  const current = Array.isArray(existing) ? existing : [];
  const incoming = Array.isArray(older) ? older : [];
  const byId = new Map();
  const order = [];
  // Existing rows win on overlap because they may contain fresher receipt or edit state.
  for (const message of current) {
    if (!message || typeof message !== 'object' || message.id === undefined || message.id === null || String(message.id).trim() === '') continue;
    const key = String(message.id);
    if (!byId.has(key)) { byId.set(key, message); order.push(key); }
  }
  const olderOrder = [];
  for (const message of incoming) {
    if (!message || typeof message !== 'object' || message.id === undefined || message.id === null || String(message.id).trim() === '') continue;
    const key = String(message.id);
    if (!byId.has(key)) { byId.set(key, message); olderOrder.push(key); }
  }
  return [...olderOrder, ...order].map((key) => byId.get(key));
}
