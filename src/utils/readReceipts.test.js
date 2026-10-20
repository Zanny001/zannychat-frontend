import test from 'node:test';
import assert from 'node:assert/strict';
import { countReadersForMessage, resolveMessageDeliveryStatus, countDeliveredRecipients } from './readReceipts.js';

test('counts other members whose read cursor passed the message', () => {
  assert.equal(countReadersForMessage({
    messageCreatedAt: '2026-01-01T12:00:00Z', senderId: 'sender',
    participantReadState: { sender: '2026-01-01T12:10:00Z', a: '2026-01-01T12:00:00Z', b: '2026-01-01T11:59:00Z', c: '2026-01-01T12:05:00Z' },
  }), 2);
});
test('returns zero for missing or invalid timestamps', () => {
  assert.equal(countReadersForMessage({ messageCreatedAt: null, participantReadState: { a: '2026-01-01' } }), 0);
  assert.equal(countReadersForMessage({ messageCreatedAt: 'bad', participantReadState: { a: '2026-01-01' } }), 0);
});
test('ignores sender and unread or invalid cursors', () => {
  assert.equal(countReadersForMessage({ messageCreatedAt: '2026-01-01T12:00:00Z', senderId: 'a', participantReadState: { a: '2026-01-02', b: null, c: 'bad' } }), 0);
});


test('delivery status distinguishes sent, delivered, read, and optimistic messages', () => {
  const message = { id: 'm1', createdAtRaw: '2026-01-01T12:00:00Z' };
  const base = { message, peerId: 'peer' };
  assert.equal(resolveMessageDeliveryStatus(base), 'sent');
  assert.equal(resolveMessageDeliveryStatus({ ...base, deliveryState: { m1: ['peer'] } }), 'delivered');
  assert.equal(resolveMessageDeliveryStatus({ ...base, deliveryState: { m1: ['peer'] }, participantReadState: { peer: '2026-01-01T12:01:00Z' } }), 'read');
  assert.equal(resolveMessageDeliveryStatus({ ...base, message: { ...message, id: 'temp-123' } }), 'pending');
  assert.equal(resolveMessageDeliveryStatus({ ...base, isGroup: true, deliveryState: { m1: ['peer'] } }), 'sent');
});


test('counts unique delivered group recipients excluding the sender', () => {
  assert.equal(countDeliveredRecipients({ messageId: 'm1', participantIds: ['sender', 'a', 'a', 'b', 'c'], senderId: 'sender', deliveryState: { m1: ['a', 'a', 'sender', 'c'] } }), 2);
  assert.equal(countDeliveredRecipients({ messageId: 'm1', participantIds: ['sender', 'a'], senderId: 'sender', deliveryState: {} }), 0);
  assert.equal(countDeliveredRecipients({ messageId: 'm1', participantIds: null }), 0);
});
