const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const nativeSource = fs.readFileSync(path.join(__dirname, 'CallScreen.js'), 'utf8');
const webSource = fs.readFileSync(path.join(__dirname, 'CallScreen.web.js'), 'utf8');

for (const [platform, source] of [['native', nativeSource], ['web', webSource]]) {
  test(`${platform} call screen lets either participant recover a failed ICE connection`, () => {
    const restartStart = source.indexOf('pc.oniceconnectionstatechange');
    const restartEnd = source.indexOf('const processSignal', restartStart);
    assert.notEqual(restartStart, -1);
    assert.notEqual(restartEnd, -1);
    const restartHandler = source.slice(restartStart, restartEnd);
    assert.match(restartHandler, /state === 'disconnected'/);
    assert.match(restartHandler, /state === 'failed'/);
    assert.doesNotMatch(restartHandler, /isCaller/);
    assert.match(restartHandler, /restartIce/);
    assert.match(restartHandler, /createOffer\(\{ iceRestart: true \}\)/);
    assert.match(source, /signal\.signal_type === 'answer' && pc\.signalingState === 'have-local-offer'/);
    assert.match(source, /if \(signal\.signal_type === 'offer'\)/);
    assert.match(source, /setLocalDescription\(\{ type: 'rollback' \}\)/);
  });
}
