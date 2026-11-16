import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const screen = fs.readFileSync(path.join(process.cwd(), 'src/screens/LiveHubScreen.js'), 'utf8');

test('LIVE Hub distinguishes replay service errors from an empty replay library', () => {
  assert.match(screen, /backendFetch\('\/live\/replays'\)\.then\(\(result\) => \(\{ result, error: null \}\)\)/);
  assert.match(screen, /setReplayError\(replayResult\?\.error/);
  assert.match(screen, /Replays could not load/);
  assert.match(screen, /LIVE replays are temporarily unavailable/);
  assert.match(screen, /Retry loading LIVE replays/);
});

test('LIVE Hub explains the empty replay state and seven-day availability', () => {
  assert.match(screen, /No saved LIVE replays yet/);
  assert.match(screen, /Completed recordings will appear here and remain available for seven days/);
  assert.match(screen, /replays\.length === 0/);
});
