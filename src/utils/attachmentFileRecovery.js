// Percent-encoding keeps separators and punctuation distinct in file names. The
// previous lossy replacement could map values such as `user/1` and `user_1`
// to the same recovery-copy path.
const SAFE_SEGMENT = (value) => {
  const raw = typeof value === 'string' ? value : String(value ?? 'unknown');
  if (!raw || raw.length > 128 || /[\u0000-\u001F\u007F]/.test(raw)) return null;
  try { return encodeURIComponent(raw); } catch (_) { return null; }
};

export async function preserveAttachmentForRetry(fileSystem, item, userId, conversationId) {
  if (!fileSystem || !item?.uri || !item?.id || !fileSystem.documentDirectory || typeof fileSystem.copyAsync !== 'function') {
    return { item, preserved: false };
  }
  const userSegment = SAFE_SEGMENT(userId);
  const conversationSegment = SAFE_SEGMENT(conversationId);
  const attachmentSegment = SAFE_SEGMENT(item.id);
  if (!userSegment || !conversationSegment || !attachmentSegment) return { item, preserved: false };
  const directory = `${fileSystem.documentDirectory}zannychat-attachment-outbox/`;
  const name = `${userSegment}-${conversationSegment}-${attachmentSegment}`;
  const extension = String(item.uri).match(/\.[a-zA-Z0-9]{1,8}(?:[?#].*)?$/)?.[0]?.split(/[?#]/)[0] || '';
  const destination = `${directory}${name}${extension}`;
  try {
    if (typeof fileSystem.makeDirectoryAsync === 'function') {
      await fileSystem.makeDirectoryAsync(directory, { intermediates: true });
    }
    await fileSystem.copyAsync({ from: item.uri, to: destination });
    return { item: { ...item, uri: destination, recoveryCopy: true, originalUri: undefined }, preserved: true };
  } catch (_) {
    return { item, preserved: false };
  }
}

export async function removePreservedAttachment(fileSystem, item) {
  if (!item?.recoveryCopy || !item?.uri || typeof fileSystem?.deleteAsync !== 'function') return false;
  try {
    await fileSystem.deleteAsync(item.uri, { idempotent: true });
    return true;
  } catch (_) {
    return false;
  }
}
