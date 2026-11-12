import test from 'node:test';
import assert from 'node:assert/strict';
import { MOODS, resolveMoodColors } from '../theme/colors.js';

test('light theme uses light surfaces and dark readable text', () => {
  const colors = resolveMoodColors(MOODS.ember, 'light');
  assert.equal(colors.background, '#F7F8FC');
  assert.equal(colors.surface, '#FFFFFF');
  assert.equal(colors.textPrimary, '#171925');
  assert.equal(colors.primary, '#B93825');
  assert.equal(colors.onPrimary, '#FFFFFF');
});

test('dark theme retains the selected mood palette', () => {
  const colors = resolveMoodColors(MOODS.tide, 'dark');
  assert.equal(colors.background, MOODS.tide.ink);
  assert.equal(colors.textPrimary, MOODS.tide.paper);
  assert.equal(colors.primary, MOODS.tide.signal);
  assert.equal(colors.onPrimary, MOODS.tide.ink);
});

test('high contrast strengthens secondary text and boundaries in both modes', () => {
  const light = resolveMoodColors(MOODS.ember, 'light', true);
  const standardLight = resolveMoodColors(MOODS.ember, 'light', false);
  const dark = resolveMoodColors(MOODS.ember, 'dark', true);
  const standardDark = resolveMoodColors(MOODS.ember, 'dark', false);
  assert.notEqual(light.textSecondary, standardLight.textSecondary);
  assert.notEqual(light.border, standardLight.border);
  assert.notEqual(dark.textSecondary, standardDark.textSecondary);
  assert.notEqual(dark.border, standardDark.border);
});

test('outgoing message text has strong contrast against the light bubble surface', () => {
  const colors = resolveMoodColors(MOODS.ember, 'light');
  assert.equal(colors.bubbleMine, '#FFE4DC');
  assert.equal(colors.bubbleMineText, '#512018');
  assert.equal(colors.bubbleMineMeta, '#744238');
});

test('outgoing message text uses a readable dark foreground on dark signal bubbles', () => {
  const colors = resolveMoodColors(MOODS.ember, 'dark');
  assert.equal(colors.bubbleMineText, MOODS.ember.ink);
  assert.equal(colors.bubbleMineMeta, MOODS.ember.inkRaised);
});
