import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const dialogs = fs.readFileSync(new URL('./appDialogs.js', import.meta.url), 'utf8');
const editor = fs.readFileSync(new URL('../screens/EditProfileScreen.js', import.meta.url), 'utf8');

test('cross-platform alerts support a one-shot dismiss callback on web and native', () => {
  assert.match(dialogs, /globalThis\.alert\(title \+ '\\n\\n' \+ message\)/);
  assert.match(dialogs, /finish\(\)/);
  assert.match(dialogs, /\{ text: 'OK', onPress: finish \}/);
  assert.match(dialogs, /onDismiss: finish/);
});

test('profile editor uses cross-platform alerts and navigates back only after success is acknowledged', () => {
  assert.match(editor, /import \{ showAppAlert \} from '\.\.\/utils\/appDialogs'/);
  assert.doesNotMatch(editor, /Alert\.alert\(/);
  assert.match(editor, /showAppAlert\('Profile saved',[\s\S]*?onDismiss: \(\) => navigation\.goBack\(\)/);
});
