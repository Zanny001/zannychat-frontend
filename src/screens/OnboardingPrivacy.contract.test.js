import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const onboarding = fs.readFileSync(new URL('./OnboardingScreen.js', import.meta.url), 'utf8');

test('onboarding describes participant access without claiming end-to-end encryption', () => {
  assert.ok(onboarding.includes('Private by default — chat access is limited to approved participants'));
  assert.equal(onboarding.includes('Private — only you and them can open it'), false);
  assert.equal(/end-to-end encrypted/i.test(onboarding), false);
});

test('onboarding uses the Crown Aurora welcome identity without overstating privacy', () => {
  assert.ok(onboarding.includes('YOUR PEOPLE. YOUR MOMENTS.'));
  assert.ok(onboarding.includes('A little closer, every day.'));
  assert.ok(onboarding.includes('MADE FOR REAL CONNECTION'));
  assert.ok(onboarding.includes('GlassCard glow intensity={18}'));
  assert.ok(onboarding.includes('minHeight: 56'));
  assert.ok(onboarding.includes("navigation.navigate('Login')"));
  assert.ok(onboarding.includes("navigation.navigate('Signup')"));
  assert.equal(onboarding.includes('end-to-end encrypted'), false);
});
