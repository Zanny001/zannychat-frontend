import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

const card = fs.readFileSync(new URL('../components/LiveImpactCard.js', import.meta.url), 'utf8');
const profile = fs.readFileSync(new URL('./ProfileScreen.js', import.meta.url), 'utf8');

test('creator account page displays a seven-type reaction collection with accumulated counts', () => {
  for (const reaction of ['heart', 'clap', 'laugh', 'wow', 'fire', 'idea', 'support']) {
    assert.ok(card.includes(`key: '${reaction}'`));
  }
  assert.ok(card.includes('reactionBreakdown'));
  assert.ok(card.includes('REACTION COLLECTION'));
  assert.ok(card.includes('totalReactions.toLocaleString()'));
});

test('creator Impact card shows milestone progress and earned badge collection', () => {
  assert.ok(card.includes('NEXT IMPACT MILESTONE'));
  assert.ok(card.includes('milestoneProgress * 100'));
  assert.ok(card.includes('BADGE COLLECTION'));
  assert.ok(card.includes('Hall of Fame'));
  assert.ok(profile.includes('<LiveImpactCard impact={liveImpact} showEmpty />'));
});
