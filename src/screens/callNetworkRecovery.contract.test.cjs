const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const nativeSource = fs.readFileSync(path.join(__dirname, 'CallScreen.js'), 'utf8');
const webSource = fs.readFileSync(path.join(__dirname, 'CallScreen.web.js'), 'utf8');

for (const [platform, source] of [['native', nativeSource], ['web', webSource]]) {
  test(`${platform} call screen supports caller-side ICE restart`, () => {
    assert.match(source, /oniceconnectionstatechange/);
    assert.match(source, /restartIce/);
    assert.match(source, /createOffer\(\{ iceRestart: true \}\)/);
    assert.match(source, /signal\.signal_type === 'answer' && isCaller/);
    assert.match(source, /signal\.signal_type === 'offer' && !isCaller/);
  });
}
