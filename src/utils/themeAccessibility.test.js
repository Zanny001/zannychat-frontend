import test from 'node:test';
import assert from 'node:assert/strict';
import { MOODS, resolveMoodColors } from '../theme/colors.js';
import { createCustomMood } from '../theme/customPalette.js';

function relativeLuminance(hex) {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground, background) {
  const values = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('light theme uses light surfaces and dark readable text', () => {
  const colors = resolveMoodColors(MOODS.ember, 'light');
  assert.equal(colors.background, '#F7F8FC');
  assert.equal(colors.surface, '#FFFFFF');
  assert.equal(colors.textPrimary, '#171925');
  assert.ok(contrastRatio(colors.onPrimary, colors.primary) >= 4.5);
  assert.equal(colors.onPrimary, '#FFFFFF');
});

test('dark theme retains the selected mood palette', () => {
  const colors = resolveMoodColors(MOODS.tide, 'dark');
  assert.equal(colors.background, MOODS.tide.ink);
  assert.equal(colors.textPrimary, MOODS.tide.paper);
  assert.equal(colors.primary, MOODS.tide.signal);
  assert.equal(colors.onPrimary, MOODS.tide.ink);
  assert.ok(contrastRatio(colors.onPrimary, colors.primary) >= 4.5);
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
  assert.equal(colors.bubbleMineText, '#171925');
  assert.equal(colors.bubbleMineMeta, '#414658');
  assert.ok(contrastRatio(colors.bubbleMineText, colors.bubbleMine) >= 4.5);
  assert.ok(contrastRatio(colors.bubbleMineMeta, colors.bubbleMine) >= 4.5);
});

test('outgoing message text uses a readable dark foreground on dark signal bubbles', () => {
  const colors = resolveMoodColors(MOODS.ember, 'dark');
  assert.equal(colors.bubbleMineText, MOODS.ember.ink);
  assert.equal(colors.bubbleMineMeta, MOODS.ember.inkRaised);
  assert.ok(contrastRatio(colors.bubbleMineText, colors.bubbleMine) >= 4.5);
  assert.ok(contrastRatio(colors.bubbleMineMeta, colors.bubbleMine) >= 4.5);
});

test('danger actions retain readable foregrounds across every preset and appearance', () => {
  for (const mood of Object.values(MOODS)) {
    for (const mode of ['light', 'dark']) {
      const colors = resolveMoodColors(mood, mode);
      assert.ok(contrastRatio(colors.onDanger, colors.danger) >= 4.5, `${mood.key} ${mode} danger action`);
    }
  }
});


test('primary and accent actions retain readable foregrounds across every preset and appearance', () => {
  for (const mood of Object.values(MOODS)) {
    for (const mode of ['light', 'dark']) {
      const colors = resolveMoodColors(mood, mode);
      assert.ok(contrastRatio(colors.onPrimary, colors.primary) >= 4.5, `${mood.key} ${mode} primary action`);
      assert.ok(contrastRatio(colors.onAccent, colors.accent) >= 4.5, `${mood.key} ${mode} accent action`);
    }
  }
});

test('custom user colours retain readable action foregrounds in both appearances', () => {
  const mood = createCustomMood({ signal: '#7C60FF', thread: '#39E7E0', gold: '#FFD58A' });
  assert.ok(mood);
  for (const mode of ['light', 'dark']) {
    const colors = resolveMoodColors(mood, mode);
    assert.ok(contrastRatio(colors.onPrimary, colors.primary) >= 4.5, `${mode} custom primary action`);
    assert.ok(contrastRatio(colors.onAccent, colors.accent) >= 4.5, `${mode} custom accent action`);
    assert.ok(contrastRatio(colors.onDanger, colors.danger) >= 4.5, `${mode} custom danger action`);
  }
});
