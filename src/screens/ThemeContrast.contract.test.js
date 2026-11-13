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

test('interactive controls keep 44-point minimum touch targets on high-traffic screens', () => {
  const contracts = [
    ['StatusUpdatesScreen.js', 12],
    ['ChannelsScreen.js', 10],
    ['PollsScreen.js', 2],
    ['ContactDiscoveryScreen.js', 2],
    ['GroupManagementScreen.js', 1],
    ['LiveHubScreen.js', 1],
    ['NewChatScreen.js', 1],
    ['SharedMediaScreen.js', 1],
  ];
  for (const [file, minimumCount] of contracts) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    const targets = source.match(/minHeight\s*:\s*44\b/g) || [];
    assert.ok(
      targets.length >= minimumCount,
      file + ' expected at least ' + minimumCount + ' 44-point touch targets, found ' + targets.length,
    );
  }
});

test('profile, support, call-history, drafts and event recovery actions expose accessible names and states', () => {
  const editProfile = readFileSync(new URL('EditProfileScreen.js', import.meta.url), 'utf8');
  assert.match(editProfile, /accessibilityLabel=\{\`\$\{label\}; currently \$\{options\[current\]\.label\}\. Activate to change\.\`\}/);
  assert.match(editProfile, /accessibilityLabel="Add or change profile cover image"/);
  assert.match(editProfile, /accessibilityState=\{\{ disabled: uploadingPhoto, busy: uploadingPhoto \}\}/);
  assert.match(editProfile, /accessibilityLabel="Preview your profile"/);

  const help = readFileSync(new URL('HelpScreen.js', import.meta.url), 'utf8');
  assert.match(help, /accessibilityLabel="Contact ZannyChat support by email"/);

  const calls = readFileSync(new URL('CallHistoryScreen.js', import.meta.url), 'utf8');
  assert.match(calls, /accessibilityLabel="Retry loading call history"/);

  const drafts = readFileSync(new URL('DraftsScreen.js', import.meta.url), 'utf8');
  assert.match(drafts, /accessibilityLabel="Retry loading drafts"/);

  const events = readFileSync(new URL('EventsScreen.js', import.meta.url), 'utf8');
  assert.match(events, /accessibilityLabel="Publish event"/);
  assert.match(events, /accessibilityLabel="Retry loading events"/);
});

test('native LIVE moderation, discovery and call recovery actions have explicit accessibility names', () => {
  const live = readFileSync(new URL('LiveStreamScreen.js', import.meta.url), 'utf8');
  for (const label of [
    'Make \${item.name} a LIVE moderator',
    'Approve LIVE guest request from \${item.name}',
    'Decline LIVE guest request from \${item.name}',
    'Review \${item.reason} LIVE report',
    'Resolve \${item.reason} LIVE report',
    'Dismiss \${item.reason} LIVE report',
  ]) assert.ok(live.includes(label), 'Missing native LIVE action label: ' + label);

  const hub = readFileSync(new URL('LiveHubScreen.js', import.meta.url), 'utf8');
  assert.match(hub, /accessibilityLabel="Load contacts to invite to private LIVE"/);
  assert.ok(hub.includes('accessibilityLabel={\`Invite \${person.name} to this LIVE stream\`}'));
  assert.match(hub, /accessibilityLabel="Allow approved viewers to join the LIVE stage"/);
  assert.match(hub, /accessibilityLabel="Go LIVE"/);
  assert.ok(hub.includes('accessibilityLabel={\`Accept invitation to \${item.stream.title}\`}'));
  assert.match(hub, /Show \${filter.label} LIVE streams/);

  const groupCall = readFileSync(new URL('GroupCallScreen.js', import.meta.url), 'utf8');
  assert.match(groupCall, /accessibilityLabel="Go back"/);

  const call = readFileSync(new URL('CallScreen.js', import.meta.url), 'utf8');
  assert.match(call, /accessibilityLabel="Show call connection details"/);
});

test('channels, status publishing and chat recovery actions expose accessible labels', () => {
  const channels = readFileSync(new URL('ChannelsScreen.js', import.meta.url), 'utf8');
  for (const label of [
    'Retry loading community feed',
    'Refresh channels',
    'Save channel details',
    'Create channel invitation',
    'Delete channel',
    'Review channel reports',
    'Publish channel post',
    'Send channel comment',
    'Create channel',
    'Join channel with invitation code',
  ]) assert.ok(channels.includes('accessibilityLabel="' + label + '"'), 'Missing channel action label: ' + label);
  assert.ok(channels.includes('accessibilityLabel={member.moderator ?'), 'Channel moderator action needs a dynamic accessible label');
  assert.ok(channels.includes("accessibilityLabel={selected.subscribed ? 'Unsubscribe from channel'"), 'Channel subscription toggle needs a dynamic accessible label');

  const statuses = readFileSync(new URL('StatusUpdatesScreen.js', import.meta.url), 'utf8');
  for (const label of [
    'Add or change status photo',
    'Remove selected status media',
    'Add or change status video',
    'Choose status audience contacts',
    'Publish status',
    'Manage excluded status contacts',
    'Refresh statuses',
    'Close status privacy settings',
  ]) assert.ok(statuses.includes('accessibilityLabel="' + label + '"'), 'Missing status action label: ' + label);

  const chat = readFileSync(new URL('ChatScreen.js', import.meta.url), 'utf8');
  assert.match(chat, /accessibilityLabel="Retry sending pending messages"/);
  assert.match(chat, /accessibilityLabel="Dismiss message error"/);
  assert.match(chat, /accessibilityLabel="Send selected media"/);
});
