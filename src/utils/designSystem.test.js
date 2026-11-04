import test from 'node:test';
import assert from 'node:assert/strict';
import { MOODS, DEFAULT_MOOD_KEY, resolveMoodColors, spacing, radii, layout, elevation } from '../theme/colors.js';
import { typography } from '../theme/typography.js';

test('every mood resolves the semantic tokens required by shared components', () => {
  for (const mood of Object.values(MOODS)) {
    const colors = resolveMoodColors(mood);
    for (const token of ['background', 'surface', 'surfaceElevated', 'primary', 'accent', 'textPrimary', 'textSecondary', 'border', 'danger', 'success', 'warning', 'focusRing', 'shadow']) {
      assert.match(colors[token], /^#[0-9A-Fa-f]{6}$/ , `${mood.key}.${token} should be a hex color`);
    }
  }
  assert.ok(MOODS[DEFAULT_MOOD_KEY]);
});

test('shared spacing and radius tokens are positive and ordered', () => {
  assert.ok(spacing.xs < spacing.sm && spacing.sm < spacing.md && spacing.md < spacing.lg && spacing.lg < spacing.xl);
  assert.ok(radii.xs < radii.sm && radii.sm < radii.md && radii.md < radii.lg && radii.lg < radii.xl);
});

test('shared mobile layout uses accessible touch targets and sensible content width', () => {
  assert.ok(layout.touchTarget >= 44);
  assert.ok(layout.controlHeight >= layout.touchTarget);
  assert.ok(layout.headerHeight >= 56);
  assert.ok(layout.contentMaxWidth >= 600);
  assert.ok(elevation.card.android >= 1 && elevation.raised.android >= elevation.card.android);
});

test('typography provides readable body and caption sizes', () => {
  assert.ok(typography.body.fontSize >= 16);
  assert.ok(typography.body.lineHeight >= typography.body.fontSize * 1.4);
  assert.ok(typography.caption.fontSize >= 13);
  assert.ok(typography.small.fontSize >= 12);
});
