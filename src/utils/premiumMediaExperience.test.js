import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('private chat header and avatar open a dedicated contact profile screen', async () => {
  const chat = await read('../screens/ChatScreen.js');
  const navigator = await read('../navigation/AppNavigator.js');
  const profile = await read('../screens/PeerProfileScreen.js');
  assert.match(chat, /navigation\.navigate\('PeerProfile'/);
  assert.match(chat, /onTitlePress=/);
  assert.match(navigator, /name="PeerProfile" component=\{PeerProfileScreen\}/);
  assert.match(profile, /CONTACT DETAILS/);
  assert.match(profile, /Only details available to your account are shown/);
});

test('chat media composer previews and captions photos and videos before sending', async () => {
  const chat = await read('../screens/ChatScreen.js');
  assert.match(chat, /setMediaDraft\(\{ kind: 'image'/);
  assert.match(chat, /setMediaDraft\(\{ kind: 'video'/);
  assert.match(chat, /Edit before sending/);
  assert.match(chat, /Add a caption/);
  assert.match(chat, /mediaCaption\.trim\(\)/);
  assert.match(chat, /handlePickVideo/);
});

test('video messages play inline and image/video messages expose device-save actions', async () => {
  const bubble = await read('../components/ChatBubble.js');
  const chat = await read('../screens/ChatScreen.js');
  const status = await read('../screens/StatusUpdatesScreen.js');
  assert.match(bubble, /VideoMessageContent/);
  assert.match(bubble, /VideoView player=\{player\}/);
  assert.match(bubble, /Save video to device/);
  assert.match(bubble, /Save image to device/);
  assert.match(chat, /saveMediaToLibrary/);
  const mediaSave = await read('../services/saveMediaToLibrary.js');
  assert.match(mediaSave, /MediaLibrary\.saveToLibraryAsync/);
  assert.match(status, /Save status media to device/);
});
