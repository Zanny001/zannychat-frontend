import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../screens/ContactDiscoveryScreen.js', import.meta.url), 'utf8');

test('contact discovery clears selected contact data when the screen loses focus', () => {
  assert.match(source, /useFocusEffect\(useCallback\(/);
  assert.match(source, /screenActive\.current = false/);
  assert.match(source, /setPhones\(''\)/);
  assert.match(source, /setImportedContacts\(\[\]\)/);
  assert.match(source, /setMatches\(\[\]\)/);
});

test('contact import and matching ignore results that resolve after the screen blurs', () => {
  assert.match(source, /if \(!screenActive\.current \|\| screenEpoch\.current !== requestEpoch\) return;/);
  assert.match(source, /if \(screenActive\.current && screenEpoch\.current === requestEpoch\) setError/);
  assert.match(source, /finally \{ if \(screenActive\.current && screenEpoch\.current === requestEpoch\) setMatching\(false\); \}/);
});

test('contact discovery does not persist raw imported contacts to device storage', () => {
  assert.equal(source.includes('AsyncStorage.setItem('), false);
  assert.match(source, /Only numbers you select and submit are sent for matching/);
});


test('contact discovery invalidates stale async work across blur and refocus and resets busy flags', () => {
  assert.match(source, /screenEpoch = useRef\(0\)/);
  assert.match(source, /screenEpoch\.current \+= 1/);
  assert.match(source, /screenEpoch\.current !== requestEpoch/);
  assert.match(source, /setImporting\(false\)/);
  assert.match(source, /setMatching\(false\)/);
});
