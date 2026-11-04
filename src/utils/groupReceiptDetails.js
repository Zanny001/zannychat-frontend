/** Build per-member receipt details for a message sent to a group.
 * Read is inferred from each participant's last_read_at cursor; delivered is
 * based on the explicit per-message delivery acknowledgement table.
 */
export function buildGroupReceiptDetails({ message, members = [], senderId, participantReadState = {}, deliveryState = {} }) {
  if (!message?.id || String(message.id).startsWith('temp-')) return [];
  const createdAt = new Date(message.createdAtRaw || message.createdAt || '').getTime();
  if (!Number.isFinite(createdAt) || !Array.isArray(members)) return [];
  const receipts = deliveryState && typeof deliveryState === 'object' && !Array.isArray(deliveryState)
    ? deliveryState : {};
  const delivered = new Set(Array.isArray(receipts[message.id])
    ? receipts[message.id].filter((id) => typeof id === 'string' && id.length > 0) : []);
  const readState = participantReadState && typeof participantReadState === 'object' && !Array.isArray(participantReadState)
    ? participantReadState : {};
  return members
    .filter((member) => typeof member?.id === 'string' && member.id.length > 0 && member.id !== senderId)
    .map((member) => {
      const readAt = readState[member.id];
      const readTime = readAt ? new Date(readAt).getTime() : NaN;
      const hasRead = Number.isFinite(readTime) && readTime >= createdAt;
      const status = hasRead ? 'Read' : delivered.has(member.id) ? 'Delivered' : 'Awaiting delivery receipt';
      const rawName = member.profile?.name;
      const name = typeof rawName === 'string' && rawName.trim() ? rawName.trim().slice(0, 100) : 'ZannyChat member';
      return { id: member.id, name, status, readAt: hasRead ? readAt : null };
    });
}
