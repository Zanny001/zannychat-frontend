const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;

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
    if (message.mediaUrl && message.mediaType === 'image') photos.push(message);
    else if (message.mediaUrl && ['file', 'voice', 'audio', 'video'].includes(message.mediaType)) files.push(message);
    if (typeof message.text === 'string') {
      for (const link of extractSafeLinks(message.text)) links.push({ ...link, messageId: message.id, createdAt: message.createdAt, senderName: message.senderName || '' });
    }
  }
  return { photos, files, links };
}
