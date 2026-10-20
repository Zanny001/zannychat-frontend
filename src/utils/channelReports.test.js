import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const screen = fs.readFileSync(path.join(here, '../screens/ChannelsScreen.js'), 'utf8');
const api = fs.readFileSync(path.join(here, '../services/api.js'), 'utf8');
test('channel post reporting exposes reason choices and submits through the backend API', () => {
  assert.match(screen, /Report channel post/);
  assert.match(screen, /'harassment'/);
  assert.match(screen, /'misinformation'/);
  assert.match(screen, /reportChannelPost\(selected\.id, post\.id, reason\)/);
  assert.match(api, /export async function reportChannelPost/);
});
test('channel owners and moderators can review and resolve open reports', () => {
  assert.match(screen, /Review reports/);
  assert.match(screen, /Mark reviewed/);
  assert.match(screen, /Dismiss/);
  assert.match(api, /export async function fetchChannelPostReports/);
  assert.match(api, /export async function updateChannelPostReport/);
});
