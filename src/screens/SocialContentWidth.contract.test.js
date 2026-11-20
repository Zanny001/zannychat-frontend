import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Status Updates feed and Channels directory use the shared centered content width', () => {
  for (const file of ['StatusUpdatesScreen.js', 'ChannelsScreen.js']) {
    const source = readFileSync(new URL('./' + file, import.meta.url), 'utf8');
    assert.match(source, /layout\.contentMaxWidth/, file + ' must use the shared content measure');
    assert.match(source, /width: '100%', maxWidth: layout\.contentMaxWidth/, file + ' must stay fluid below the desktop cap');
    assert.match(source, /alignSelf: 'center'/, file + ' must center the content column');
  }
});
