import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (name) => fs.readFileSync(new URL('./' + name, import.meta.url), 'utf8');

test('shared LIVE header follows Crown Aurora theme tokens and accessible navigation semantics', () => {
  const header = fs.readFileSync(new URL('../components/LivePremiumHeader.js', import.meta.url), 'utf8');
  assert.ok(header.includes("import { useTheme } from '../theme/ThemeContext'"));
  assert.ok(header.includes('hexToRgba(colors.primary, 0.13)'));
  assert.ok(header.includes('colors.textPrimary'));
  assert.ok(header.includes('colors.textSecondary'));
  assert.ok(header.includes('accessibilityRole="button"'));
  assert.ok(header.includes('accessibilityLabel={backLabel}'));
  assert.ok(header.includes('accessibilityLabel={refreshLabel}'));
  assert.ok(header.includes("navigation?.navigate?.('Main', { screen: 'LIVE' })"));
  assert.ok(header.includes('badge && !compact ?'));
  assert.ok(header.includes('useWindowDimensions'));
  assert.ok(header.includes('const compact = viewportWidth < 380;'));
});

test('secondary LIVE destinations share one consistent premium header', () => {
  const screens = [
    'LiveCreatorStudioScreen.js',
    'LivePreflightScreen.js',
    'LiveAnalyticsScreen.js',
    'LiveEventsScreen.js',
    'LiveReplayLibraryScreen.js',
    'LiveModerationScreen.js',
    'LiveGuestQueueScreen.js',
    'LiveReportsScreen.js',
    'LiveLeaderboardScreen.js',
    'LiveSettingsScreen.js',
    'LiveReplayScreen.js',
  ];
  for (const name of screens) {
    const source = read(name);
    assert.ok(source.includes("import LivePremiumHeader from '../components/LivePremiumHeader';"), name + ' imports shared header');
    assert.ok(source.includes('<LivePremiumHeader'), name + ' renders shared header');
  }
});

test('LIVE preflight retains creator context and a direct media-permission recheck action', () => {
  const source = read('LivePreflightScreen.js');
  assert.ok(source.includes('badge="CREATOR"'));
  assert.ok(source.includes('onRefresh={refreshMediaPermissions}'));
  assert.ok(source.includes('Return to LIVE setup'));
  assert.ok(source.includes('cameraPreviewReady'));
  assert.ok(source.includes('mediaPermissionsGranted'));
});

test('immersive LIVE room and secure replay player remain separate from the secondary-screen header', () => {
  const nativeStage = read('LiveStreamScreen.js');
  const webStage = read('LiveStreamScreen.web.js');
  const replay = read('LiveReplayScreen.js');
  assert.equal(nativeStage.includes('<LivePremiumHeader'), false);
  assert.equal(webStage.includes('<LivePremiumHeader'), false);
  assert.ok(replay.includes('<LivePremiumHeader'));
  assert.ok(nativeStage.includes('LiveKitRoom'));
  assert.ok(webStage.includes('new Room('));
  assert.ok(replay.includes('backendFetch'));
});
