/** Map retry failures to user-safe copy; never persist provider/database details in local outboxes. */
export function getSafeRetryError(error, operation = 'message') {
  const isAttachment = operation === 'attachment';
  const noun = isAttachment ? 'Attachment' : 'Message';
  const action = isAttachment ? 'upload' : 'send';
  const code = typeof error?.code === 'string' ? error.code : '';
  const message = String(error?.message || error || '');

  if (code === '42501') return `You may no longer have permission to ${action} in this conversation.`;
  if (code === '23503') return `This conversation or reply is no longer available. Refresh the chat and try again.`;
  if (code === '23514' || code === '22P02' || code === '22023') {
    return isAttachment
      ? 'This attachment could not be uploaded because some file information is invalid.'
      : 'This message could not be saved because some of its data is invalid.';
  }
  if (/network|fetch|timeout|timed out|offline|connection/i.test(message)) {
    return `${noun} is still waiting to ${action}. Check your connection and try again.`;
  }
  return `${noun} is still waiting to ${action}. Please try again.`;
}

/** Sanitize legacy outbox error text that may have been saved by older releases. */
export function normalizeSafeRetryError(value, operation = 'message') {
  if (typeof value !== 'string' || !value.trim()) return null;
  return getSafeRetryError({ message: value }, operation);
}
