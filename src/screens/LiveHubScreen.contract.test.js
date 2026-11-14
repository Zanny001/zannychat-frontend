import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./LiveHubScreen.js', import.meta.url), 'utf8');

test('LIVE hub supports public, follower-only and private broadcasts', () => {
  assert.ok(screen.includes("{ value: 'public', label: 'Public' }"));
  assert.ok(screen.includes("{ value: 'followers', label: 'Followers' }"));
  assert.ok(screen.includes("{ value: 'private', label: 'Private' }"));
  assert.ok(screen.includes('visibility, allowGuests'));
});

test('LIVE hub creates private invitations and displays pending invitations', () => {
  assert.ok(screen.includes("backendFetch('/live/invitations')"));
  assert.ok(screen.includes('Private LIVE invitations'));
  assert.ok(screen.includes('acceptInvitation(item)'));
  assert.ok(screen.includes("backendFetch('/live/invite-candidates')"));
  assert.ok(screen.includes('selectedInvitees.includes(person.id)'));
  assert.ok(screen.includes('toggleInvitee(person.id)'));
  assert.ok(screen.includes("inviteeIds: visibility === 'private' ? invitees : []"));
  assert.equal(screen.includes('`/live/${connection.stream.id}/invites`'), false);
});

test('LIVE hub follows creators and loads follower-only broadcasts', () => {
  assert.ok(screen.includes("`/live/creators/${creatorId}/follow`"));
  assert.ok(screen.includes("backendFetch('/live/following/streams')"));
  assert.ok(screen.includes("backendFetch('/live/following')"));
  assert.ok(screen.includes('Creators you follow'));
  assert.ok(screen.includes('followingCreators.map'));
  assert.ok(screen.includes("item.visibility === 'followers'"));
});


test('LIVE hub uses the shared premium theme and supports focused discovery filters', () => {
  assert.ok(screen.includes("import { useTheme } from '../theme/ThemeContext'"));
  assert.ok(screen.includes("import GlassCard from '../components/GlassCard'"));
  assert.ok(screen.includes("const STREAM_FILTERS"));
  assert.ok(screen.includes("activeFilter === 'following'"));
  assert.ok(screen.includes("activeFilter === 'public'"));
  assert.ok(screen.includes('Your stage. Your people.'));
});

test('browser Go LIVE requests camera and microphone permission before creating a stream', () => {
  assert.ok(screen.includes("Platform.OS === 'web'"));
  assert.ok(screen.includes('navigator.mediaDevices?.getUserMedia'));
  assert.ok(screen.includes('audio: true'));
  assert.ok(screen.includes('permissionStream.getTracks().forEach((track) => track.stop())'));
});


test('web Go LIVE exposes startup failures in the page instead of relying on native alerts', () => {
  assert.ok(screen.includes("setError(`Could not start LIVE: ${message}`)"));
  assert.ok(screen.includes("Platform.OS !== 'web'"));
  assert.ok(screen.includes("setStartStage('Creating your LIVE room…')"));
});

test('Go LIVE validates the server connection before opening the broadcast studio', () => {
  assert.ok(screen.includes("!connection?.stream?.id || !connection?.livekitUrl || !connection?.token"));
  assert.ok(screen.includes("navigation.navigate('LiveStream', { connection, creatorMode: true })"));
});

test('LIVE hub discovers privacy-filtered replay cards and polls pending processing', () => {
  assert.ok(screen.includes("backendFetch('/live/replays')"));
  assert.ok(screen.includes('LIVE replays'));
  assert.ok(screen.includes("item.status === 'ready'"));
  assert.ok(screen.includes('Watch replay'));
  assert.ok(screen.includes('Preparing replay…'));
  assert.ok(screen.includes('hasPendingReplays'));
  assert.ok(screen.includes('refreshPendingReplays'));
  assert.ok(screen.includes("navigation.navigate('LiveReplay'"));
});

test('replay-ready notifications open the in-app player and refresh discovery', () => {
  assert.ok(screen.includes("type === 'live_replay_ready'"));
  assert.ok(screen.includes('notification.replayId'));
  assert.ok(screen.includes("navigation.navigate('LiveReplay'"));
});
