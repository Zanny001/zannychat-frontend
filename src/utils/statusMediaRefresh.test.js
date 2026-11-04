import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const service = await readFile(new URL('../services/statusUpdates.js', import.meta.url), 'utf8');
const screen = await readFile(new URL('../screens/StatusUpdatesScreen.js', import.meta.url), 'utf8');

test('status media URL refresh rechecks the active status through database row policies', () => {
  assert.match(service, /export async function refreshStatusMediaUrl\(statusId\)/);
  assert.match(service, /from\('status_updates'\)[\s\S]*?\.select\('id,user_id,media_kind,media_path,expires_at'\)[\s\S]*?\.eq\('id', statusId\)\.gt\('expires_at', new Date\(\)\.toISOString\(\)\)\.maybeSingle\(\)/);
  assert.match(service, /createSignedUrl\(row\.media_path, 300\)/);
  assert.match(service, /This status media is no longer available/);
});

test('opening a photo or video refreshes its URL without overwriting a different story', () => {
  assert.match(screen, /refreshStatusMediaUrl\(item\.id\)\.then\(\(media_url\) =>/);
  assert.match(screen, /current\?\.id === item\.id \? \{ \.\.\.current, media_url \} : current/);
  assert.match(screen, /Keep the feed's existing URL as a fallback/);
});
