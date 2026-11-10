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
  assert.ok(screen.includes("`/live/${connection.stream.id}/invites`"));
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
