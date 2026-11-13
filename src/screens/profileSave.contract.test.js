import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const screen = fs.readFileSync(path.join(root, 'src/screens/EditProfileScreen.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'src/services/api.js'), 'utf8');

test('profile editor keeps every reusable section and control at module scope', () => {
  const screenStart = screen.indexOf('export default function EditProfileScreen');
  for (const component of ['Section', 'Field', 'Toggle', 'Choice']) {
    const declaration = screen.indexOf('function ' + component + '(');
    assert.ok(declaration >= 0 && declaration < screenStart, component + ' must not be recreated during screen state updates');
  }
});

test('save validates username, birthday, website and waits for both persisted profile records', () => {
  assert.match(screen, /\\^\\[a-z0-9_\\]\\{3,24\\}\\$/);
  assert.match(screen, /validateBirthday\\(details\\.birthday\\)/);
  assert.match(screen, /validateWebsite\\(details\\.website\\)/);
  const identityWrite = screen.indexOf('await updateProfile(');
  const detailsWrite = screen.indexOf('await updateMyProfileDetails(');
  assert.ok(identityWrite >= 0 && detailsWrite > identityWrite, 'both profile writes must be awaited');
  assert.match(screen, /Alert\\.alert\\('Profile saved'/);
  assert.match(screen, /Some changes were saved/);
});

test('save cannot run while profile media is uploading and username conflicts are explained', () => {
  assert.match(screen, /disabled=\\{saving \\|\\| uploadingPhoto \\|\\| uploadingCover\\}/);
  assert.match(screen, /uploadingPhoto \\|\\| uploadingCover/);
  assert.match(screen, /duplicate\\|unique/);
  assert.match(screen, /That username is already taken/);
});

test('profile API persists username in profiles and optional details in the owner profile_details row', () => {
  assert.match(api, /\\.from\\('profiles'\\)[\\s\\S]*?\\.update\\([\\s\\S]*?username: normalizedUsername/);
  assert.match(api, /\\.from\\('profile_details'\\)[\\s\\S]*?\\.upsert\\(row, \\{ onConflict: 'user_id' \\}\\)/);
  assert.match(api, /grant|profile_details/);
});
