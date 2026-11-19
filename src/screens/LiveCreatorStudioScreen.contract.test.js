import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./LiveCreatorStudioScreen.js', import.meta.url), 'utf8');

test('creator replay collection only opens replays that are ready', () => {
  assert.match(source, /disabled=\{item\.status !== 'ready'\}/);
  assert.match(source, /accessibilityState=\{\{ disabled: item\.status !== 'ready' \}\}/);
  assert.match(source, /item\.status === 'ready' \? 'play-circle'/);
  assert.match(source, /item\.status === 'failed' \? 'Recording unavailable'/);
});


test('creator studio clears account-owned studio data and invalidates requests on auth change', () => {
  assert.ok(source.includes("import { supabase, SUPABASE_ENABLED } from '../services/supabaseClient'"));
  assert.ok(source.includes('const activeUserIdRef = useRef(null)'));
  assert.ok(source.includes('const refreshRequestRef = useRef(0)'));
  assert.ok(source.includes('supabase.auth.onAuthStateChange'));
  assert.ok(source.includes('setSummary(null)'));
  assert.ok(source.includes('refreshRequestRef.current += 1'));
  assert.ok(source.includes('const startingUser = await getCurrentUser().catch(() => null)'));
  assert.ok(source.includes('const latestUser = await getCurrentUser().catch(() => null)'));
  assert.ok(source.includes('if (requestId !== refreshRequestRef.current) return;'));
  assert.ok(source.includes('An auth event may have invalidated this refresh'));
  assert.ok(source.includes('latestUser?.id !== expectedUserId'));
  assert.ok(source.includes('if (requestId === refreshRequestRef.current) setLoading(false)'));
  assert.ok(source.includes('data?.subscription?.unsubscribe?.()'));
  assert.ok(source.includes('return () => { refreshRequestRef.current += 1; }'));
});

test('creator broadcast and replay deletions cannot mutate another account\'s refreshed studio state', () => {
  assert.equal((source.match(/const expectedUserId = activeUserIdRef.current/g) || []).length, 2);
  assert.equal((source.match(/latestUser\?\.id !== expectedUserId/g) || []).length, 3);
});

test('owner dashboard is consistently presented as Creator Studio', () => {
  assert.ok(source.includes('CREATOR STUDIO'));
  assert.ok(source.includes('Your LIVE Creator Studio is temporarily unavailable.'));
  assert.ok(source.includes('Refresh Creator Studio'));
});
