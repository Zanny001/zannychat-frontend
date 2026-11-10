import test from 'node:test';
import assert from 'node:assert/strict';
import { getCallHistoryLabel } from './callHistory.js';

test('missed calls are labelled from the perspective of both participants', () => {
  const call = { status: 'missed', caller_id: 'caller', callee_id: 'callee' };
  assert.equal(getCallHistoryLabel(call, 'callee'), 'Missed incoming call');
  assert.equal(getCallHistoryLabel(call, 'caller'), 'No answer');
});

test('expired ringing invitations display as missed', () => {
  const call = { status: 'ringing', caller_id: 'caller', callee_id: 'callee', expires_at: '2026-11-10T00:00:00Z' };
  assert.equal(getCallHistoryLabel(call, 'callee', Date.parse('2026-11-10T00:01:00Z')), 'Missed incoming call');
});

test('completed, declined and cancelled calls remain distinguishable', () => {
  assert.equal(getCallHistoryLabel({ status: 'ended', caller_id: 'a', callee_id: 'b' }, 'a'), 'Completed call');
  assert.equal(getCallHistoryLabel({ status: 'declined', caller_id: 'a', callee_id: 'b' }, 'a'), 'Call declined');
  assert.equal(getCallHistoryLabel({ status: 'cancelled', caller_id: 'a', callee_id: 'b' }, 'a'), 'Cancelled call');
});
