import test from 'node:test';
import assert from 'node:assert/strict';
import { getIceNetworkNotice } from './callNetworkStatus.js';

test('no warning when TURN credentials are configured', () => {
  assert.equal(getIceNetworkNotice({ turnConfigured: true }), '');
});

test('STUN-only configuration warns about limited network compatibility', () => {
  assert.match(getIceNetworkNotice({ turnConfigured: false }), /TURN relay is not configured/i);
  assert.match(getIceNetworkNotice({ turnConfigured: false }), /Some networks may not connect/i);
});

test('missing or unrecognized configuration reports an unverified relay status', () => {
  assert.match(getIceNetworkNotice(null), /could not be checked/i);
  assert.match(getIceNetworkNotice({ iceServers: [] }), /could not be checked/i);
});
