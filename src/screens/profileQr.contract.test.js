import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const editProfile = fs.readFileSync(path.join(root, 'src/screens/EditProfileScreen.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'src/services/api.js'), 'utf8');
const qrScreen = fs.readFileSync(path.join(root, 'src/screens/QRContactScreen.js'), 'utf8');

test('profile field and section components are stable module-level component types', () => {
  const screenStart = editProfile.indexOf('export default function EditProfileScreen');
  assert.ok(screenStart > 0, 'profile screen component exists');
  assert.ok(editProfile.indexOf('function Section(') < screenStart, 'Section is declared outside the screen');
  assert.ok(editProfile.indexOf('function Field(') < screenStart, 'Field is declared outside the screen');
  const screenBody = editProfile.slice(screenStart);
  assert.doesNotMatch(screenBody, /function\s+(Section|Field)\s*\(/);
  assert.match(screenBody, /<Field[\s\S]*?onChangeText=/);
});

test('QR contact resolution uses public profile lookup, not shared-conversation directory', () => {
  const start = api.indexOf('export async function fetchContactById');
  const end = api.indexOf('\nexport ', start + 10);
  const resolver = api.slice(start, end > 0 ? end : undefined);
  assert.match(resolver, /rpc\('get_public_profile_by_id'/);
  assert.doesNotMatch(resolver, /rpc\('get_contact_directory'/);
});

test('QR scanner validates payload, resolves a profile, and starts a conversation', () => {
  assert.match(qrScreen, /parseContactQr\(data\)/);
  assert.match(qrScreen, /fetchContactById\(userId\)/);
  assert.match(qrScreen, /createConversation\(contact\.id, contact\)/);
  assert.match(qrScreen, /navigation\.replace\('Chat', \{ conversation \}\)/);
  assert.match(qrScreen, /handledRef\.current/);
});
