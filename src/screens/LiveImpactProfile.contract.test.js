import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ownProfile = fs.readFileSync(new URL('./ProfileScreen.js', import.meta.url), 'utf8');
const peerProfile = fs.readFileSync(new URL('./PeerProfileScreen.js', import.meta.url), 'utf8');
const impactCard = fs.readFileSync(new URL('../components/LiveImpactCard.js', import.meta.url), 'utf8');

test('own profile loads and displays the authenticated creator LIVE impact summary', () => {
  assert.ok(ownProfile.includes("backendFetch(`/live/creators/${currentUser.id}/impact`)"));
  assert.ok(ownProfile.includes('<LiveImpactCard impact={liveImpact} showEmpty />'));
  assert.ok(ownProfile.includes('let active = true'));
});

test('peer profile requests only the backend privacy-filtered creator impact endpoint', () => {
  assert.ok(peerProfile.includes("backendFetch(`/live/creators/${userId}/impact`)"));
  assert.ok(peerProfile.includes('<LiveImpactCard impact={liveImpact} />'));
  assert.ok(peerProfile.includes('participant.id || participant.user_id'));
});

test('LIVE impact card separates impact points, raw reactions and unique supporters', () => {
  assert.ok(impactCard.includes('Impact points'));
  assert.ok(impactCard.includes('Reactions'));
  assert.ok(impactCard.includes('Supporters'));
  assert.ok(impactCard.includes('One point per unique supporter each UTC day'));
  assert.ok(impactCard.includes('badges.map'));
});
