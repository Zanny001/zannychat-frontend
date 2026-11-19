import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const screen=fs.readFileSync(path.join(process.cwd(),'src/screens/LiveEventsScreen.js'),'utf8');
const navigation=fs.readFileSync(path.join(process.cwd(),'src/navigation/AppNavigator.js'),'utf8');
const hub=fs.readFileSync(path.join(process.cwd(),'src/screens/LiveHubScreen.js'),'utf8');
const notifications=fs.readFileSync(path.join(process.cwd(),'src/services/notifications.js'),'utf8');
const preflight=fs.readFileSync(path.join(process.cwd(),'src/screens/LivePreflightScreen.js'),'utf8');

test('LIVE Events screen is registered without changing the six primary tabs',()=>{
  assert.ok(navigation.includes("import LiveEventsScreen from '../screens/LiveEventsScreen'"));
  assert.ok(navigation.includes('name="LiveEvents" component={LiveEventsScreen}'));
  assert.ok(hub.includes("navigation.navigate('LiveEvents')"));
  assert.ok(hub.includes("type === 'live_event_invitation'"));
  assert.ok(hub.includes("'live_event_reminder'"));
  assert.ok(notifications.includes('data.eventId || data.replayId'));
  for (const tab of ['Chats','Calls','LIVE','Updates','Channels','Profile']) assert.ok(navigation.includes(`name="${tab}"`));
});

test('LIVE Events screen uses authenticated service-backed scheduling and RSVP actions',()=>{
  for (const endpoint of ['/live/events','/live/events/invitations','/live/invite-candidates']) assert.ok(screen.includes(endpoint));
  assert.ok(screen.includes("method:'POST'"));
  assert.ok(screen.includes("method:alreadyGoing?'DELETE':'POST'"));
  assert.ok(screen.includes("method:'PATCH'"));
  assert.ok(screen.includes("method:'POST'"));
});

test('LIVE Events screen validates schedule, duration, capacity and private invitee selection',()=>{
  assert.ok(screen.includes('10*60*1000'));
  assert.ok(screen.includes('90*24*60*60*1000'));
  assert.ok(screen.includes('durationMinutes<15||durationMinutes>240'));
  assert.ok(screen.includes('maxAttendees<1||maxAttendees>500'));
  assert.ok(screen.includes("visibility==='private' && selectedInvitees.length===0"));
  assert.ok(screen.includes('current.length>=25'));
});

test('LIVE Events screen clears account-owned state and guards actions on account changes',()=>{
  assert.ok(screen.includes('supabase.auth.onAuthStateChange'));
  assert.ok(screen.includes('Your account changed. Refresh LIVE Events and try again.'));
  assert.ok(screen.includes('setEvents([]);setInvitations([]);setCandidates([]);setSelectedInvitees([])'));
});

test('LIVE Events screen has accessible controls and loading, error and empty states',()=>{
  assert.ok(screen.includes('accessibilityRole="button"'));
  assert.ok(screen.includes('accessibilityLabel="LIVE Event title"'));
  assert.ok(screen.includes('ActivityIndicator'));
  assert.ok(screen.includes('accessibilityRole="alert"'));
  assert.ok(screen.includes('No upcoming Events yet'));
});
