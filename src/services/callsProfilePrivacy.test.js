import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const callsSource = readFileSync(new URL('./calls.js', import.meta.url), 'utf8');
const callHistoryScreenSource = readFileSync(new URL('../screens/CallHistoryScreen.js', import.meta.url), 'utf8');
const historyStart = callsSource.indexOf('export async function listCallHistory');
const historyEnd = callsSource.indexOf('export async function hideCallHistory');
const historySource = callsSource.slice(historyStart, historyEnd);

test('call history uses the privacy-scoped profile directory RPC', () => {
  assert.ok(historyStart >= 0 && historyEnd > historyStart, 'call history service must remain present');
  assert.match(historySource, /supabase\.rpc\(\s*['"]get_conversation_profile_directory['"]/);
  assert.match(historySource, /p_user_ids:\s*peerIds/);
  assert.match(historySource, /resolveProfileAvatarUrls\(profiles\s*\|\|\s*\[\]\)/);
  assert.doesNotMatch(historySource, /\.from\(['"]profiles['"]\)/);
});

test('call history keeps redial and per-user deletion service actions', () => {
  assert.match(callsSource, /export async function hideCallHistory/);
  assert.match(callsSource, /backendFetch\(\s*[`'"]\/calls\/history\//);
  assert.match(callsSource, /export async function listCallHistory/);
});

test('call history exposes audio redial, video redial and per-user delete actions', () => {
  assert.match(callHistoryScreenSource, /redialCall\(item, peerUserId, 'audio'\)/);
  assert.match(callHistoryScreenSource, /redialCall\(item, peerUserId, 'video'\)/);
  assert.match(callHistoryScreenSource, /navigation\.navigate\('GroupCall'/);
  assert.match(callHistoryScreenSource, /removeCall\(item\)/);
  assert.match(callHistoryScreenSource, /await hideCallHistory\(item\)/);
});
