import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const screen = fs.readFileSync(new URL('../screens/StatusUpdatesScreen.js', import.meta.url), 'utf8');
test('status viewer provides accessible previous and next navigation', () => {
  assert.match(screen, /accessibilityLabel="Previous status"/);
  assert.match(screen, /accessibilityLabel="Next status"/);
  assert.match(screen, /getAdjacentStoryStatus\(statuses, viewing\.id, -1\)/);
  assert.match(screen, /getAdjacentStoryStatus\(statuses, viewing\.id, 1\)/);
});

test('status viewer automatically advances after content-specific dwell time', () => {
  assert.match(screen, /getStatusDurationMs\(viewing, statusDurations\)/);
  assert.match(screen, /setTimeout\(\(\) =>/);
  assert.match(screen, /return \(\) => clearTimeout\(timer\)/);
  assert.match(screen, /if \(adjacent\) openStatus\(adjacent\);\s*else setViewing\(null\)/);
});

test('status viewer can pause and resume automatic progression accessibly', () => {
  assert.match(screen, /Pause automatic status progression/);
  assert.match(screen, /Resume automatic status progression/);
  assert.match(screen, /if \(!viewing\?\.id \|\| statusPaused \|\| mediaNeedsRecovery\) return undefined/);
  assert.match(screen, /paused=\{statusPaused\}/);
  assert.match(screen, /Automatic progression paused/);
});

test('status viewer lets users adjust and persist per-type display duration', () => {
  assert.match(screen, /zannychat\.status-duration-preferences\.v1/);
  assert.match(screen, /Decrease this Status display duration by five seconds/);
  assert.match(screen, /Increase this Status display duration by five seconds/);
  assert.match(screen, /getStatusDurationMs\(viewing, statusDurations\)/);
});
