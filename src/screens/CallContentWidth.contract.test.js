import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const files = {
  direct: readFileSync(new URL('./CallScreen.js', import.meta.url), 'utf8'),
  incoming: readFileSync(new URL('./IncomingCallScreen.js', import.meta.url), 'utf8'),
  outgoing: readFileSync(new URL('./OutgoingCallScreen.js', import.meta.url), 'utf8'),
  history: readFileSync(new URL('./CallHistoryScreen.js', import.meta.url), 'utf8'),
  group: readFileSync(new URL('./GroupCallScreen.js', import.meta.url), 'utf8'),
};

test('direct, incoming and outgoing call identity/control surfaces use shared moderate widths', () => {
  for (const name of ['direct', 'incoming', 'outgoing']) {
    assert.match(files[name], /layout\.formMaxWidth/, name + ' must use the form measure');
    assert.match(files[name], /maxWidth: layout\.formMaxWidth/, name + ' must cap identity content');
  }
  assert.match(files.direct, /maxWidth: layout\.contentMaxWidth/, 'direct call control dock must be bounded');
});

test('call history resolves viewer identity before formatting rows', () => {
  assert.match(files.history, /getCallUserId/);
  assert.match(files.history, /const \[userId, setUserId\] = useState\(null\)/);
  assert.match(files.history, /setUserId\(currentUserId\)/);
  assert.match(files.history, /getCallHistoryLabel\(item, userId\)/);
});

test('call history uses the shared content width', () => {
  assert.match(files.history, /maxWidth: layout\.contentMaxWidth/);
  assert.match(files.history, /alignSelf: 'center'/);
});

test('group video stage and control dock use separate media and content measures', () => {
  const tokens = readFileSync(new URL('../theme/colors.js', import.meta.url), 'utf8');
  assert.match(tokens, /mediaStageMaxWidth: 1280/);
  assert.match(files.group, /maxWidth: layout\.mediaStageMaxWidth/);
  assert.match(files.group, /maxWidth: layout\.contentMaxWidth/);
});

test('native and web active-call controls use a contained responsive premium dock', () => {
  for (const name of ['CallScreen.js', 'CallScreen.web.js']) {
    const source = readFileSync(new URL(`./${name}`, import.meta.url), 'utf8');
    assert.match(source, /maxWidth: layout\.contentMaxWidth/);
    assert.match(source, /flexWrap: 'wrap'/);
    assert.match(source, /borderRadius: 28/);
    assert.match(source, /minHeight: 64/);
  }
});

test('native group-call controls use a compact themed dock that can wrap on narrow screens', () => {
  assert.match(files.group, /flexWrap: 'wrap'/);
  assert.match(files.group, /marginBottom: 14/);
  assert.match(files.group, /minWidth: 68, minHeight: 68/);
  assert.match(files.group, /backgroundColor: hexToRgba\(colors\.surface, 0\.84\)/);
});

test('group-call tiles and participant chips surface the active speaker without hiding names', () => {
  assert.ok(files.group.includes('item.participant.isSpeaking'));
  assert.ok(files.group.includes('SPEAKING'));
  assert.ok(files.group.includes("participant.isSpeaking ? 'volume-high' : 'person-circle-outline'"));
  assert.ok(files.group.includes('accessibilityLabel={`${participant.name'));
  assert.ok(files.group.includes('borderColor: item.participant.isSpeaking ? colors.accent'));
});

test('web active calls can flip between available front and rear cameras without restarting the call', () => {
  const web = readFileSync(new URL('./CallScreen.web.js', import.meta.url), 'utf8');
  assert.match(web, /const switchCamera = async/);
  assert.match(web, /facingMode: \{ ideal: nextFacingMode \}/);
  assert.match(web, /await sender\.replaceTrack\(nextTrack\)/);
  assert.match(web, /control\('camera-reverse', 'Flip camera', switchCamera\)/);
  assert.match(web, /previousTrack\.stop\(\)/);
  assert.match(web, /await sender\.replaceTrack\(previousTrack\)\.catch\(\(\) => \{\}\)/, 'failed flips restore the previous sender track');
});

test('native in-call camera flip reports unsupported or unavailable camera states accessibly', () => {
  const native = readFileSync(new URL('./CallScreen.js', import.meta.url), 'utf8');
  assert.match(native, /const switchCamera = async/);
  assert.match(native, /Turn your camera on before switching cameras/);
  assert.match(native, /does not support switching cameras during a call/);
  assert.match(native, /track\._switchCamera\(\)/);
  assert.match(native, /cameraSwitchInProgressRef\.current = false/);
});
