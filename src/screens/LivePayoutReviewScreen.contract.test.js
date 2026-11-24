const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const screen = fs.readFileSync(path.join(__dirname, 'LivePayoutReviewScreen.js'), 'utf8');
const payoutScreen = fs.readFileSync(path.join(__dirname, 'LiveCreatorPayoutScreen.js'), 'utf8');
const service = fs.readFileSync(path.join(__dirname, '../services/liveEconomyService.js'), 'utf8');
const navigator = fs.readFileSync(path.join(__dirname, '../navigation/AppNavigator.js'), 'utf8');

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
