import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const callsSource = readFileSync(new URL('./calls.js', import.meta.url), 'utf8');
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
  assert.match(callsSource, /backendFetch\(['"]\/calls\/history\//);
  assert.match(callsSource, /export async function listCallHistory/);
});
