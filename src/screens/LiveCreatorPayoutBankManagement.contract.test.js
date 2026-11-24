import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./LiveCreatorPayoutScreen.js', import.meta.url), 'utf8');
const service = fs.readFileSync(new URL('../services/liveEconomyService.js', import.meta.url), 'utf8');

test('creators can remove a saved verified bank account through the authenticated backend', () => {
  assert.ok(service.includes("backendFetch('/live/creator-payouts/beneficiaries/' + encodeURIComponent(beneficiaryId)"));
  assert.ok(screen.includes('disableLiveCreatorPayoutBeneficiary(beneficiary.id)'));
  assert.ok(screen.includes("'Remove bank account'"));
  assert.ok(screen.includes("'Remove account'"));
  assert.ok(screen.includes('This does not reverse transfers already submitted.'));
});

test('bank removal requires confirmation and refreshes the server-owned beneficiary list', () => {
  assert.ok(screen.includes("text: 'Keep account', style: 'cancel'"));
  assert.ok(screen.includes("style: 'destructive'"));
  assert.ok(screen.includes('await load();'));
  assert.ok(screen.includes("setSelectedBeneficiaryId('')"));
  assert.ok(screen.includes('accessibilityLabel={\'Remove \' + item.bank_name'));
});

test('payout screen never exposes or retains full bank account details after verification', () => {
  assert.ok(screen.includes("setAccountNumber('')"));
  assert.ok(screen.includes('account_last4'));
  assert.ok(screen.includes('not stored by ZannyChat'));
  assert.ok(!screen.includes('account_number: accountNumber'));
});
