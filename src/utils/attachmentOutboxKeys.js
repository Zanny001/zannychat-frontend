/** Build a collision-safe storage key for one user's attachment outbox. */
function encodeKeyPart(value, fallback) {
  const normalized = value == null || String(value) === '' ? fallback : String(value);
  try {
    return encodeURIComponent(normalized);
  } catch (_) {
    // Replace lone UTF-16 surrogates deterministically before encoding.
    return encodeURIComponent(normalized.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '\uFFFD'));
  }
}

export function getAttachmentOutboxStorageKey(userId, conversationId) {
  if (conversationId == null || String(conversationId) === '') return null;
  return `zannychat:attachment-outbox:v1:${encodeKeyPart(userId, 'guest')}:${encodeKeyPart(conversationId, '')}`;
}
