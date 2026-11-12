import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const navigator = fs.readFileSync(new URL('../navigation/AppNavigator.js', import.meta.url), 'utf8');
const channels = fs.readFileSync(new URL('./ChannelsScreen.js', import.meta.url), 'utf8');

test('the Channels destination is discoverable as Explore without changing its route identity', () => {
  assert.ok(navigator.includes('name="Channels" component={ChannelsScreen} options={{ tabBarLabel: \'Explore\' }}'));
  assert.ok(navigator.includes("Channels: 'compass'"));
  assert.ok(navigator.includes("route.name === 'Channels' ? 'Explore tab'"));
});

test('Explore makes LIVE and public communities visible from one destination', () => {
  assert.ok(channels.includes('title={selected ? "Channel" : "Explore"}'));
  assert.ok(channels.includes('LIVE, public channels and communities'));
  assert.ok(channels.includes('ZannyChat LIVE'));
  assert.ok(channels.includes('Discover channels'));
  assert.ok(channels.includes("navigation.navigate('LiveHub')"));
});

test('Explore previews public LIVE broadcasts and joins through the authorized backend route', () => {
  assert.ok(channels.includes("backendFetch('/live')"));
  assert.ok(channels.includes("backendFetch('/live/' + encodeURIComponent(stream.id) + '/join'"));
  assert.ok(channels.includes('liveStreams.map'));
  assert.ok(channels.includes('No public broadcasts right now'));
  assert.ok(channels.includes("navigation.navigate('LiveStream'"));
});
