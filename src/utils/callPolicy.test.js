import test from 'node:test';
import assert from 'node:assert/strict';
import { canStartCall, formatCallDuration, getCallEndStatus, isTerminalCallStatus } from './callPolicy.js';

test('only direct conversations with a participant and valid call type can start calls', () => {
  assert.equal(canStartCall({ conversationId: 'c1', participantId: 'u2', isGroup: false, callType: 'audio' }), true);
  assert.equal(canStartCall({ conversationId: 'c1', participantId: 'u2', isGroup: false, callType: 'video' }), true);
  assert.equal(canStartCall({ conversationId: 'c1', participantId: 'u2', isGroup: true, callType: 'audio' }), false);
  assert.equal(canStartCall({ conversationId: 'c1', participantId: null, isGroup: false, callType: 'audio' }), false);
  assert.equal(canStartCall({ conversationId: 'c1', participantId: 'u2', isGroup: false, callType: 'screen-share' }), false);
});

test('terminal call states are explicitly recognized', () => {
  for (const status of ['declined', 'cancelled', 'ended', 'missed', 'failed']) assert.equal(isTerminalCallStatus(status), true);
  for (const status of ['ringing', 'accepted', undefined, null]) assert.equal(isTerminalCallStatus(status), false);
});

test('call duration formatting is stable and clamps invalid values', () => {
  assert.equal(formatCallDuration(0), '00:00');
  assert.equal(formatCallDuration(9), '00:09');
  assert.equal(formatCallDuration(65), '01:05');
  assert.equal(formatCallDuration(-9), '00:00');
  assert.equal(formatCallDuration(Number.NaN), '00:00');
});

test('call end action cancels only a ringing outgoing invitation and ends accepted calls', () => {
  assert.equal(getCallEndStatus({ reason: 'cancelled', isCaller: true, status: 'ringing' }), 'cancelled');
  assert.equal(getCallEndStatus({ reason: 'cancelled', isCaller: true, status: 'accepted' }), 'ended');
  assert.equal(getCallEndStatus({ reason: 'ended', isCaller: false, status: 'accepted' }), 'ended');
  assert.equal(getCallEndStatus({ reason: 'cancelled', isCaller: false, status: 'ringing' }), 'ended');
});
