import test from 'node:test';
import assert from 'node:assert/strict';
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

test('Crown Aurora dark and light semantic text pairs meet WCAG AA normal-text contrast', () => {
  for (const mode of ['dark', 'light']) {
    const colors = resolveMoodColors(MOODS.royalNeon, mode, false);
    assert.ok(contrast(colors.textPrimary, colors.background) >= 4.5, `${mode} primary text`);
    assert.ok(contrast(colors.textSecondary, colors.background) >= 4.5, `${mode} secondary text`);
    assert.ok(contrast(colors.onPrimary, colors.primary) >= 4.5, `${mode} primary action label`);
    assert.ok(contrast(colors.onAccent, colors.accent) >= 4.5, `${mode} accent label`);
    assert.ok(contrast(colors.bubbleMineText, colors.bubbleMine) >= 4.5, `${mode} outgoing bubble`);
  }
});

test('shared layout tokens preserve the minimum mobile touch target and stepped spacing', () => {
  assert.ok(layout.touchTarget >= 44);
  assert.equal(layout.controlHeight, 48);
  assert.deepEqual(spacing, { xxs: 2, xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 40 });
  assert.deepEqual(radii, { xs: 6, sm: 8, md: 14, lg: 20, xl: 28, pill: 999 });
});
