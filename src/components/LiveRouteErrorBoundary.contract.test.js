import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const navigation = fs.readFileSync(new URL('../navigation/AppNavigator.js', import.meta.url), 'utf8');
const liveBoundary = fs.readFileSync(new URL('./LiveRouteErrorBoundary.js', import.meta.url), 'utf8');
const callBoundary = fs.readFileSync(new URL('./CallRouteErrorBoundary.js', import.meta.url), 'utf8');
const appBoundary = fs.readFileSync(new URL('./AppErrorBoundary.js', import.meta.url), 'utf8');
const reporter = fs.readFileSync(new URL('../services/clientDiagnostics.js', import.meta.url), 'utf8');

test('all LIVE entry and management routes are isolated from the root chats boundary', () => {
  for (const route of [
    'LiveHub', 'LivePreflight', 'LiveStream', 'LiveReplay', 'LiveCreatorStudio',
    'LiveCreatorProfile', 'LiveReplayLibrary', 'LiveGuestQueue', 'LiveModeration',
    'LiveReports', 'LiveAnalytics', 'LivePostStreamSummary', 'LiveLeaderboard',
    'LiveSettings', 'LiveEvents',
  ]) {
    assert.ok(navigation.includes("withLiveRouteBoundary("), 'LIVE route wrapper is registered');
    assert.ok(navigation.includes("'" + route + "'"), 'missing LIVE boundary for ' + route);
  }
  assert.match(navigation, /name="LiveStream" component={LiveStreamRoute}/);
  assert.match(navigation, /name="LivePreflight" component={LivePreflightRoute}/);
  assert.match(navigation, /name="LIVE" component={LiveHubRoute}/);
});

test('root, call and LIVE render boundaries report safe diagnostics without blocking recovery', () => {
  for (const source of [liveBoundary, callBoundary, appBoundary]) {
    assert.match(source, /reportClientRenderError/);
    assert.match(source, /Diagnostic reference/);
    assert.match(source, /componentDidCatch\(error, info\)/);
  }
  assert.match(liveBoundary, /Return to LIVE Hub/);
  assert.match(callBoundary, /Return to chats/);
  assert.match(reporter, /backendFetch\('\/diagnostics\/client-error'/);
  assert.match(reporter, /Best-effort, authenticated diagnostics/);
  assert.doesNotMatch(reporter, /access_token|refresh_token|conversationId|messageContent/);
  assert.doesNotMatch(reporter, /message,/);
});
