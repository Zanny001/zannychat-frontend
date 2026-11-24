import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./LiveRewardPolicyAdminScreen.js', import.meta.url), 'utf8');
const payout = fs.readFileSync(new URL('./LiveCreatorPayoutScreen.js', import.meta.url), 'utf8');
const service = fs.readFileSync(new URL('../services/liveEconomyService.js', import.meta.url), 'utf8');
const navigator = fs.readFileSync(new URL('../navigation/AppNavigator.js', import.meta.url), 'utf8');

test('reward policy controls are connected to the server-owned admin API', () => {
  assert.match(service, /getLiveCreatorRewardRules/);
  assert.match(service, /createLiveCreatorRewardRule/);
  assert.match(service, /activateLiveCreatorRewardRule/);
  assert.match(payout, /getLiveCreatorRewardPolicyAccess/);
  assert.match(payout, /canManageRewardPolicy/);
  assert.match(navigator, /name="LiveRewardPolicyAdmin"/);
});

test('policy drafts require explicit commercial inputs and remain inactive until activation', () => {
  assert.match(screen, /creatorShareBps: shareBps/);
  assert.match(screen, /clearanceHours/);
  assert.match(screen, /minimumWithdrawalMinor: minimumMinor/);
  assert.match(screen, /Inactive reward policy draft created/);
  assert.match(screen, /Save inactive draft/);
});

test('activation requires a deliberate confirmation and warns that existing earnings retain their rule', () => {
  assert.match(screen, /Alert\.alert\(/);
  assert.match(screen, /Confirm that the commercial terms have been approved/);
  assert.match(screen, /Existing earnings retain their original rule/);
  assert.match(service, /ACTIVATE_CREATOR_REWARD_RULE/);
});

test('admin UI does not imply that reward policy activation enables withdrawals', () => {
  assert.match(screen, /does not verify creators, reconcile Apple fees, enable Paystack transfers/);
});
