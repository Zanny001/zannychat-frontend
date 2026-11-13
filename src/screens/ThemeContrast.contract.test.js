import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MOODS, resolveMoodColors } from '../theme/colors.js';

function relativeLuminance(hex) {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((channel) => (
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ));
  return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
}

function contrastRatio(foreground, background) {
  const values = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

for (const mood of Object.values(MOODS)) {
  test(`${mood.label} theme keeps primary action text readable in dark and light modes`, () => {
    for (const mode of ['dark', 'light']) {
      const colors = resolveMoodColors(mood, mode);
      assert.ok(
        contrastRatio(colors.onPrimary, colors.primary) >= 4.5,
        `${mood.key} ${mode} primary contrast was ${contrastRatio(colors.onPrimary, colors.primary).toFixed(2)}:1`,
      );
    }
  });

  test(`${mood.label} theme keeps sent-message text and metadata readable`, () => {
    for (const mode of ['dark', 'light']) {
      const colors = resolveMoodColors(mood, mode);
      assert.ok(
        contrastRatio(colors.bubbleMineText, colors.bubbleMine) >= 4.5,
        `${mood.key} ${mode} message text contrast was ${contrastRatio(colors.bubbleMineText, colors.bubbleMine).toFixed(2)}:1`,
      );
      assert.ok(
        contrastRatio(colors.bubbleMineMeta, colors.bubbleMine) >= 4.5,
        `${mood.key} ${mode} message metadata contrast was ${contrastRatio(colors.bubbleMineMeta, colors.bubbleMine).toFixed(2)}:1`,
      );
    }
  });
}


const screenDirectory = fileURLToPath(new URL('.', import.meta.url));

test('every primary screen consumes the shared dynamic theme context', () => {
  const screenFiles = readdirSync(screenDirectory).filter((name) => name.endsWith('Screen.js') || name.endsWith('Screen.web.js'));
  const missingTheme = screenFiles.filter((name) => !/\buseTheme\b/.test(readFileSync(new URL(name, import.meta.url), 'utf8')));
  assert.deepEqual(missingTheme, [], `Screens missing shared theme context: ${missingTheme.join(', ')}`);
});

test('high-impact feedback and call actions use semantic theme colours', () => {
  const contracts = [
    ['NewChatScreen.js', /borderColor: colors\.danger/],
    ['NewChatScreen.js', /color: colors\.danger/],
    ['StatusUpdatesScreen.js', /color: colors\.danger/],
    ['EditProfileScreen.js', /color: colors\.danger/],
    ['PrivacySecurityScreen.js', /borderColor: colors\.danger/],
    ['PrivacySecurityScreen.js', /color=\{colors\.danger\}/],
    ['CallScreen.js', /danger \? colors\.danger/],
    ['IncomingCallScreen.js', /backgroundColor: colors\.danger/],
    ['OutgoingCallScreen.js', /backgroundColor: colors\.danger/],
    ['LiveStreamScreen.js', /backgroundColor: colors\.danger/],
    ['CallScreen.web.js', /danger \? colors\.danger/],
    ['GroupCallScreen.web.js', /backgroundColor: colors\.background/],
    ['GroupCallScreen.web.js', /backgroundColor: colors\.primary/],
    ['LiveStreamScreen.web.js', /danger \? colors\.danger/],
    ['ChannelsScreen.js', /color: colors\.danger/],
    ['ChatListScreen.js', /borderColor: colors\.danger/],
    ['ChatScreen.js', /avatarColor: colors\.primary/],
    ['ChatScreen.js', /color: colors\.danger/],
    ['GroupManagementScreen.js', /color: colors\.onPrimary/],
    ['IncomingCallScreen.js', /avatarColor = avatarColorParam \|\| colors\.primary/],
    ['OutgoingCallScreen.js', /avatarColor = avatarColorParam \|\| colors\.primary/],
    ['LiveStreamScreen.js', /borderTopColor: colors\.border/],
    ['LiveStreamScreen.js', /color=\{colors\.accent\}/],
    ['JoinGroupScreen.js', /color: colors\.danger/],
    ['PrivacySecurityScreen.js', /entry\.profile\?\.avatarColor \|\| colors\.primary/],
    ['LoginScreen.js', /color: colors\.onPrimary/],
    ['OnboardingScreen.js', /color: colors\.onPrimary/],
    ['PasswordRecoveryScreen.js', /color: colors\.onPrimary/],
    ['PasswordResetScreen.js', /color: colors\.onPrimary/],
    ['CallScreen.js', /avatarColor \|\| colors\.primary/],
    ['CallScreen.web.js', /avatarColor \|\| colors\.primary/],
    ['SignupScreen.js', /color: colors\.onPrimary/],
    ['VerifyEmailScreen.js', /color: colors\.onPrimary/],
  ];
  for (const [file, pattern] of contracts) {
    assert.match(readFileSync(new URL(file, import.meta.url), 'utf8'), pattern, `${file} must use its semantic theme token`);
  }
});

test('glass tab navigation has a no-blur fallback for older Android versions', () => {
  const navigator = readFileSync(new URL('../navigation/AppNavigator.js', import.meta.url), 'utf8');
  assert.match(navigator, /supportsBackdropBlur = Platform\.OS !== 'android' \|\| Number\(Platform\.Version\) >= 31/);
  assert.match(navigator, /supportsBackdropBlur \? \(/);
});

test('web LIVE actions expose labels, disabled state and accessible touch targets', () => {
  const liveScreen = readFileSync(new URL('LiveStreamScreen.web.js', import.meta.url), 'utf8');
  assert.match(liveScreen, /accessibilityRole="button"/);
  assert.match(liveScreen, /accessibilityLabel=\{accessibilityLabel \|\| label\}/);
  assert.match(liveScreen, /accessibilityState=\{\{ disabled \}\}/);
  assert.match(liveScreen, /minHeight: 44/);
  assert.match(liveScreen, /accessibilityLabel="Hide comment"/);
  assert.match(liveScreen, /accessibilityLabel="LIVE chat message"/);
  assert.match(liveScreen, /accessibilityLabel="Send heart reaction"/);
});

test('web group-call fallback provides an accessible native-app explanation and back action', () => {
  const fallback = readFileSync(new URL('GroupCallScreen.web.js', import.meta.url), 'utf8');
  assert.match(fallback, /Group calling needs the native app/);
  assert.match(fallback, /accessibilityRole="button"/);
  assert.match(fallback, /accessibilityLabel="Go back"/);
  assert.match(fallback, /minHeight: 44/);
});

test('create-group screen exposes accessible selection controls and complete contact states', () => {
  const createGroup = readFileSync(new URL('CreateGroupScreen.js', import.meta.url), 'utf8');
  assert.match(createGroup, /accessibilityRole="checkbox"/);
  assert.match(createGroup, /accessibilityLabel=\{'Select ' \+ item\.name \+ ' for group'\}/);
  assert.match(createGroup, /accessibilityState=\{\{ checked: selected \}\}/);
  assert.match(createGroup, /accessibilityLabel="Create group"/);
  assert.match(createGroup, /loadingContacts/);
  assert.match(createGroup, /contactsError/);
  assert.match(createGroup, /No contacts available to add yet/);
  assert.match(createGroup, /minHeight: 48/);
});
