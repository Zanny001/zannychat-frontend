/** Build per-member receipt details for a message sent to a group.
 * Read is inferred from each participant's last_read_at cursor; delivered is
 * based on the explicit per-message delivery acknowledgement table.
 */
export function buildGroupReceiptDetails({ message, members = [], senderId, participantReadState = {}, deliveryState = {} }) {
  if (!message?.id || String(message.id).startsWith('temp-')) return [];
  const createdAt = new Date(message.createdAtRaw || message.createdAt || '').getTime();
  if (!Number.isFinite(createdAt)) return [];
  const delivered = new Set(deliveryState[message.id] || []);
  return members
    .filter((member) => member?.id && member.id !== senderId)
    .map((member) => {
      const readAt = participantReadState[member.id];
      const readTime = readAt ? new Date(readAt).getTime() : NaN;
      const hasRead = Number.isFinite(readTime) && readTime >= createdAt;
      const status = hasRead ? 'Read' : delivered.has(member.id) ? 'Delivered' : 'Awaiting delivery receipt';
      return { id: member.id, name: member.profile?.name || 'ZannyChat member', status, readAt: hasRead ? readAt : null };
    });
}
