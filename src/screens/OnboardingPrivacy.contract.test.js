import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const onboarding = fs.readFileSync(new URL('./OnboardingScreen.js', import.meta.url), 'utf8');

test('onboarding describes participant access without claiming end-to-end encryption', () => {
  assert.ok(onboarding.includes('Private by default — chat access is limited to approved participants'));
  assert.equal(onboarding.includes('Private — only you and them can open it'), false);
  assert.equal(/end-to-end encrypted/i.test(onboarding), false);
});
