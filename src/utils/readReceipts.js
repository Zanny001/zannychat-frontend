/** Count conversation members (excluding the sender) whose last_read_at is
 * at or after a message timestamp. This is a best-effort group read count,
 * not a per-message delivery receipt; participant read cursors are coarse. */
export function countReadersForMessage({ messageCreatedAt, participantReadState, senderId }) {
  if (!messageCreatedAt || !participantReadState || typeof participantReadState !== 'object') return 0;
  const messageTime = new Date(messageCreatedAt).getTime();
  if (!Number.isFinite(messageTime)) return 0;
  return Object.entries(participantReadState).reduce((count, [userId, lastReadAt]) => {
    if (!lastReadAt || userId === senderId) return count;
    const readTime = new Date(lastReadAt).getTime();
    return Number.isFinite(readTime) && readTime >= messageTime ? count + 1 : count;
  }, 0);
}


/** Resolve honest one-to-one tick state. A read cursor supersedes delivery;
 * a delivery receipt is a separate acknowledgment from the recipient client. */
export function resolveMessageDeliveryStatus({ message, isGroup = false, peerId, deliveryState = {}, participantReadState = {} }) {
  if (!message || String(message.id || '').startsWith('temp-')) return 'pending';
  if (isGroup) return 'sent';
  const lastReadAt = participantReadState[peerId];
  if (lastReadAt && message.createdAtRaw) {
    const created = new Date(message.createdAtRaw).getTime();
    const read = new Date(lastReadAt).getTime();
    if (Number.isFinite(created) && Number.isFinite(read) && created <= read) return 'read';
  }
  if (peerId && (deliveryState[message.id] || []).includes(peerId)) return 'delivered';
  return 'sent';
}


/** Count unique recipients whose client acknowledged this specific message. */
export function countDeliveredRecipients({ messageId, participantIds, deliveryState = {}, senderId }) {
  if (!messageId || !Array.isArray(participantIds)) return 0;
  const delivered = new Set(deliveryState[messageId] || []);
  return [...new Set(participantIds)].filter((id) => id && id !== senderId && delivered.has(id)).length;
}
