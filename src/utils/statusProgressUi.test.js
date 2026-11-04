import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const screen = await readFile(new URL('../screens/StatusUpdatesScreen.js', import.meta.url), 'utf8');

test('Status viewer exposes a live accessible progress bar', () => {
  assert.match(screen, /accessibilityRole="progressbar"/);
  assert.match(screen, /accessibilityLabel="Status display progress"/);
  assert.match(screen, /accessibilityValue=\{\{ min: 0, max: 100, now: Math\.round\(statusProgress\) \}\}/);
  assert.match(screen, /getStatusProgressPercent\(Date\.now\(\) - startedAt, duration\)/);
  assert.match(screen, /return \(\) => clearInterval\(interval\)/);
});
