import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('media preference storage failures are surfaced instead of silently reported as saved', () => {
  const service = read('../services/mediaPreferences.js');
  assert.match(service, /throw new Error\('Media preferences could not be loaded/);
  assert.match(service, /throw new Error\('Your media preferences are active for this session, but could not be saved/);
  assert.doesNotMatch(service, /catch \(_\) \{\s*\/\/ Keep the current in-memory preference; the UI can still operate this session\.\s*\}/);
});

test('Data & storage exposes session-only state and a retry action after persistence failure', () => {
  const screen = read('./DataStorageScreen.js');
  assert.match(screen, /loadMediaPreferences\(\)[\s\S]*?\.catch\(\(error\) =>/);
  assert.match(screen, /getMediaPreferences\(\)/);
  assert.match(screen, /SESSION ONLY · NOT SAVED/);
  assert.match(screen, /accessibilityRole="alert"/);
  assert.match(screen, /onPress=\{\(\) => update\(\{\}\)\}/);
  assert.match(screen, /Try saving again/);
  assert.match(screen, /maxWidth: layout\.contentMaxWidth/);
});


test('Data & storage retry control meets the shared 48-point mobile target', () => {
  assert.match(read('./DataStorageScreen.js'), /retryButton: \{ minHeight: 48/);
});
