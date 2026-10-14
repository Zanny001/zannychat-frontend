// Saved messages are a device-local convenience, not a synced server feature.
// Deliberately exclude signed media URLs, access tokens, and raw attachment paths.
export function makeSavedMessage(message = {}, conversation = {}, savedAt = new Date().toISOString()) {
  if (!message.id || !conversation.id) throw new Error('A message and conversation are required.');
  if (message.deletedAt || message.deleted_at) throw new Error('Deleted messages cannot be saved.');
  const attachment = message.mediaType || message.media_type;
  const text = typeof message.text === 'string' ? message.text.trim() : '';
  if (!text && !attachment) throw new Error('This message has no content to save.');
  return {
    id: `${conversation.id}:${message.id}`,
    messageId: String(message.id),
    conversationId: String(conversation.id),
    conversation: {
      id: String(conversation.id),
      isGroup: Boolean(conversation.isGroup ?? conversation.is_group),
      name: conversation.name || conversation.title || conversation.participant?.name || 'Conversation',
      participant: conversation.participant ? {
        id: conversation.participant.id ? String(conversation.participant.id) : null,
        name: conversation.participant.name || 'Contact',
      } : null,
    },
    text,
    attachment: attachment ? {
      type: String(attachment),
      name: message.mediaName || message.media_name || null,
    } : null,
    senderName: message.senderName || null,
    createdAt: message.createdAt || message.created_at || null,
    savedAt,
  };
}

export function filterSavedMessages(items = [], query = '') {
  const needle = String(query || '').trim().toLocaleLowerCase();
  if (!needle) return items;
  return items.filter((item) => [item.text, item.conversation?.name, item.senderName, item.attachment?.name]
    .some((value) => typeof value === 'string' && value.toLocaleLowerCase().includes(needle)));
}
