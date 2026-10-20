const SAFE_SEGMENT = (value) => String(value || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || 'unknown';

export async function preserveAttachmentForRetry(fileSystem, item, userId, conversationId) {
  if (!fileSystem || !item?.uri || !item?.id || !fileSystem.documentDirectory || typeof fileSystem.copyAsync !== 'function') {
    return { item, preserved: false };
  }
  const directory = `${fileSystem.documentDirectory}zannychat-attachment-outbox/`;
  const name = `${SAFE_SEGMENT(userId)}-${SAFE_SEGMENT(conversationId)}-${SAFE_SEGMENT(item.id)}`;
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
