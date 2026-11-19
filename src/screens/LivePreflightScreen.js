import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { backendFetch } from '../services/backendClient';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../utils/color';

const MODE_LABELS = {
  broadcast: 'Classic Broadcast',
  video_chat: 'Video LIVE Chat',
  audio_room: 'Audio LIVE Room',
};

function PermissionRow({ icon, label, detail, state, colors, typography }) {
  const granted = state === 'granted';
  const unavailable = state === 'unavailable';
  const tint = granted ? colors.success : unavailable ? colors.textSecondary : colors.warning || colors.danger;
  return (
    <View style={{ minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.border }}>
      <View style={{ width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: hexToRgba(tint, 0.13) }}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{label}</Text>
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>{detail}</Text>
      </View>
      <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: hexToRgba(tint, 0.12), borderWidth: 1, borderColor: hexToRgba(tint, 0.25) }}>
        <Text style={[typography.caption, { color: tint, fontWeight: '900' }]}>{granted ? 'ALLOWED' : unavailable ? 'NOT NEEDED' : 'REQUIRED'}</Text>
      </View>
    </View>
  );
}

export default function LivePreflightScreen({ route, navigation }) {
  const { colors, spacing, typography, resolvedMode } = useTheme();
  const isFocused = useIsFocused();
  const params = route?.params || {};
  const title = String(params.title || '').trim().slice(0, 80);
  const description = String(params.description || '').trim().slice(0, 500);
  const visibility = ['public', 'followers', 'private'].includes(params.visibility) ? params.visibility : 'public';
  const experienceMode = Object.prototype.hasOwnProperty.call(MODE_LABELS, params.experienceMode)
    ? params.experienceMode : 'broadcast';
  const category = ['entertainment', 'social', 'politics', 'science', 'education', 'finance', 'technology', 'sports', 'business', 'health', 'other'].includes(params.category)
    ? params.category : 'social';
  const allowGuests = Boolean(params.allowGuests);
  const inviteeIds = Array.isArray(params.inviteeIds) ? [...new Set(params.inviteeIds.filter((id) => typeof id === 'string' && id))] : [];
  const needsCamera = experienceMode !== 'audio_room';
  const [cameraPermission, requestCameraPermission, getCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission, getMicrophonePermission] = useMicrophonePermissions();
  const [permissionSnapshot, setPermissionSnapshot] = useState(null);
  const activeCameraPermission = permissionSnapshot?.camera || cameraPermission;
  const activeMicrophonePermission = permissionSnapshot?.microphone || microphonePermission;

  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([getCameraPermission(), getMicrophonePermission()])
      .then(([camera, microphone]) => {
        if (active) setPermissionSnapshot({ camera, microphone });
      })
      .catch(() => {});
    return () => { active = false; };
  }, [getCameraPermission, getMicrophonePermission]));
  const [cameraFacing, setCameraFacing] = useState('front');
  const [cameraReady, setCameraReady] = useState(false);
  const [permissionBusy, setPermissionBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const microphoneGranted = Boolean(activeMicrophonePermission?.granted);
  const cameraGranted = !needsCamera || Boolean(activeCameraPermission?.granted);
  const mediaPermissionsGranted = microphoneGranted && cameraGranted;
  const cameraPreviewReady = !needsCamera || cameraReady;
  const privateInviteesValid = visibility !== 'private' || inviteeIds.length > 0;
  const setupValid = Boolean(title) && privateInviteesValid;
  const canStart = mediaPermissionsGranted && cameraPreviewReady && setupValid && !busy && !permissionBusy;

  const requestMediaAccess = useCallback(async () => {
    setError('');
    setPermissionBusy(true);
    try {
      const microphone = activeMicrophonePermission?.granted
        ? activeMicrophonePermission
        : await requestMicrophonePermission();
      setPermissionSnapshot((current) => ({ ...(current || {}), microphone }));
      if (!microphone?.granted) {
        setError(microphone?.canAskAgain === false
          ? 'Microphone access is blocked. Enable it in your device or browser settings, then return here.'
          : 'Microphone access is required to host a LIVE experience.');
        return;
      }
      if (needsCamera) {
        const camera = activeCameraPermission?.granted
          ? activeCameraPermission
          : await requestCameraPermission();
        setPermissionSnapshot((current) => ({ ...(current || {}), camera }));
        if (!camera?.granted) {
          setError(camera?.canAskAgain === false
            ? 'Camera access is blocked. Enable it in your device or browser settings, then return here.'
            : 'Camera access is required for Broadcast and Video LIVE Chat.');
          return;
        }
      }
    } catch (permissionError) {
      setError(permissionError?.message || 'The required media permissions could not be checked.');
    } finally {
      setPermissionBusy(false);
    }
  }, [
    activeCameraPermission,
    activeMicrophonePermission,
    needsCamera,
    requestCameraPermission,
    requestMicrophonePermission,
  ]);

  const openPermissionSettings = useCallback(() => {
    if (Platform.OS === 'web') {
      setError('Use your browser site controls to allow camera and microphone access, then refresh this screen.');
      return;
    }
    Linking.openSettings().catch(() => {
      setError('Open ZannyChat in your device settings and allow camera and microphone access.');
    });
  }, []);

  const startLive = useCallback(async () => {
    if (!setupValid) {
      setError(!title ? 'Return to setup and add a title for your LIVE.' : 'Choose at least one invitee for a private LIVE.');
      return;
    }
    if (!mediaPermissionsGranted) {
      setError('Allow the required microphone and camera permissions before starting.');
      return;
    }
    if (!cameraPreviewReady) {
      setError('Wait for the camera preview to become ready before starting your video LIVE.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const connection = await backendFetch('/live', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          visibility,
          allowGuests,
          experienceMode,
          category,
          inviteeIds: visibility === 'private' ? inviteeIds : [],
        }),
      });
      if (!connection?.stream?.id || !connection?.livekitUrl || !connection?.token) {
        throw new Error(connection?.message || 'The server did not return a complete LIVE room connection.');
      }
      navigation.replace('LiveStream', {
        streamId: connection.stream.id,
        creatorMode: true,
      });
    } catch (startError) {
      setError(startError?.message || 'Could not start LIVE. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }, [
    allowGuests,
    cameraPreviewReady,
    category,
    description,
    experienceMode,
    inviteeIds,
    mediaPermissionsGranted,
    navigation,
    setupValid,
    title,
    visibility,
  ]);

  const cameraState = needsCamera
    ? activeCameraPermission?.granted ? 'granted' : 'required'
    : 'unavailable';
  const microphoneState = activeMicrophonePermission?.granted ? 'granted' : 'required';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={resolvedMode === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xxl || 36, alignItems: 'center' }}
      >
        <View style={{ width: '100%', maxWidth: 760, gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel="Return to LIVE setup"
              style={{ width: 48, height: 48, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '900', letterSpacing: 1.4 }]}>ZANNYCHAT · LIVE STUDIO</Text>
              <Text style={[typography.heading, { color: colors.textPrimary, fontSize: 25, marginTop: 2 }]}>Pre-flight check</Text>
            </View>
            <View style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, backgroundColor: hexToRgba(colors.gold || colors.accent, 0.13), borderWidth: 1, borderColor: hexToRgba(colors.gold || colors.accent, 0.28) }}>
              <Text style={[typography.caption, { color: colors.gold || colors.accent, fontWeight: '900' }]}>CREATOR</Text>
            </View>
          </View>

          <View style={{ borderRadius: 24, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: hexToRgba(colors.primary, 0.3) }}>
            <View style={{ padding: spacing.md, gap: 6 }}>
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '900', letterSpacing: 1.1 }]}>YOUR LIVE EXPERIENCE</Text>
              <Text style={[typography.heading, { color: colors.textPrimary, fontSize: 21 }]} numberOfLines={2}>{title || 'Untitled LIVE'}</Text>
              {!!description && <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 21 }]}>{description}</Text>}
              <Text style={[typography.body, { color: colors.textSecondary }]}>{MODE_LABELS[experienceMode]} · {category.charAt(0).toUpperCase() + category.slice(1)}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 5 }}>
                <View style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 11, backgroundColor: hexToRgba(colors.primary, 0.10) }}>
                  <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '800' }]}>{visibility === 'public' ? 'Public audience' : visibility === 'followers' ? 'Followers only' : 'Private invitations'}</Text>
                </View>
                {allowGuests && <View style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 11, backgroundColor: hexToRgba(colors.accent, 0.10) }}>
                  <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '800' }]}>Guest stage enabled · up to 5</Text>
                </View>}
                {visibility === 'private' && <View style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 11, backgroundColor: hexToRgba(colors.primary, 0.10) }}>
                  <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '800' }]}>{inviteeIds.length} invitees selected</Text>
                </View>}
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <View style={{ padding: spacing.md, gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Stage preview</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>{experienceMode === 'audio_room' ? 'Audio-first room · camera not required' : 'Check your framing before you go live'}</Text>
                </View>
                {needsCamera && activeCameraPermission?.granted && (
                  <TouchableOpacity
                    onPress={() => { setError(''); setCameraReady(false); setCameraFacing((current) => current === 'front' ? 'back' : 'front'); }}
                    accessibilityRole="button"
                    accessibilityLabel="Switch camera"
                    style={{ minWidth: 48, minHeight: 44, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }}
                  >
                    <Ionicons name="camera-reverse-outline" size={19} color={colors.textPrimary} />
                  </TouchableOpacity>
                )}
              </View>
              <View style={{ width: '100%', aspectRatio: 16 / 9, minHeight: 180, maxHeight: 360, borderRadius: 19, overflow: 'hidden', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                {needsCamera && activeCameraPermission?.granted && isFocused ? (
                  <>
                    <CameraView
                      style={{ width: '100%', height: '100%' }}
                      facing={cameraFacing}
                      onCameraReady={() => setCameraReady(true)}
                      onMountError={(event) => { setCameraReady(false); setError(event?.message || 'Camera preview is unavailable on this device.'); }}
                    />
                    <View pointerEvents="none" style={{ position: 'absolute', left: 12, right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: 'rgba(4,6,18,0.78)' }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>{cameraReady ? 'CAMERA PREVIEW READY' : 'STARTING CAMERA…'}</Text>
                      </View>
                      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: cameraReady ? colors.success : colors.primary }} />
                    </View>
                  </>
                ) : (
                  <View style={{ alignItems: 'center', justifyContent: 'center', padding: 22, gap: 10 }}>
                    <View style={{ width: 68, height: 68, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: hexToRgba(colors.primary, 0.14), borderWidth: 1, borderColor: hexToRgba(colors.primary, 0.25) }}>
                      <Ionicons name={experienceMode === 'audio_room' ? 'mic' : 'videocam-outline'} size={30} color={colors.primary} />
                    </View>
                    <Text style={[typography.bodyStrong, { color: colors.textPrimary, textAlign: 'center' }]}>{experienceMode === 'audio_room' ? 'Your voice stage is ready to set up' : activeCameraPermission?.granted ? 'Camera preview is paused' : 'Camera access is needed'}</Text>
                    <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', lineHeight: 19 }]}>{experienceMode === 'audio_room' ? 'Your camera stays off. You can focus on the conversation and manage speakers from the room.' : 'Allow camera access to preview your framing. The camera preview stops when you leave this screen.'}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={{ borderRadius: 22, padding: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginBottom: 4 }]}>Device permissions</Text>
            <PermissionRow icon="mic-outline" label="Microphone" detail="Needed for your voice and audience interaction." state={microphoneState} colors={colors} typography={typography} />
            <PermissionRow icon="videocam-outline" label="Camera" detail={needsCamera ? 'Needed for your video stage.' : 'Audio Room does not use the camera.'} state={cameraState} colors={colors} typography={typography} />
            <TouchableOpacity
              onPress={requestMediaAccess}
              disabled={permissionBusy || mediaPermissionsGranted}
              accessibilityRole="button"
              accessibilityLabel={mediaPermissionsGranted ? 'Media permissions granted' : needsCamera ? 'Allow camera and microphone permissions' : 'Allow microphone permission'}
              style={{ minHeight: 48, marginTop: spacing.md, borderRadius: 15, borderWidth: 1, borderColor: mediaPermissionsGranted ? colors.success : colors.primary, backgroundColor: hexToRgba(mediaPermissionsGranted ? colors.success : colors.primary, 0.12), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: permissionBusy || mediaPermissionsGranted ? 0.72 : 1 }}
            >
              {permissionBusy ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name={mediaPermissionsGranted ? 'checkmark-circle' : 'shield-checkmark-outline'} size={18} color={mediaPermissionsGranted ? colors.success : colors.primary} />}
              <Text style={[typography.bodyStrong, { color: mediaPermissionsGranted ? colors.success : colors.primary }]}>{permissionBusy ? 'Checking permissions…' : mediaPermissionsGranted ? 'Permissions granted' : 'Allow device access'}</Text>
            </TouchableOpacity>
            {((activeCameraPermission && !activeCameraPermission.granted && activeCameraPermission.canAskAgain === false) || (activeMicrophonePermission && !activeMicrophonePermission.granted && activeMicrophonePermission.canAskAgain === false)) && (
              <TouchableOpacity onPress={openPermissionSettings} accessibilityRole="button" accessibilityLabel="Open device settings for LIVE permissions" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 5 }}>
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '800' }]}>{Platform.OS === 'web' ? 'How to allow browser access' : 'Open device settings'}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ borderRadius: 20, padding: spacing.md, backgroundColor: hexToRgba(colors.gold || colors.accent, 0.08), borderWidth: 1, borderColor: hexToRgba(colors.gold || colors.accent, 0.2), flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <Ionicons name="shield-checkmark-outline" size={19} color={colors.gold || colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>A considered, safe LIVE</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 19, marginTop: 4 }]}>Share only content you have the right to broadcast. Treat guests and viewers respectfully. You can mute, remove and report participants from the LIVE controls.</Text>
            </View>
          </View>

          {!title && <Text style={[typography.caption, { color: colors.danger }]}>Return to LIVE setup and add a title before starting.</Text>}
          {visibility === 'private' && !privateInviteesValid && <Text style={[typography.caption, { color: colors.danger }]}>Return to LIVE setup and choose at least one private invitee.</Text>}
          {!!error && (
            <View accessibilityRole="alert" style={{ padding: spacing.md, borderRadius: 15, backgroundColor: hexToRgba(colors.danger, 0.10), borderWidth: 1, borderColor: hexToRgba(colors.danger, 0.28) }}>
              <Text style={[typography.caption, { color: colors.danger, lineHeight: 19 }]}>{error}</Text>
            </View>
          )}

          {needsCamera && activeCameraPermission?.granted && !cameraReady && (
            <Text accessibilityRole="status" style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', lineHeight: 18 }]}>
              Waiting for the camera preview. LIVE room creation stays locked until your camera is ready.
            </Text>
          )}
          <TouchableOpacity
            onPress={startLive}
            disabled={!canStart}
            accessibilityRole="button"
            accessibilityLabel={experienceMode === 'audio_room' ? 'Start audio LIVE room' : experienceMode === 'video_chat' ? 'Start video LIVE chat' : 'Start LIVE broadcast'}
            accessibilityState={{ disabled: !canStart, busy }}
            style={{ minHeight: 54, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, opacity: canStart ? 1 : 0.45, shadowColor: colors.primary, shadowOpacity: canStart ? 0.24 : 0, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: canStart ? 5 : 0 }}
          >
            {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Ionicons name="radio" size={19} color={colors.onPrimary} />}
            <Text style={[typography.bodyStrong, { color: colors.onPrimary, fontSize: 15 }]}>{busy ? 'Preparing your LIVE…' : 'Start LIVE'}</Text>
          </TouchableOpacity>
          <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', lineHeight: 18 }]}>Your stage is created only after you confirm Start LIVE. You can still return to change your title, audience or experience mode.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
