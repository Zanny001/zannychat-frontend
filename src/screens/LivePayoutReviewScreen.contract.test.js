import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./LivePayoutReviewScreen.js', import.meta.url), 'utf8');
const payoutScreen = fs.readFileSync(new URL('./LiveCreatorPayoutScreen.js', import.meta.url), 'utf8');
const service = fs.readFileSync(new URL('../services/liveEconomyService.js', import.meta.url), 'utf8');
const navigator = fs.readFileSync(new URL('../navigation/AppNavigator.js', import.meta.url), 'utf8');

test('payout review queue is only exposed to users authorized by the backend access probe', () => {
  assert.match(service, /getLiveCreatorPayoutReviewAccess/);
  assert.match(payoutScreen, /results\[5\]\.value\?\.isAdmin === true/);
  assert.match(payoutScreen, /canReviewPayouts \? /);
  assert.match(navigator, /name="LivePayoutReview"/);
});

test('review decisions use the authenticated backend service and require external evidence for approval', () => {
  assert.match(service, /reviewLiveCreatorPayoutProfile/);
  assert.match(screen, /verificationProvider/);
  assert.match(screen, /verificationReference/);
  assert.match(screen, /draft\.reference\.trim\(\)/);
  assert.match(screen, /reviewLiveCreatorPayoutProfile\(item\.creator_id/);
});

test('review UI explicitly prohibits entering raw identity documents or BVN/NIN values', () => {
  assert.match(screen, /never enter or upload BVN\/NIN numbers/);
  assert.match(screen, /External case\/reference ID only — no BVN\/NIN/);
});
