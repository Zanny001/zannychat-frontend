import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (name) => fs.readFileSync(new URL('./' + name, import.meta.url), 'utf8');

test('LIVE hub keeps discovery content comfortably centered on wide screens', () => {
  const source = read('LiveHubScreen.js');
  assert.ok(source.includes("width: '100%', maxWidth: 820, alignSelf: 'center'"));
  assert.ok(source.includes("width: '94%', maxWidth: 760, alignSelf: 'center'"));
  assert.ok(source.includes("color: selected ? colors.onPrimary : colors.textSecondary"));
});

test('LIVE replay library uses a centered, readable content width on tablets and desktop', () => {
  const source = read('LiveReplayLibraryScreen.js');
  assert.ok(source.includes("alignItems: 'center'"));
  assert.ok(source.includes("width: '94%', maxWidth: 760, alignSelf: 'center'"));
  assert.ok(source.includes("accessibilityState={{ checked: selected }}"));
});

test('LIVE creator studio constrains its reading width and lets metrics wrap on compact screens', () => {
  const source = read('LiveCreatorStudioScreen.js');
  assert.ok(source.includes("width: '100%', maxWidth: 760, alignSelf: 'center'"));
  assert.ok(source.includes("flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm"));
  assert.ok(source.includes("minWidth: 104, flexGrow: 1"));
});

test('premium layout refinements leave LiveKit and moderation implementation files untouched', () => {
  const stage = read('LiveStreamScreen.js');
  const webStage = read('LiveStreamScreen.web.js');
  assert.ok(stage.includes('RoomEvent.ParticipantPermissionsChanged'));
  assert.ok(stage.includes('room.localParticipant.setCameraEnabled(nextEnabled)'));
  assert.ok(stage.includes('onReviewReport(item.id, \'resolved\')'));
  assert.ok(webStage.includes('roomRef.current?.disconnect()'));
  assert.ok(webStage.includes('spotlightGuest'));
  assert.ok(webStage.includes('reviewReport(item.id, \'resolved\')'));
});
