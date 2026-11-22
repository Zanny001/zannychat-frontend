import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./QRContactScreen.js', import.meta.url), 'utf8');

test('QR contact screen presents a premium identity-sharing introduction', () => {
  assert.ok(source.includes('YOUR IDENTITY, IN ONE SCAN'));
  assert.ok(source.includes('Make the introduction effortless.'));
  assert.ok(source.includes('The code contains only your public profile ID'));
  assert.ok(source.includes('buildContactQr(user.id)'));
});

test('QR contact flow retains camera permission and secure contact lookup', () => {
  assert.ok(source.includes('useCameraPermissions()'));
  assert.ok(source.includes('requestPermission()'));
  assert.ok(source.includes('parseContactQr(data)'));
  assert.ok(source.includes('fetchContactById(userId)'));
  assert.ok(source.includes('createConversation(contact.id, contact)'));
  assert.ok(source.includes("navigation.replace('Chat', { conversation })"));
});

test('QR scan action remains accessible and processing-aware', () => {
  assert.ok(source.includes('accessibilityLabel={scanning ? \'Stop scanning\' : \'Scan a contact QR code\'}'));
  assert.ok(source.includes('accessibilityState={{ disabled: processing || loadingUser, busy: processing }}'));
  assert.ok(source.includes('Meet someone new'));
});
