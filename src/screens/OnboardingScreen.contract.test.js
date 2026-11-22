import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('./OnboardingScreen.js', import.meta.url), 'utf8');

test('onboarding establishes the Crown Aurora identity with a focused, responsive hero', () => {
  assert.match(screen, /A MORE THOUGHTFUL WAY TO CONNECT/);
  assert.match(screen, /Knot size=\{116\}[^>]*animated/);
  assert.match(screen, /Your people\. Your moments\. Your space\./);
  assert.match(screen, /layout\.formMaxWidth/);
  assert.match(screen, /width: '100%'/);
});

test('onboarding presents the existing product capabilities in a restrained premium surface', () => {
  assert.match(screen, /GlassCard intensity=\{18\}/);
  assert.match(screen, /MADE FOR YOUR EVERYDAY/);
  for (const capability of [
    'Private by default — chat access is limited to approved participants',
    'Group chats, voice notes & real attachments',
    'Smart replies, translation & summaries',
    "A theme that's actually got range",
  ]) assert.ok(screen.includes(capability), capability);
});

test('onboarding keeps sign-in and signup navigation with accessible primary actions', () => {
  assert.match(screen, /navigation\.navigate\('Login'\)/);
  assert.match(screen, /navigation\.navigate\('Signup'\)/);
  assert.match(screen, /accessibilityLabel="Get started and sign in"/);
  assert.match(screen, /accessibilityLabel="Create a new account"/);
  assert.match(screen, /minHeight: 56/);
});
