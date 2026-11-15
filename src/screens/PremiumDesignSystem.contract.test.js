import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_MOOD_KEY, MOODS, resolveMoodColors, layout, spacing, radii } from '../theme/colors.js';

function luminance(hex) {
  const values = String(hex).replace('#', '').match(/.{2}/g).map((part) => parseInt(part, 16) / 255);
  const linear = values.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(a, b) {
  const pair = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (pair[0] + 0.05) / (pair[1] + 0.05);
}

test('Crown Aurora is the stable default ZannyChat palette', () => {
  assert.equal(DEFAULT_MOOD_KEY, 'royalNeon');
  assert.equal(MOODS.royalNeon.key, 'royalNeon');
  assert.equal(MOODS.royalNeon.label, 'Crown Aurora');
  assert.deepEqual(
    [MOODS.royalNeon.ink, MOODS.royalNeon.inkRaised, MOODS.royalNeon.inkRaisedAlt,
      MOODS.royalNeon.signal, MOODS.royalNeon.thread, MOODS.royalNeon.gold],
    ['#070A1A', '#0E1330', '#161C42', '#6A4DFF', '#38BDF8', '#F3B94D']
  );
});

test('every selectable mood maintains WCAG AA semantic contrast in light and dark modes', () => {
  for (const mood of Object.values(MOODS)) {
    for (const mode of ['dark', 'light']) {
      for (const highContrast of [false, true]) {
        const colors = resolveMoodColors(mood, mode, highContrast);
        const context = `${mood.key}/${mode}/highContrast=${highContrast}`;
        for (const surface of [colors.background, colors.surface, colors.surfaceAlt]) {
          assert.ok(contrast(colors.textPrimary, surface) >= 4.5, `${context} primary text on ${surface}`);
          assert.ok(contrast(colors.textSecondary, surface) >= 4.5, `${context} secondary text on ${surface}`);
        }
        assert.ok(contrast(colors.onPrimary, colors.primary) >= 4.5, `${context} primary action label`);
        assert.ok(contrast(colors.onAccent, colors.accent) >= 4.5, `${context} accent label`);
        assert.ok(contrast(colors.bubbleMineText, colors.bubbleMine) >= 4.5, `${context} outgoing bubble`);
      }
    }
  }
});

test('shared layout tokens preserve the minimum mobile touch target and stepped spacing', () => {
  assert.ok(layout.touchTarget >= 44);
  assert.equal(layout.controlHeight, 48);
  assert.deepEqual(spacing, { xxs: 2, xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 40 });
  assert.deepEqual(radii, { xs: 6, sm: 8, md: 14, lg: 20, xl: 28, pill: 999 });
});


test('chat composer uses a raised, readable, moderately rounded input surface', () => {
  const source = readFileSync(new URL('../components/InputBar.js', import.meta.url), 'utf8');
  assert.match(source, /backgroundColor: colors\.surfaceElevated/);
  assert.match(source, /borderRadius: 20/);
  assert.match(source, /minHeight: 52/);
  assert.match(source, /accessibilityLabel={editing \? 'Edit message text' : 'Message text'}/);
  // Keep the draft, edit, reply, emoji and voice-recording paths in the shared composer.
  for (const feature of ['loadDraft(draftKey)', 'clearDraft(draftKey)', 'onCancelReply', 'onCancelEdit', 'onStartRecording', 'onStopRecording']) {
    assert.ok(source.includes(feature), `composer must preserve ${feature}`);
  }
});
