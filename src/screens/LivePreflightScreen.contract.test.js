import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const hub = fs.readFileSync(new URL('./LiveHubScreen.js', import.meta.url), 'utf8');
const preflight = fs.readFileSync(new URL('./LivePreflightScreen.js', import.meta.url), 'utf8');
const navigator = fs.readFileSync(new URL('../navigation/AppNavigator.js', import.meta.url), 'utf8');
const appConfig = JSON.parse(fs.readFileSync(new URL('../../app.json', import.meta.url), 'utf8'));

test('LIVE Hub sends creator setup to the dedicated pre-flight route', () => {
  const start = hub.indexOf('const startLive = () => {');
  const end = hub.indexOf('const joinLive = async (stream) => {', start);
  assert.ok(start >= 0 && end > start);
  const startFlow = hub.slice(start, end);
  assert.ok(startFlow.includes("navigation.navigate('LivePreflight'"));
  assert.ok(startFlow.includes('title: title.trim()'));
  assert.ok(startFlow.includes('experienceMode'));
  assert.ok(startFlow.includes('inviteeIds: visibility ==='));
  assert.ok(!startFlow.includes("backendFetch('/live'"));
});

test('LIVE pre-flight checks microphone and camera permissions before room creation', () => {
  assert.ok(preflight.includes("useCameraPermissions, useMicrophonePermissions"));
  assert.ok(preflight.includes('requestMicrophonePermission()'));
  assert.ok(preflight.includes('requestCameraPermission()'));
  assert.ok(preflight.includes('const mediaPermissionsGranted = microphoneGranted && cameraGranted'));
  assert.ok(preflight.includes('const cameraPreviewReady = !needsCamera || cameraReady'));
  assert.ok(preflight.includes('mediaPermissionsGranted && cameraPreviewReady && setupValid'));
  assert.ok(preflight.includes('if (!cameraPreviewReady)'));
  assert.ok(preflight.includes('Wait for the camera preview to become ready'));
  assert.ok(preflight.includes("await backendFetch('/live'"));
  assert.ok(preflight.includes('if (!mediaPermissionsGranted)'));
  assert.ok(preflight.includes('connection?.stream?.id'));
  assert.ok(preflight.includes('connection?.livekitUrl'));
  assert.ok(preflight.includes('connection?.token'));
});

test('audio-only LIVE requires microphone access but does not require camera access', () => {
  assert.ok(preflight.includes("const needsCamera = experienceMode !== 'audio_room'"));
  assert.ok(preflight.includes('const cameraGranted = !needsCamera || Boolean(activeCameraPermission?.granted)'));
  assert.ok(preflight.includes("experienceMode === 'audio_room' ? 'Audio-first room"));
  assert.ok(preflight.includes("experienceMode === 'audio_room' ? 'Your voice stage"));
});

test('pre-flight camera preview is scoped to the focused screen and has accessible controls', () => {
  assert.ok(preflight.includes('const isFocused = useIsFocused()'));
  assert.ok(preflight.includes('needsCamera && activeCameraPermission?.granted && isFocused'));
  assert.ok(preflight.includes('<CameraView'));
  assert.ok(preflight.includes('accessibilityLabel="Switch camera"'));
  assert.ok(preflight.includes("accessibilityLabel={mediaPermissionsGranted ? 'Media permissions granted' : needsCamera ? 'Allow camera and microphone permissions' : 'Allow microphone permission'}"));
  assert.ok(preflight.includes("'Start audio LIVE room' : experienceMode === 'video_chat' ? 'Start video LIVE chat'"));
});

test('pre-flight is registered as a modal route without changing primary navigation', () => {
  assert.ok(navigator.includes("import LivePreflightScreen from '../screens/LivePreflightScreen'"));
  assert.ok(navigator.includes('name="LivePreflight" component={LivePreflightScreen}'));
  assert.ok(navigator.includes('name="LIVE" component={LiveHubScreen}'));
});

test('native permission prompts explicitly cover LIVE camera and microphone use', () => {
  const expo = appConfig.expo;
  assert.ok(expo.ios.infoPlist.NSCameraUsageDescription.includes('LIVE'));
  assert.ok(expo.ios.infoPlist.NSMicrophoneUsageDescription.includes('LIVE'));
  assert.ok(expo.android.permissions.includes('android.permission.RECORD_AUDIO'));
  const plugins = expo.plugins.filter(Array.isArray);
  const camera = plugins.find(([name]) => name === 'expo-camera')?.[1];
  const picker = plugins.find(([name]) => name === 'expo-image-picker')?.[1];
  const audio = plugins.find(([name]) => name === 'expo-audio')?.[1];
  const rtc = plugins.find(([name]) => name === '@config-plugins/react-native-webrtc')?.[1];
  assert.ok(camera?.cameraPermission.includes('LIVE'));
  assert.ok(camera?.microphonePermission.includes('LIVE'));
  assert.ok(picker?.cameraPermission.includes('LIVE'));
  assert.ok(audio?.microphonePermission.includes('LIVE'));
  assert.ok(rtc?.cameraPermission.includes('LIVE'));
  assert.ok(rtc?.microphonePermission.includes('LIVE'));
  assert.equal(camera?.recordAudioAndroid, true);
});

test('pre-flight normalizes creator setup input before sending the create request', () => {
  assert.ok(preflight.includes("String(params.title || '').trim().slice(0, 80)"));
  assert.ok(preflight.includes("String(params.description || '').trim().slice(0, 500)"));
  assert.ok(preflight.includes("params.category)"));
  assert.ok(preflight.includes(": 'social'"));
  assert.ok(preflight.includes("['public', 'followers', 'private'].includes(params.visibility)"));
});

test('pre-flight prevents duplicate permission prompts and duplicate room creation', () => {
  assert.ok(preflight.includes('const permissionRequestRef = useRef(false)'));
  assert.ok(preflight.includes('const startRequestRef = useRef(false)'));
  assert.ok(preflight.includes('if (permissionRequestRef.current) return;'));
  assert.ok(preflight.includes('if (startRequestRef.current) return;'));
  assert.ok(preflight.includes('permissionRequestRef.current = false'));
  assert.ok(preflight.includes('startRequestRef.current = false'));
});

test('pre-flight rechecks permissions when the app returns from device settings', () => {
  assert.ok(preflight.includes("AppState.addEventListener('change'"));
  assert.ok(preflight.includes("if (state === 'active') refreshMediaPermissions()"));
  assert.ok(preflight.includes('getCameraPermission(), getMicrophonePermission()'));
});
