import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('./ChatAppearanceScreen.js', import.meta.url), 'utf8');
const service = readFileSync(new URL('../services/chatAppearance.js', import.meta.url), 'utf8');

test('chat canvas persistence failures are propagated instead of reported as saved', () => {
  assert.match(service, /catch \(error\) \{[\s\S]*?throw error;[\s\S]*?\}/);
  assert.match(screen, /await saveChatCanvas\(key\);[\s\S]*?setSaveConfirmed\(true\)/);
  assert.match(screen, /catch \(_\) \{[\s\S]*?setSaveError\(/);
});

test('chat appearance disables competing selections while saving and exposes an accessible error', () => {
  assert.match(screen, /disabled=\{saving\}/);
  assert.ok(screen.includes('accessibilityState={{ checked: active, disabled: saving }}'));
  assert.match(screen, /accessibilityRole=\{saveError \? 'alert' : undefined\}/);
  assert.ok(screen.includes('active for this session, but could not be saved on this device'));
});

test('chat canvas choices remain accessible radio options', () => {
  assert.ok(screen.includes('accessibilityRole="radio"'));
});

test('chat canvas load failures are visible and offer a retry path', () => {
  assert.match(service, /getChatCanvasLoadError/);
  assert.match(service, /Saved chat appearance could not be loaded from this device/);
  assert.match(screen, /setLoadError\(getChatCanvasLoadError\(\)\)/);
  assert.match(screen, /saveError \|\| loadError \? 'alert'/);
  assert.match(screen, /Retry loading saved appearance/);
  assert.match(screen, /onPress=\{retryLoad\}/);
});
