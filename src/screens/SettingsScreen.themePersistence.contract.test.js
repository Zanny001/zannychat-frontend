import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const theme = readFileSync(new URL('../theme/ThemeContext.js', import.meta.url), 'utf8');
const settings = readFileSync(new URL('./SettingsScreen.js', import.meta.url), 'utf8');

test('theme preference storage failures are surfaced instead of silently swallowed', () => {
  assert.match(theme, /const persist = async \(write, key\) =>/);
  assert.match(theme, /failedPreferencesRef\.current\.add\(key\)/);
  assert.match(theme, /failedPreferencesRef\.current\.delete\(key\)/);
  assert.match(theme, /Your preferences are active for this session, but could not be saved on this device/);
  assert.match(theme, /void persist\(\(\) => AsyncStorage\.setItem\(MOOD_STORAGE_KEY, key\), 'mood'\)/);
  assert.match(theme, /void persist\(\(\) => AsyncStorage\.setItem\(APPEARANCE_STORAGE_KEY, mode\), 'appearance'\)/);
  assert.match(theme, /void persist\(\(\) => AsyncStorage\.multiSet\(/);
  assert.match(theme, /reportPreferenceLoadIssue = \(\) =>/);
  assert.match(theme, /Some saved appearance preferences could not be read from this device/);
  assert.match(theme, /\.catch\(\(\) => \{\s*if \(active\) \{\s*failedPreferencesRef\.current\.add\('load'\)/);
});

test('settings exposes a dismissible accessible warning for preference persistence failures', () => {
  assert.match(settings, /persistenceError \?/);
  assert.match(settings, /accessibilityRole="alert"/);
  assert.match(settings, /accessibilityLiveRegion="polite"/);
  assert.match(settings, /clearPersistenceError/);
  assert.match(settings, /Dismiss preference storage warning/);
});

test('theme preference reads cannot overwrite a newer user selection', () => {
  assert.match(theme, /const revisionAtStart = \{ \.\.\.preferenceRevisionRef\.current \}/);
  assert.match(theme, /revisionAtStart\.mood === preferenceRevisionRef\.current\.mood/);
  assert.match(theme, /revisionAtStart\.appearance === preferenceRevisionRef\.current\.appearance/);
  assert.match(theme, /revisionAtStart\.accessibility === preferenceRevisionRef\.current\.accessibility/);
  assert.match(theme, /preferenceRevisionRef\.current\.customPalette \+= 1/);
  assert.match(theme, /const accessibilityPreferencesRef = useRef\(\{ textScale: 'standard', highContrast: false \}\)/);
  assert.match(theme, /const nextPreferences = \{ \.\.\.accessibilityPreferencesRef\.current, textScale: scaleKey \}/);
  assert.match(theme, /const nextPreferences = \{ \.\.\.accessibilityPreferencesRef\.current, highContrast: Boolean\(enabled\) \}/);
});
