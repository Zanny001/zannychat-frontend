import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../../App.js', import.meta.url), 'utf8');
const boundary = readFileSync(new URL('./AppErrorBoundary.js', import.meta.url), 'utf8');

test('authenticated route changes remount the root navigator with the new initial route', () => {
  assert.match(app, /<AppNavigator\s+key=\{initialRoute\}/);
  assert.match(app, /initialRouteName=\{initialRoute\}/);
  assert.match(app, /isAuthenticated=\{initialRoute === 'Main'\}/);
});

test('root render failures display a recovery screen rather than an unexplained blank page', () => {
  assert.match(app, /<AppErrorBoundary>/);
  assert.match(app, /<\/AppErrorBoundary>/);
  assert.match(boundary, /getDerivedStateFromError/);
  assert.match(boundary, /We couldn’t open your chats/);
  assert.match(boundary, /Reload app/);
  assert.match(boundary, /window\.location\.reload\(\)/);
});
