const MAX_PINNED_MESSAGES = 300;
const MAX_TEXT_LENGTH = 20000;

function safeString(value, max = 500) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

export function createPinnedMessage(message, conversation) {
  if (!message?.id || !conversation?.id || message.deletedAt) {
    throw new Error('Only existing messages can be pinned.');
  }
  const attachment = message.mediaType
    ? {
        type: safeString(message.mediaType, 40),
        name: safeString(message.attachmentName || message.fileName || message.mediaName || '', 180),
      }
    : null;
  return {
    id: `${String(conversation.id)}:${String(message.id)}`,
    messageId: String(message.id),
    conversationId: String(conversation.id),
    conversation: {
      id: String(conversation.id),
      isGroup: Boolean(conversation.isGroup ?? conversation.is_group),
      name: safeString(conversation.name || conversation.title || conversation.participant?.name || 'Conversation', 160),
      participant: conversation.participant ? {
        id: conversation.participant.id ? String(conversation.participant.id) : null,
        name: safeString(conversation.participant.name || 'Contact', 120),
      } : null,
    },
    conversationName: safeString(conversation.name || conversation.participant?.name || 'Conversation', 160),
    text: safeString(message.text, MAX_TEXT_LENGTH),
    senderName: safeString(message.senderName || '', 120),
    createdAt: safeString(message.createdAtRaw || message.createdAt || '', 80),
    attachment,
    pinnedAt: new Date().toISOString(),
  };
}

export function upsertPinnedMessage(items, item) {
  const current = Array.isArray(items) ? items : [];
  return [item, ...current.filter((entry) => entry?.id !== item.id)].slice(0, MAX_PINNED_MESSAGES);
}

export function removePinnedMessage(items, id) {
  return (Array.isArray(items) ? items : []).filter((entry) => entry?.id !== id);
}

export function filterPinnedMessages(items, query = '', conversationId = null) {
  const needle = String(query || '').trim().toLocaleLowerCase();
  return (Array.isArray(items) ? items : [])
    .filter((item) => item && item.id && item.messageId && item.conversationId)
    .filter((item) => !conversationId || item.conversationId === String(conversationId))
    .filter((item) => !needle || `${item.text || ''} ${item.senderName || ''} ${item.conversationName || ''} ${item.attachment?.name || ''}`.toLocaleLowerCase().includes(needle))
    .sort((a, b) => Date.parse(b.pinnedAt || 0) - Date.parse(a.pinnedAt || 0));
}

export function isMessagePinned(items, conversationId, messageId) {
  return (Array.isArray(items) ? items : []).some((item) => item?.conversationId === String(conversationId) && item?.messageId === String(messageId));
}
