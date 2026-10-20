import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGroupReceiptDetails } from './groupReceiptDetails.js';

test('group receipt details prefer read cursor over delivery receipt', () => {
  const details = buildGroupReceiptDetails({
    message: { id: 'm1', createdAtRaw: '2026-10-18T10:00:00.000Z' },
    senderId: 'sender',
    members: [
      { id: 'sender', profile: { name: 'Me' } },
      { id: 'reader', profile: { name: 'Reader' } },
      { id: 'delivered', profile: { name: 'Delivered' } },
      { id: 'pending', profile: { name: 'Pending' } },
    ],
    participantReadState: { reader: '2026-10-18T10:01:00.000Z', delivered: '2026-10-18T09:59:00.000Z' },
    deliveryState: { m1: ['reader', 'delivered'] },
  });
  assert.deepEqual(details.map(({ id, status }) => [id, status]), [
    ['reader', 'Read'], ['delivered', 'Delivered'], ['pending', 'Awaiting delivery receipt'],
  ]);
});

test('group receipt details ignore temporary messages and invalid timestamps', () => {
  assert.deepEqual(buildGroupReceiptDetails({ message: { id: 'temp-1', createdAtRaw: '2026-10-18' }, members: [{ id: 'a' }] }), []);
  assert.deepEqual(buildGroupReceiptDetails({ message: { id: 'm1', createdAtRaw: 'invalid' }, members: [{ id: 'a' }] }), []);
});

test('group receipt details exclude sender and provide a safe fallback name', () => {
  const details = buildGroupReceiptDetails({
    message: { id: 'm1', createdAtRaw: '2026-10-18T10:00:00.000Z' }, senderId: 'me',
    members: [{ id: 'me' }, { id: 'other' }],
  });
  assert.equal(details.length, 1);
  assert.equal(details[0].name, 'ZannyChat member');
});
