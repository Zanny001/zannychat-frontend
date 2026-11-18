import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, FlatList, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Ionicons } from '@expo/vector-icons';
import { AudioSession, LiveKitRoom, VideoTrack, isTrackReference, useRoomContext, useTracks } from '@livekit/react-native';
import { RoomEvent, Track } from 'livekit-client';
import { backendFetch } from '../services/backendClient';
import { supabase, SUPABASE_ENABLED } from '../services/supabaseClient';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../utils/color';

const LIVE_REACTION_EMOJI = Object.freeze({ heart: '❤️', clap: '👏', laugh: '😂', wow: '😮', fire: '🔥', idea: '💡', support: '🙌' });
const isAppForeground = () => !AppState.currentState || AppState.currentState === 'active';

async function chooseNativeAudioOutput() {
  try {
    if (Platform.OS === 'ios') {
      await AudioSession.showAudioRoutePicker();
      return;
    }
    const outputs = await AudioSession.getAudioOutputs();
    const choices = ['speaker', 'earpiece'].filter((output) => outputs.includes(output));
    if (!choices.length) {
      Alert.alert('Audio output', 'No alternate audio output is currently available.');
      return;
    }
    Alert.alert('Audio output', 'Choose where LIVE audio should play.', [
      ...choices.map((output) => ({
        text: output === 'speaker' ? 'Speaker' : 'Phone earpiece',
        onPress: () => AudioSession.selectAudioOutput(output).catch(() => {
          Alert.alert('Audio output unavailable', 'The selected audio output could not be activated.');
        }),
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  } catch (_) {
    Alert.alert('Audio output unavailable', 'Could not load available audio outputs.');
  }
}


function FloatingReaction({ item, index, onComplete }) {
  const progress = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    progress.set(withTiming(1, {
      duration: reducedMotion ? 250 : 1800,
      easing: Easing.linear,
      reduceMotion: ReduceMotion.System,
    }, (finished) => {
      if (finished) scheduleOnRN(onComplete, item.id);
    }));
    return () => cancelAnimation(progress);
  }, [item.id, onComplete, progress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => {
    const value = progress.get();
    return {
      opacity: interpolate(value, [0, 0.15, 0.8, 1], [0, 1, 1, 0]),
      transform: [
        { translateY: interpolate(value, [0, 1], [0, reducedMotion ? 0 : -210]) },
        { scale: interpolate(value, [0, 0.2, 1], [reducedMotion ? 0.96 : 0.65, 1.2, 1]) },
      ],
    };
  });

  return (
    <Animated.Text pointerEvents="none" style={[{ position: 'absolute', bottom: 26, left: (15 + (index * 17) % 70) + '%', fontSize: 32 }, animatedStyle]}>
      {LIVE_REACTION_EMOJI[item.reaction] || LIVE_REACTION_EMOJI.heart}
    </Animated.Text>
  );
}

function LiveMedia({ streamId, creatorId, creatorMode, publisherMode, cameraEnabled, microphoneEnabled, onToggleCamera, onToggleMicrophone, moderatorMode, canManageGuests, canRequestGuest, guestApproved, guestRequestStatus, guestRequests, showGuestRequests, title, comments, reports, showReports, participants, showParticipants, draft, setDraft, onComment, onReact, floatingReactions, onRemoveFloatingReaction, onReport, onHide, onEnd, onToggleReports, onReviewReport, onToggleParticipants, onSetModerator, onInviteGuest, onMuteGuest, onRemoveGuest, onSpotlightGuest, onDemoteToViewer, replayEnabled, replayStatus, replayBusy, onStartReplay, onStopReplay, onViewReplay, onRequestGuest, onJoinGuest, onToggleGuestRequests, onReviewGuestRequest, busy }) {
  const { colors, typography } = useTheme();
  const room = useRoomContext();
  const [showOverlayMenu, setShowOverlayMenu] = useState(false);
  const [showComments, setShowComments] = useState(true);
  const [focusedStageIdentity, setFocusedStageIdentity] = useState(null);
  const connectedViewerCount = participants.filter((item) => item.joined && item.role === 'viewer').length;
  const onStageGuestCount = participants.filter((item) => item.joined && item.role === 'guest').length;
  const availableGuestSlots = Math.max(0, 5 - onStageGuestCount);
  useEffect(() => {
    let active = true;
    const heartbeat = () => {
      if (!active || !isAppForeground() || room.state !== 'connected' || !streamId) return;
      backendFetch(`/live/${streamId}/heartbeat`, { method: 'POST' })
        .catch((error) => { if (active) console.warn('[live] presence heartbeat failed:', error?.message || error); });
    };
    heartbeat();
    room.on(RoomEvent.Connected, heartbeat);
    room.on(RoomEvent.Reconnected, heartbeat);
    const interval = setInterval(heartbeat, 30_000);
    return () => {
      active = false;
      clearInterval(interval);
      room.off(RoomEvent.Connected, heartbeat);
      room.off(RoomEvent.Reconnected, heartbeat);
    };
  }, [room, streamId]);
  const [spotlightUserId, setSpotlightUserId] = useState(() => (
    [...room.remoteParticipants.values()].find((participant) => participant.attributes?.zannychat_spotlight === 'true')?.identity || null
  ));
  useEffect(() => {
    const onParticipantAttributesChanged = (_changed, participant) => {
      const active = participant.attributes?.zannychat_spotlight === 'true';
      setSpotlightUserId((current) => active ? participant.identity : (current === participant.identity ? null : current));
    };
    room.on(RoomEvent.ParticipantAttributesChanged, onParticipantAttributesChanged);
    return () => room.off(RoomEvent.ParticipantAttributesChanged, onParticipantAttributesChanged);
  }, [room]);
  useEffect(() => {
    const onParticipantPermissionsChanged = (_previousPermissions, participant) => {
      if (participant.identity === room.localParticipant.identity && participant.permissions?.canPublish === false) {
        onDemoteToViewer?.();
      }
    };
    room.on(RoomEvent.ParticipantPermissionsChanged, onParticipantPermissionsChanged);
    return () => room.off(RoomEvent.ParticipantPermissionsChanged, onParticipantPermissionsChanged);
  }, [room, onDemoteToViewer]);
  const tracks = useTracks([Track.Source.Camera]);
  const audioTracks = useTracks([Track.Source.Microphone]);
  const videos = tracks.filter(isTrackReference);
  const spotlightVideo = videos.find((track) => track.participant.identity === spotlightUserId);
  const creatorVideo = videos.find((track) => track.participant.identity === creatorId);
  const focusedStageVideo = videos.find((track) => track.participant.identity === focusedStageIdentity);
  const mainStageVideo = focusedStageVideo || spotlightVideo || creatorVideo || videos[0] || null;
  const floatingGuestVideos = mainStageVideo
    ? videos.filter((track) => track.participant.identity !== mainStageVideo.participant.identity)
    : [];
  const videoIdentities = new Set(videos.map((track) => track.participant.identity));
  const audioOnlyParticipants = audioTracks.filter(isTrackReference)
    .filter((track) => !track.participant.isLocal && !videoIdentities.has(track.participant.identity));
  const hasLocalAudioOnly = publisherMode && microphoneEnabled && !cameraEnabled;
  const handleToggleCamera = useCallback(async () => {
    const nextEnabled = !cameraEnabled;
    try {
      await room.localParticipant.setCameraEnabled(nextEnabled);
      onToggleCamera(nextEnabled);
    } catch (error) {
      Alert.alert('Camera unavailable', error?.message || 'Camera permission is unavailable.');
    }
  }, [cameraEnabled, onToggleCamera, room]);
  const handleToggleMicrophone = useCallback(async () => {
    const nextEnabled = !microphoneEnabled;
    try {
      await room.localParticipant.setMicrophoneEnabled(nextEnabled);
      onToggleMicrophone(nextEnabled);
    } catch (error) {
      Alert.alert('Microphone unavailable', error?.message || 'Microphone permission is unavailable.');
    }
  }, [microphoneEnabled, onToggleMicrophone, room]);
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ position: 'absolute', zIndex: 20, top: Platform.OS === 'android' ? 38 : 52, left: 14, right: 14, padding: 10, borderRadius: 22, backgroundColor: hexToRgba(colors.surface, 0.97), borderWidth: 1, borderColor: hexToRgba(colors.accent, 0.34), shadowColor: colors.primary, shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ backgroundColor: colors.danger, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: hexToRgba(colors.danger, 0.4) }}>
              <Text style={[typography.small, { color: colors.onDanger, fontWeight: '900', letterSpacing: 0.5 }]}>● LIVE</Text>
            </View>
            <Text numberOfLines={1} style={[typography.bodyStrong, { color: '#FFFFFF', flex: 1, minWidth: 0 }]}>{title}</Text>
            <TouchableOpacity onPress={onEnd} accessibilityRole="button" accessibilityLabel={creatorMode ? 'End LIVE stream' : 'Leave LIVE stream'} style={{ backgroundColor: hexToRgba(colors.surface, 0.92), borderWidth: 1, borderColor: colors.border, width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14 }}>
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setShowOverlayMenu((value) => !value)} accessibilityRole="button" accessibilityLabel={showOverlayMenu ? 'Close LIVE controls menu' : 'Open LIVE controls menu'} style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: hexToRgba(colors.primary, 0.16), borderWidth: 1, borderColor: hexToRgba(colors.primary, 0.3) }}>
            <Ionicons name={showOverlayMenu ? 'close' : 'ellipsis-horizontal'} size={21} color={colors.textPrimary} />
          </TouchableOpacity>
          {showOverlayMenu && <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8, paddingRight: 4 }}>
            <TouchableOpacity onPress={() => setShowComments((value) => !value)} accessibilityRole="button" accessibilityLabel={showComments ? 'Hide LIVE comments and reactions' : 'Show LIVE comments and reactions'} style={{ backgroundColor: hexToRgba(colors.surface, 0.88), borderWidth: 1, borderColor: colors.border, minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderRadius: 13 }}>
              <Ionicons name={showComments ? 'chatbubbles-outline' : 'chatbubble-outline'} size={19} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={chooseNativeAudioOutput} accessibilityRole="button" accessibilityLabel="Choose LIVE audio output" style={{ backgroundColor: hexToRgba(colors.surface, 0.88), borderWidth: 1, borderColor: colors.border, minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderRadius: 13 }}>
              <Ionicons name="volume-high-outline" size={19} color={colors.textPrimary} />
            </TouchableOpacity>
            {creatorMode && <TouchableOpacity onPress={onToggleParticipants} accessibilityRole="button" accessibilityLabel="Open Creator Studio" style={{ backgroundColor: hexToRgba(colors.surface, 0.88), borderWidth: 1, borderColor: colors.border, minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderRadius: 13 }}><Ionicons name="people-outline" size={19} color={colors.textPrimary} /></TouchableOpacity>}
            {creatorMode && canManageGuests && <TouchableOpacity onPress={onToggleGuestRequests} accessibilityRole="button" accessibilityLabel="Review guest requests" style={{ backgroundColor: hexToRgba(colors.surface, 0.88), borderWidth: 1, borderColor: colors.border, minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderRadius: 13 }}><Ionicons name="person-add-outline" size={19} color={colors.textPrimary} /></TouchableOpacity>}
            {creatorMode && replayEnabled && <TouchableOpacity onPress={replayStatus === 'ready' ? onViewReplay : replayStatus === 'recording' ? onStopReplay : onStartReplay} disabled={replayBusy || ['starting', 'processing'].includes(replayStatus)} accessibilityRole="button" accessibilityLabel={replayStatus === 'ready' ? 'Watch saved LIVE replay' : replayStatus === 'recording' ? 'Stop LIVE replay recording' : 'Start LIVE replay recording'} style={{ backgroundColor: hexToRgba(colors.surface, 0.88), borderWidth: 1, borderColor: replayStatus === 'recording' ? colors.danger : colors.border, minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderRadius: 13 }}>
              {replayBusy || ['starting', 'processing'].includes(replayStatus) ? <ActivityIndicator size="small" color={colors.accent} /> : <Ionicons name={replayStatus === 'ready' ? 'play-circle-outline' : replayStatus === 'recording' ? 'stop-circle-outline' : 'radio-button-on-outline'} size={19} color={replayStatus === 'recording' ? colors.danger : colors.accent} />}
            </TouchableOpacity>}
            {moderatorMode && <TouchableOpacity onPress={onToggleReports} accessibilityRole="button" accessibilityLabel="Open LIVE safety reports" style={{ backgroundColor: hexToRgba(colors.surface, 0.88), borderWidth: 1, borderColor: colors.border, minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderRadius: 13 }}><Ionicons name="shield-checkmark-outline" size={19} color={colors.textPrimary} /></TouchableOpacity>}
          </ScrollView>}
        </View>
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#05050A' }}>
          {mainStageVideo ? (
            <View style={{ ...StyleSheet.absoluteFillObject, overflow: 'hidden', backgroundColor: '#05050A' }}>
              <VideoTrack trackRef={mainStageVideo} objectFit="cover" style={{ width: '100%', height: '100%' }} />
              <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 190, backgroundColor: 'rgba(4,5,12,0.34)' }} />
              <View pointerEvents="none" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 330, backgroundColor: 'rgba(4,5,12,0.56)' }} />
              <View style={{ position: 'absolute', left: 16, bottom: 330, maxWidth: '72%', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 13, backgroundColor: 'rgba(5,6,14,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}>
                <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>{spotlightVideo?.participant.identity === mainStageVideo.participant.identity ? '✦ SPOTLIGHT' : mainStageVideo.participant.identity === creatorId ? 'HOST' : 'LIVE GUEST'}</Text>
                <Text numberOfLines={1} style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800', marginTop: 3 }}>{mainStageVideo.participant.name || mainStageVideo.participant.identity}</Text>
              </View>
            </View>
          ) : (
            <View style={{ ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 38, backgroundColor: colors.background }}>
              <View style={{ width: 94, height: 94, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: hexToRgba(colors.primary, 0.16), borderWidth: 1, borderColor: hexToRgba(colors.accent, 0.28) }}>
                <Ionicons name={audioOnlyParticipants.length || hasLocalAudioOnly ? 'mic' : 'videocam-outline'} size={42} color={colors.accent} />
              </View>
              <Text style={[typography.heading, { color: colors.textPrimary, marginTop: 18, textAlign: 'center' }]}>{audioOnlyParticipants.length || hasLocalAudioOnly ? 'LIVE audio is on' : creatorMode ? 'Your LIVE is starting' : 'Waiting for the creator video'}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 }]}>{audioOnlyParticipants.length || hasLocalAudioOnly ? 'The conversation continues while cameras are off.' : 'Your LIVE stage will appear here when video is available.'}</Text>
            </View>
          )}
          {floatingGuestVideos.length > 0 && (
            <View pointerEvents="box-none" style={{ position: 'absolute', right: 12, top: '25%', bottom: 250, justifyContent: 'center', gap: 8 }}>
              {floatingGuestVideos.slice(0, 3).map((item) => (
                <TouchableOpacity key={item.participant.identity} onPress={() => setFocusedStageIdentity(item.participant.identity)} activeOpacity={0.88} accessibilityRole="button" accessibilityLabel={'Focus LIVE video for ' + (item.participant.name || item.participant.identity)} style={{ width: 88, height: 118, borderRadius: 17, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1.5, borderColor: focusedStageIdentity === item.participant.identity || spotlightUserId === item.participant.identity ? colors.accent : 'rgba(255,255,255,0.82)', shadowColor: '#000000', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 9 }}>
                  <VideoTrack trackRef={item} objectFit="cover" style={{ width: '100%', height: '100%' }} />
                  <View style={{ position: 'absolute', left: 5, right: 5, bottom: 5, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.72)' }}>
                    <Text numberOfLines={1} style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>{item.participant.name || item.participant.identity}</Text>
                    <Text style={{ color: '#D9D9E8', fontSize: 8, fontWeight: '800', marginTop: 1 }}>{item.participant.identity === creatorId ? 'HOST' : 'GUEST'}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {floatingGuestVideos.length > 3 && <View style={{ alignSelf: 'flex-end', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.72)' }}><Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 11 }}>+{floatingGuestVideos.length - 3}</Text></View>}
            </View>
          )}
          {videos.length > 0 && (audioOnlyParticipants.length > 0 || hasLocalAudioOnly) && (
            <View style={{ position: 'absolute', left: 14, right: 126, bottom: 330, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {audioOnlyParticipants.map((track) => <View key={track.participant.identity} style={{ paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.62)' }}><Text style={{ color: '#FFFFFF', fontSize: 10 }}>{track.participant.name || track.participant.identity} · Audio</Text></View>)}
              {hasLocalAudioOnly && <View style={{ paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.62)' }}><Text style={{ color: '#FFFFFF', fontSize: 10 }}>You · Audio</Text></View>}
            </View>
          )}
          <View pointerEvents="none" style={{ ...StyleSheet.absoluteFillObject }}>
            {floatingReactions.map((item, index) => <FloatingReaction key={item.id} item={item} index={index} onComplete={onRemoveFloatingReaction} />)}
          </View>
        </View>
        {publisherMode && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, position: 'absolute', left: 14, right: 14, bottom: Platform.OS === 'ios' ? 88 : 76, zIndex: 18, marginHorizontal: 0, marginTop: 0, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 20, backgroundColor: hexToRgba(colors.surface, 0.94), borderWidth: 1, borderColor: colors.border }}>
            <TouchableOpacity onPress={handleToggleCamera} accessibilityRole="button" accessibilityLabel={cameraEnabled ? 'Turn camera off and keep audio live' : 'Turn camera on'} style={{ minHeight: 48, minWidth: 132, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12, borderRadius: 14, backgroundColor: cameraEnabled ? hexToRgba(colors.accent, 0.2) : hexToRgba(colors.surface, 0.9), borderWidth: 1, borderColor: colors.border }}>
              <Ionicons name={cameraEnabled ? 'videocam' : 'videocam-off'} size={18} color={colors.textPrimary} />
              <Text style={[typography.small, { color: colors.textPrimary }]}>{cameraEnabled ? 'Camera on' : 'Camera off'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleToggleMicrophone} accessibilityRole="button" accessibilityLabel={microphoneEnabled ? 'Mute microphone' : 'Unmute microphone'} style={{ minHeight: 44, minWidth: 132, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12, borderRadius: 14, backgroundColor: microphoneEnabled ? hexToRgba(colors.accent, 0.2) : hexToRgba(colors.danger, 0.16), borderWidth: 1, borderColor: colors.border }}>
              <Ionicons name={microphoneEnabled ? 'mic' : 'mic-off'} size={18} color={colors.textPrimary} />
              <Text style={[typography.small, { color: colors.textPrimary }]}>{microphoneEnabled ? 'Mic on' : 'Mic muted'}</Text>
            </TouchableOpacity>
          </View>
        )}
        {showComments && <View style={{ position: 'absolute', left: 14, right: 126, bottom: Platform.OS === 'ios' ? 220 : 208, zIndex: 17, maxHeight: 72, marginHorizontal: 0, marginTop: 0, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 17, backgroundColor: 'rgba(8,9,18,0.52)', borderWidth: 1, borderColor: colors.border }}>
          <FlatList keyboardShouldPersistTaps="handled" data={comments.slice(-2)} keyExtractor={(item) => item.id} renderItem={({ item }) => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 }}>
              <Text numberOfLines={1} style={[typography.small, { color: colors.accent, flexShrink: 1, maxWidth: '38%' }]}>{item.user_name || 'ZannyChat user'}</Text>
              <Text style={[typography.caption, { color: '#FFFFFF', flex: 1, minWidth: 0 }]}>{item.body}</Text>
              {moderatorMode && <TouchableOpacity onPress={() => onHide(item.id)} accessibilityRole="button" accessibilityLabel="Hide LIVE comment"><Ionicons name="eye-off-outline" color={colors.textSecondary} size={17} /></TouchableOpacity>}
            </View>
          )} ListEmptyComponent={<Text style={{ color: colors.textSecondary, paddingVertical: 8 }}>Be the first to say hello.</Text>} />
        </View>}
        {showParticipants && creatorMode && (
          <View style={{ position: 'absolute', left: 14, right: 14, top: Platform.OS === 'android' ? 100 : 114, zIndex: 30, maxHeight: 280, padding: 15, borderRadius: 21, backgroundColor: hexToRgba(colors.surface, 0.97), borderWidth: 1, borderColor: hexToRgba(colors.accent, 0.28) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <View>
                <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 17 }]}>Creator Studio</Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>Live audience and stage controls</Text>
              </View>
              <View style={{ paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, backgroundColor: hexToRgba(colors.accent, 0.14) }}>
                <Text style={[typography.caption, { color: colors.accent, fontWeight: '800' }]}>HOST</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 7, marginBottom: 10 }}>
              <View style={{ flex: 1, minWidth: 0, padding: 11, borderRadius: 14, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
                <Text style={[typography.heading, { color: colors.textPrimary }]}>{connectedViewerCount}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Viewers listed</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0, padding: 9, borderRadius: 12, backgroundColor: colors.surface }}>
                <Text style={[typography.heading, { color: colors.textPrimary }]}>{onStageGuestCount}/5</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Guests on stage</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0, padding: 9, borderRadius: 12, backgroundColor: colors.surface }}>
                <Text style={[typography.heading, { color: colors.textPrimary }]}>{availableGuestSlots}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Open slots</Text>
              </View>
            </View>
            <FlatList keyboardShouldPersistTaps="handled" data={participants} keyExtractor={(item) => item.userId} renderItem={({ item }) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingVertical: 7, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Text numberOfLines={1} style={[typography.small, { color: colors.textPrimary, flex: 1, minWidth: 90 }]}>{item.name}{item.stage ? ' · On stage' : !item.joined ? ' · offline' : ''}</Text>
                {canManageGuests && item.joined && item.role === 'viewer' && <TouchableOpacity onPress={() => onInviteGuest(item.userId)} disabled={busy || item.guestInvited} accessibilityRole="button" accessibilityLabel={item.guestInvited ? 'Guest already invited to stage' : 'Invite viewer to LIVE stage'}>
                  <Text style={{ color: item.guestInvited ? colors.textSecondary : colors.accent, fontWeight: '800', fontSize: 10 }}>{item.guestInvited ? 'Invited' : 'Invite to stage'}</Text>
                </TouchableOpacity>}
                {item.stage && <TouchableOpacity onPress={() => onMuteGuest(item.userId, !item.microphoneMuted)} disabled={busy} accessibilityRole="button" accessibilityLabel={item.microphoneMuted ? 'Unmute guest microphone' : 'Mute guest microphone'}>
                  <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 10 }}>{item.microphoneMuted ? 'Unmute mic' : 'Mute mic'}</Text>
                </TouchableOpacity>}
                {item.stage && <TouchableOpacity onPress={() => onSpotlightGuest(item.userId, !item.spotlighted)} disabled={busy} accessibilityRole="button" accessibilityLabel={item.spotlighted ? 'Remove guest spotlight' : 'Spotlight guest'}>
                  <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 10 }}>{item.spotlighted ? 'Unspotlight' : 'Spotlight'}</Text>
                </TouchableOpacity>}
                {item.stage && <TouchableOpacity onPress={() => onRemoveGuest(item.userId)} disabled={busy} accessibilityRole="button" accessibilityLabel="Remove guest from LIVE stage">
                  <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 10 }}>Remove guest</Text>
                </TouchableOpacity>}
                {(item.moderator || item.joined) && <TouchableOpacity onPress={() => onSetModerator(item.userId, !item.moderator)} accessibilityRole="button" accessibilityLabel={item.moderator ? `Remove ${item.name} as LIVE moderator` : `Make ${item.name} a LIVE moderator`}>
                  <Text style={{ color: item.moderator ? colors.danger : colors.accent, fontWeight: '800', fontSize: 10 }}>{item.moderator ? 'Remove moderator' : 'Make moderator'}</Text>
                </TouchableOpacity>}
              </View>
            )} ListEmptyComponent={<Text style={[typography.caption, { color: colors.textSecondary }]}>No viewers are currently connected.</Text>} />
          </View>
        )}
        {showGuestRequests && canManageGuests && (
          <View style={{ position: 'absolute', left: 14, right: 14, top: Platform.OS === 'android' ? 100 : 114, zIndex: 30, maxHeight: 210, padding: 14, borderRadius: 20, backgroundColor: hexToRgba(colors.surface, 0.97), borderWidth: 1, borderColor: hexToRgba(colors.primary, 0.24) }}>
            <Text style={{ color: colors.textPrimary, fontWeight: '900', marginBottom: 6 }}>Guest requests ({guestRequests.length})</Text>
            <FlatList keyboardShouldPersistTaps="handled" data={guestRequests} keyExtractor={(item) => item.user_id} renderItem={({ item }) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Text numberOfLines={1} style={{ color: colors.textPrimary, flex: 1, fontSize: 12 }}>{item.name}</Text>
                <TouchableOpacity onPress={() => onReviewGuestRequest(item.user_id, 'accepted')} accessibilityRole="button" accessibilityLabel={`Approve LIVE guest request from ${item.name}`}><Text style={{ color: colors.success, fontWeight: '800', fontSize: 11, marginRight: 10 }}>Approve</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => onReviewGuestRequest(item.user_id, 'declined')} accessibilityRole="button" accessibilityLabel={`Decline LIVE guest request from ${item.name}`}><Text style={{ color: colors.danger, fontWeight: '800', fontSize: 11 }}>Decline</Text></TouchableOpacity>
              </View>
            )} ListEmptyComponent={<Text style={{ color: colors.textSecondary, fontSize: 12 }}>No pending guest requests.</Text>} />
          </View>
        )}
        {showReports && moderatorMode && (
          <View style={{ position: 'absolute', left: 14, right: 14, top: Platform.OS === 'android' ? 100 : 114, zIndex: 30, maxHeight: 210, padding: 14, borderRadius: 20, backgroundColor: hexToRgba(colors.surface, 0.97), borderWidth: 1, borderColor: hexToRgba(colors.danger, 0.22) }}>
            <Text style={{ color: colors.textPrimary, fontWeight: '900', marginBottom: 6 }}>LIVE safety reports ({reports.length})</Text>
            <FlatList keyboardShouldPersistTaps="handled" data={reports} keyExtractor={(item) => item.id} renderItem={({ item }) => (
              <View style={{ paddingVertical: 7, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{item.reason} · {item.status}</Text>
                {!!item.details && <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>{item.details}</Text>}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                  {item.status === 'open' && <TouchableOpacity onPress={() => onReviewReport(item.id, 'reviewing')} accessibilityRole="button" accessibilityLabel={`Review ${item.reason} LIVE report`}><Text style={{ color: colors.accent, fontWeight: '800', fontSize: 11 }}>Review</Text></TouchableOpacity>}
                  {['open','reviewing'].includes(item.status) && <TouchableOpacity onPress={() => onReviewReport(item.id, 'resolved')} accessibilityRole="button" accessibilityLabel={`Resolve ${item.reason} LIVE report`}><Text style={{ color: colors.success, fontWeight: '800', fontSize: 11 }}>Resolve</Text></TouchableOpacity>}
                  {['open','reviewing'].includes(item.status) && <TouchableOpacity onPress={() => onReviewReport(item.id, 'dismissed')} accessibilityRole="button" accessibilityLabel={`Dismiss ${item.reason} LIVE report`}><Text style={{ color: colors.danger, fontWeight: '800', fontSize: 11 }}>Dismiss</Text></TouchableOpacity>}
                </View>
              </View>
            )} ListEmptyComponent={<Text style={{ color: colors.textSecondary, fontSize: 12 }}>No reports have been submitted.</Text>} />
          </View>
        )}
        {showComments && <View style={{ position: 'absolute', left: 12, right: 120, bottom: Platform.OS === 'ios' ? 157 : 145, zIndex: 18, flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', gap: 3, paddingHorizontal: 0, paddingTop: 0 }}>
          {Object.entries(LIVE_REACTION_EMOJI).map(([reaction, emoji]) => (
            <TouchableOpacity key={reaction} disabled={busy} onPress={() => onReact(reaction)} accessibilityRole="button" accessibilityLabel={'Send ' + reaction + ' reaction'} style={{ minWidth: 34, minHeight: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: hexToRgba(colors.surface, 0.92), borderWidth: 1, borderColor: colors.border, paddingHorizontal: 7, borderRadius: 16 }}>
              <Text style={{ fontSize: 20 }}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, position: 'absolute', left: 12, right: 12, bottom: Platform.OS === 'ios' ? 24 : 12, zIndex: 19, marginHorizontal: 0, marginTop: 0, marginBottom: 0, padding: 8, paddingBottom: 8, borderRadius: 20, backgroundColor: 'rgba(8,9,18,0.88)', borderWidth: 1, borderColor: colors.border }}>
          <TextInput value={draft} onChangeText={(v) => setDraft(v.slice(0, 500))} maxLength={500} placeholder="Say something kind…" placeholderTextColor={colors.textSecondary} style={{ flex: 1, minWidth: 0, backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11 }} />
          <TouchableOpacity disabled={busy || !draft.trim()} onPress={onComment} accessibilityRole="button" accessibilityLabel="Send LIVE comment" style={{ backgroundColor: colors.primary, padding: 12, borderRadius: 14 }}><Ionicons name="send" size={19} color={colors.onPrimary} /></TouchableOpacity>

          {!creatorMode && canRequestGuest && <TouchableOpacity disabled={busy || (guestRequestStatus === 'requested' && !guestApproved)} onPress={guestApproved ? onJoinGuest : onRequestGuest} accessibilityRole="button" accessibilityLabel={guestApproved ? 'Join LIVE as guest' : guestRequestStatus === 'requested' ? 'Guest request pending' : 'Request to join LIVE on stage'} style={{ backgroundColor: hexToRgba(colors.primary, 0.24), padding: 12, borderRadius: 14 }}><Ionicons name={guestApproved ? 'checkmark-circle-outline' : 'person-add-outline'} size={19} color={colors.onPrimary} /></TouchableOpacity>}
          {!creatorMode && <TouchableOpacity disabled={busy} onPress={onReport} accessibilityRole="button" accessibilityLabel="Report LIVE stream" style={{ backgroundColor: colors.surfaceAlt, padding: 12, borderRadius: 14 }}><Ionicons name="flag-outline" size={19} color={colors.textPrimary} /></TouchableOpacity>}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function LiveStreamScreen({ route, navigation }) {
  const { colors } = useTheme();
  const initialConnection = route.params?.connection && typeof route.params.connection === 'object'
    ? route.params.connection
    : null;
  const streamId = route.params?.streamId || initialConnection?.stream?.id || null;
  const [connection, setConnection] = useState(initialConnection);
  const [connectionLoading, setConnectionLoading] = useState(Boolean(streamId && !initialConnection));
  const creatorMode = connection?.role === 'creator';
  const moderatorMode = Boolean(creatorMode || connection?.canModerate);
  const stream = connection?.stream;
  const [demotedToViewer, setDemotedToViewer] = useState(false);
  const [stageNotice, setStageNotice] = useState('');
  const publisherMode = Boolean(creatorMode || (connection?.role === 'guest' && connection?.canPublish === true && !demotedToViewer));
  const canManageGuests = Boolean(creatorMode && stream?.allow_guests);
  const canRequestGuest = Boolean(!publisherMode && stream?.allow_guests);
  const [comments, setComments] = useState([]);
  const [reports, setReports] = useState([]);
  const [showReports, setShowReports] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const [guestRequests, setGuestRequests] = useState([]);
  const [showGuestRequests, setShowGuestRequests] = useState(false);
  const seenGuestRequestIds = useRef(new Set());
  const [guestApproved, setGuestApproved] = useState(false);
  const [guestRequestStatus, setGuestRequestStatus] = useState('none');
  const [floatingReactions, setFloatingReactions] = useState([]);
  const seenReactionIds = useRef(new Set());
  const commentsRefreshInFlight = useRef(false);
  const guestStatusRefreshInFlight = useRef(false);
  const guestRequestsRefreshInFlight = useRef(false);
  const replayRefreshInFlight = useRef(false);
  const studioParticipantsRefreshInFlight = useRef(false);
  const [cameraEnabled, setCameraEnabled] = useState(publisherMode);
  useEffect(() => {
    setDemotedToViewer(false);
    setStageNotice('');
    setCameraEnabled(publisherMode);
    setMicrophoneEnabled(publisherMode);
  }, [connection?.token]);
  const handleDemotedToViewer = useCallback(() => {
    setDemotedToViewer(true);
    setCameraEnabled(false);
    setMicrophoneEnabled(false);
    setStageNotice('The creator moved you to the audience. You can keep watching the LIVE.');
  }, []);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(publisherMode);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [replayEnabled, setReplayEnabled] = useState(false);
  const [replay, setReplay] = useState(null);
  const [replayBusy, setReplayBusy] = useState(false);
  const [error, setError] = useState('');
  const endedRef = useRef(false);
  const leaveRef = useRef(null);
  const liveAuthOwnerRef = useRef(undefined);
  const connectionRequestRef = useRef(0);

  useEffect(() => {
    if (!streamId) {
      setConnection(null);
      setConnectionLoading(false);
      setError('This LIVE link is incomplete. Reopen it from LIVE Hub.');
      return undefined;
    }
    if (initialConnection?.stream?.id === streamId && initialConnection?.token && initialConnection?.livekitUrl) {
      setConnectionLoading(false);
      return undefined;
    }
    let active = true;
    const requestId = ++connectionRequestRef.current;
    setConnection(null);
    setConnectionLoading(true);
    setError('');
    backendFetch(`/live/${streamId}/join`, { method: 'POST' })
      .then((nextConnection) => {
        if (!nextConnection?.stream?.id || nextConnection.stream.id !== streamId
            || !nextConnection?.token || !nextConnection?.livekitUrl) {
          throw new Error('The server did not return a complete LIVE room connection.');
        }
        if (active && requestId === connectionRequestRef.current) setConnection(nextConnection);
      })
      .catch((joinError) => {
        if (active && requestId === connectionRequestRef.current) setError(joinError?.message || 'Could not join this LIVE stream.');
      })
      .finally(() => {
        if (active && requestId === connectionRequestRef.current) setConnectionLoading(false);
      });
    return () => {
      active = false;
      if (connectionRequestRef.current === requestId) connectionRequestRef.current += 1;
    };
  }, [streamId]);

  const refreshReplay = useCallback(async () => {
    if (!stream?.id || !creatorMode || !replayEnabled || !isAppForeground() || replayRefreshInFlight.current) return;
    replayRefreshInFlight.current = true;
    try {
      const result = await backendFetch(`/live/${stream.id}/replays`);
      const rows = Array.isArray(result?.replays) ? result.replays : [];
      const latest = rows.find((item) => ['starting', 'recording', 'processing', 'ready', 'failed'].includes(item.status));
      setReplay(latest || null);
    } catch (_) {
      // Keep the last known replay state during transient network failures.
    } finally {
      replayRefreshInFlight.current = false;
    }
  }, [stream?.id, creatorMode, replayEnabled]);

  useEffect(() => {
    if (!creatorMode) {
      setReplayEnabled(false);
      return undefined;
    }
    let active = true;
    backendFetch('/live/replays/config')
      .then((result) => { if (active) setReplayEnabled(Boolean(result?.enabled)); })
      .catch(() => { if (active) setReplayEnabled(false); });
    return () => { active = false; };
  }, [creatorMode]);

  useEffect(() => {
    if (!creatorMode || !replayEnabled || !stream?.id) return undefined;
    refreshReplay();
  }, [creatorMode, replayEnabled, stream?.id, refreshReplay]);

  useEffect(() => {
    if (!creatorMode || !replayEnabled || !stream?.id || !['starting', 'recording', 'processing'].includes(replay?.status)) return undefined;
    const interval = setInterval(refreshReplay, 5000);
    return () => clearInterval(interval);
  }, [creatorMode, replayEnabled, stream?.id, replay?.status, refreshReplay]);

  useEffect(() => {
    if (publisherMode) {
      setCameraEnabled(true);
      setMicrophoneEnabled(true);
    }
  }, [publisherMode]);

  const toggleCamera = (enabled) => setCameraEnabled(enabled);
  const toggleMicrophone = (enabled) => setMicrophoneEnabled(enabled);

  const refreshComments = useCallback(async () => {
    if (!stream?.id || !isAppForeground() || commentsRefreshInFlight.current) return;
    commentsRefreshInFlight.current = true;
    try {
      const result = await backendFetch(`/live/${stream.id}/comments`);
      setComments(Array.isArray(result?.comments) ? result.comments : []);
      setError('');
      const incomingReactions = (Array.isArray(result?.reactions) ? result.reactions : [])
        .filter((item) => item?.id && !seenReactionIds.current.has(item.id));
      incomingReactions.forEach((item) => {
        seenReactionIds.current.add(item.id);
        if (seenReactionIds.current.size > 500) {
          seenReactionIds.current.delete(seenReactionIds.current.values().next().value);
        }
      });
      if (incomingReactions.length) {
        setFloatingReactions((current) => [...current, ...incomingReactions].slice(-16));
      }
    } catch (e) {
      if (!endedRef.current) setError(e?.message || 'LIVE comments are unavailable.');
    } finally {
      commentsRefreshInFlight.current = false;
    }
  }, [stream?.id]);

  useEffect(() => {
    AudioSession.startAudioSession().catch(() => {});
    refreshComments();
    const interval = setInterval(refreshComments, 6000);
    return () => {
      clearInterval(interval);
      AudioSession.stopAudioSession();
    };
  }, [stream?.id, creatorMode, refreshComments]);

  useEffect(() => {
    if (!stream?.id || creatorMode || publisherMode || !stream.allow_guests) return undefined;
    let active = true;
    const checkApproval = async () => {
      if (!active || !isAppForeground() || guestStatusRefreshInFlight.current) return;
      guestStatusRefreshInFlight.current = true;
      try {
        const result = await backendFetch(`/live/${stream.id}/guest-status`);
        if (active) { setGuestRequestStatus(result?.status || 'none'); setGuestApproved(result?.status === 'accepted'); }
      } catch (_) {
        // Guest approval is also delivered by push; keep the last known state on poll failure.
      } finally {
        guestStatusRefreshInFlight.current = false;
      }
    };
    checkApproval();
    const interval = setInterval(checkApproval, 6000);
    return () => { active = false; clearInterval(interval); };
  }, [stream?.id, creatorMode, publisherMode, stream?.allow_guests]);

  useEffect(() => {
    if (!navigation?.addListener || !stream?.id) return undefined;
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (endedRef.current) return;
      event.preventDefault();
      leaveRef.current?.();
    });
    return unsubscribe;
  }, [navigation, stream?.id, creatorMode]);

  useEffect(() => {
    if (!canManageGuests || !stream?.id) return undefined;
    let active = true;
    const refreshGuestRequests = async () => {
      if (!active || !isAppForeground() || guestRequestsRefreshInFlight.current) return;
      guestRequestsRefreshInFlight.current = true;
      try {
        const result = await backendFetch(`/live/${stream.id}/guest-requests`);
        if (!active) return;
        const incoming = Array.isArray(result?.requests) ? result.requests : [];
        const incomingIds = new Set(incoming.map((item) => item.user_id));
        seenGuestRequestIds.current.forEach((userId) => {
          if (!incomingIds.has(userId)) seenGuestRequestIds.current.delete(userId);
        });
        const hasNewRequest = incoming.some((item) => !seenGuestRequestIds.current.has(item.user_id));
        incoming.forEach((item) => seenGuestRequestIds.current.add(item.user_id));
        setGuestRequests(incoming);
        // Surface each new request once; allow the creator to switch to other
        // stage controls without the poll repeatedly stealing panel focus.
        if (hasNewRequest) setShowGuestRequests(true);
      } catch (_) {
        // Avoid surfacing transient polling failures as creator-control failures.
      } finally {
        guestRequestsRefreshInFlight.current = false;
      }
    };
    refreshGuestRequests();
    const interval = setInterval(refreshGuestRequests, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [canManageGuests, stream?.id]);

  useEffect(() => {
    if (!SUPABASE_ENABLED || !supabase?.auth?.onAuthStateChange) return undefined;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user?.id || null;
      // INITIAL_SESSION establishes the owner; only a later identity change
      // should terminate an already active LIVE room.
      if (liveAuthOwnerRef.current === undefined) {
        liveAuthOwnerRef.current = nextUserId;
        return;
      }
      if (liveAuthOwnerRef.current === nextUserId) return;
      liveAuthOwnerRef.current = nextUserId;
      connectionRequestRef.current += 1;
      // Stop publisher/viewer tracks immediately and prevent the old join
      // request from restoring a connection after sign-out/account switch.
      endedRef.current = true;
      setConnection(null);
      setConnectionLoading(false);
      setCameraEnabled(false);
      setMicrophoneEnabled(false);
      setDemotedToViewer(false);
      setStageNotice('');
      setBusy(false);
      setDraft('');
      setReplayEnabled(false);
      setReplay(null);
      setReplayBusy(false);
      setComments([]);
      setReports([]);
      setShowReports(false);
      setParticipants([]);
      setGuestRequests([]);
      setFloatingReactions([]);
      seenGuestRequestIds.current.clear();
      seenReactionIds.current.clear();
      setGuestApproved(false);
      setGuestRequestStatus('none');
      setShowGuestRequests(false);
      setShowParticipants(false);
      setError('Your account changed. You left this LIVE. Reopen it from LIVE Hub.');
      if (navigation?.canGoBack?.()) navigation.goBack();
    });
    return () => data?.subscription?.unsubscribe?.();
  }, [navigation]);

  const leave = async () => {
    if (!stream?.id || endedRef.current || busy) return;
    endedRef.current = true;
    setBusy(true);
    try {
      await backendFetch(`/live/${stream.id}/${creatorMode ? 'end' : 'leave'}`, { method: 'POST' });
      setBusy(false);
      navigation.goBack();
    } catch (error) {
      endedRef.current = false;
      setBusy(false);
      Alert.alert(
        creatorMode ? 'Could not end LIVE' : 'Could not leave LIVE',
        error?.message || 'Your connection is still active. Check your network and try again.',
      );
    }
  };
  leaveRef.current = leave;

  const sendComment = async () => {
    if (!draft.trim() || !stream?.id) return;
    setBusy(true);
    try {
      const result = await backendFetch(`/live/${stream.id}/comment`, { method: 'POST', body: JSON.stringify({ body: draft.trim() }) });
      setComments((current) => [...current, result.comment].slice(-50));
      setDraft('');
    } catch (e) {
      Alert.alert('Comment not sent', e?.message || 'Please try again.');
    } finally { setBusy(false); }
  };

  const react = async (reaction = 'heart') => {
    if (!stream?.id) {
      Alert.alert('Reaction not sent', 'The LIVE room is still connecting. Please try again.');
      return;
    }
    try {
      const result = await backendFetch(`/live/${stream.id}/react`, { method: 'POST', body: JSON.stringify({ reaction }) });
      if (result?.accepted) await refreshComments();
    } catch (e) {
      Alert.alert('Reaction not sent', e?.message || 'Please try again.');
    }
  };
  const removeFloatingReaction = useCallback((reactionId) => {
    setFloatingReactions((current) => current.filter((item) => item.id !== reactionId));
  }, []);

  const report = () => Alert.alert('Report LIVE stream', 'Choose a reason for reporting this stream.', [
    { text: 'Harassment', onPress: () => submitReport('harassment') },
    { text: 'Hate or violence', onPress: () => submitReport('hate') },
    { text: 'Spam', onPress: () => submitReport('spam') },
    { text: 'Other', onPress: () => submitReport('other') },
    { text: 'Cancel', style: 'cancel' },
  ]);
  const submitReport = async (reason) => {
    try {
      await backendFetch(`/live/${stream.id}/report`, { method: 'POST', body: JSON.stringify({ reason }) });
      Alert.alert('Report submitted', 'Thanks for helping keep ZannyChat safe.');
    } catch (e) { Alert.alert('Report not sent', e?.message || 'Please try again.'); }
  };
  const hideComment = async (commentId) => {
    try {
      await backendFetch(`/live/${stream.id}/comments/${commentId}/hide`, { method: 'POST' });
      setComments((current) => current.filter((item) => item.id !== commentId));
    } catch (e) { Alert.alert('Could not hide comment', e?.message || 'Please try again.'); }
  };

  const loadReports = async () => {
    try {
      const result = await backendFetch(`/live/${stream.id}/reports`);
      setReports(Array.isArray(result?.reports) ? result.reports : []);
      setShowReports(true);
    } catch (e) { Alert.alert('Reports unavailable', e?.message || 'Please try again.'); }
  };

  const reviewReport = async (reportId, status) => {
    try {
      const result = await backendFetch(`/live/${stream.id}/reports/${reportId}`, {
        method: 'PATCH', body: JSON.stringify({ status }),
      });
      setReports((current) => current.map((item) => item.id === reportId ? { ...item, ...result.report } : item));
    } catch (e) { Alert.alert('Could not update report', e?.message || 'Please try again.'); }
  };

  const loadParticipants = async () => {
    try {
      const result = await backendFetch(`/live/${stream.id}/participants`);
      setParticipants(Array.isArray(result?.participants) ? result.participants : []);
      setShowParticipants(true);
    } catch (e) { Alert.alert('Participants unavailable', e?.message || 'Please try again.'); }
  };

  useEffect(() => {
    if (!creatorMode || !showParticipants || !stream?.id) return undefined;
    let active = true;
    const refreshStudioParticipants = () => {
      if (!active || !isAppForeground() || studioParticipantsRefreshInFlight.current) return;
      studioParticipantsRefreshInFlight.current = true;
      backendFetch(`/live/${stream.id}/participants`)
        .then((result) => {
          if (active) setParticipants(Array.isArray(result?.participants) ? result.participants : []);
        })
        .catch((refreshError) => {
          if (active) console.warn('[live] creator studio refresh failed:', refreshError?.message || refreshError);
        })
        .finally(() => {
          studioParticipantsRefreshInFlight.current = false;
        });
    };
    const interval = setInterval(refreshStudioParticipants, 15_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [creatorMode, showParticipants, stream?.id]);

  const loadGuestRequests = async () => {
    try {
      const result = await backendFetch(`/live/${stream.id}/guest-requests`);
      setGuestRequests(Array.isArray(result?.requests) ? result.requests : []);
      setShowGuestRequests(true);
    } catch (e) { Alert.alert('Guest requests unavailable', e?.message || 'Please try again.'); }
  };

  const requestGuest = async () => {
    try {
      await backendFetch(`/live/${stream.id}/guest-requests`, { method: 'POST' });
      setGuestRequestStatus('requested');
      Alert.alert('Request sent', 'The creator will decide whether to bring you on stage.');
    } catch (e) { Alert.alert('Could not request guest access', e?.message || 'Please try again.'); }
  };

  const joinAsGuest = async () => {
    try {
      const nextConnection = await backendFetch(`/live/${stream.id}/join`, { method: 'POST' });
      if (nextConnection?.role !== 'guest' || !nextConnection?.canPublish) {
        throw new Error('Guest access has not been approved yet.');
      }
      setDemotedToViewer(false);
      setStageNotice('');
      setConnection(nextConnection);
      setGuestApproved(false);
      setGuestRequestStatus('accepted');
    } catch (e) { Alert.alert('Could not join as guest', e?.message || 'Please try again.'); }
  };

  const reviewGuestRequest = async (userId, status) => {
    try {
      await backendFetch(`/live/${stream.id}/guest-requests/${userId}`, {
        method: 'PATCH', body: JSON.stringify({ status }),
      });
      setGuestRequests((current) => current.filter((item) => item.user_id !== userId));
    } catch (e) { Alert.alert('Could not update guest request', e?.message || 'Please try again.'); }
  };

  const setModerator = async (userId, makeModerator) => {
    try {
      await backendFetch(`/live/${stream.id}/moderators${makeModerator ? '' : `/${userId}`}`, {
        method: makeModerator ? 'POST' : 'DELETE',
        ...(makeModerator ? { body: JSON.stringify({ userId }) } : {}),
      });
      setParticipants((current) => current.flatMap((item) => item.userId === userId
        ? (makeModerator || item.joined ? [{ ...item, moderator: makeModerator }] : [])
        : [item]));
    } catch (e) { Alert.alert('Could not update moderator', e?.message || 'Please try again.'); }
  };

  const inviteGuest = async (userId) => {
    try {
      await backendFetch(`/live/${stream.id}/guests/invite`, {
        method: 'POST', body: JSON.stringify({ userId }),
      });
      setParticipants((current) => current.map((item) => item.userId === userId ? { ...item, guestInvited: true } : item));
      Alert.alert('Stage invitation sent', 'The viewer can now join as a guest.');
    } catch (e) { Alert.alert('Could not invite guest', e?.message || 'Please try again.'); }
  };

  const muteGuest = async (userId, muted) => {
    try {
      const result = await backendFetch(`/live/${stream.id}/guests/${userId}/mute`, {
        method: 'PATCH', body: JSON.stringify({ muted }),
      });
      setParticipants((current) => current.map((item) => item.userId === userId
        ? { ...item, microphoneMuted: result.microphoneMuted } : item));
    } catch (e) { Alert.alert('Could not update guest microphone', e?.message || 'Check LiveKit remote-unmute settings and try again.'); }
  };

  const removeGuest = (userId) => {
    const guest = participants.find((item) => item.userId === userId);
    Alert.alert('Remove guest from stage?', `${guest?.name || 'This guest'} will lose stage publishing access and remain watching as a viewer.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove guest', style: 'destructive', onPress: async () => {
        try {
          await backendFetch(`/live/${stream.id}/guests/${userId}`, { method: 'DELETE' });
          await loadParticipants();
        } catch (e) { Alert.alert('Could not remove guest', e?.message || 'Please try again.'); }
      } },
    ]);
  };

  const spotlightGuest = async (userId, spotlighted) => {
    try {
      await backendFetch(`/live/${stream.id}/guests/${userId}/spotlight`, {
        method: 'PATCH', body: JSON.stringify({ spotlighted }),
      });
      setParticipants((current) => current.map((item) => ({ ...item, spotlighted: spotlighted && item.userId === userId })));
    } catch (e) { Alert.alert('Could not update spotlight', e?.message || 'Please try again.'); }
  };

  const startReplay = async () => {
    if (!stream?.id || replayBusy) return;
    setReplayBusy(true);
    try {
      const result = await backendFetch(`/live/${stream.id}/replays/start`, { method: 'POST' });
      setReplay(result?.replay || null);
      Alert.alert('Replay recording started', 'ZannyChat will stop this recording automatically after five minutes.');
    } catch (e) {
      Alert.alert('Could not start replay', e?.message || 'Please try again.');
    } finally {
      setReplayBusy(false);
    }
  };

  const confirmStartReplay = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && !window.confirm("Record this LIVE for up to five minutes? Replay access follows the stream's audience settings.")) return;
      startReplay();
      return;
    }
    Alert.alert("Record this LIVE?", "A secure replay will be saved for up to seven days; access follows this LIVE's audience settings. Monthly free-tier limits apply.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start recording', onPress: startReplay },
    ]);
  };

  const stopReplay = async () => {
    if (!stream?.id || !replay?.id || replayBusy) return;
    setReplayBusy(true);
    try {
      const result = await backendFetch(`/live/${stream.id}/replays/${replay.id}/stop`, { method: 'POST' });
      setReplay((current) => ({ ...current, ...(result?.replay || {}), status: result?.replay?.status || 'processing' }));
      refreshReplay();
    } catch (e) {
      Alert.alert('Could not stop replay', e?.message || 'The automatic five-minute stop remains active.');
    } finally {
      setReplayBusy(false);
    }
  };

  const viewReplay = () => {
    if (!replay?.id) return;
    navigation.navigate('LiveReplay', { replay: { ...replay, streamTitle: stream?.title || 'LIVE replay' } });
  };

  if (!connection || !stream) return <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}><ActivityIndicator color={colors.primary} /><Text style={{ color: colors.textPrimary, marginTop: 12 }}>{connectionLoading ? 'Connecting to LIVE…' : error || 'This LIVE room is unavailable.'}</Text></SafeAreaView>;
  return (
    <View style={{ flex: 1, backgroundColor: '#05050A' }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      {error ? <Text accessibilityRole="alert" style={{ position: 'absolute', zIndex: 40, top: Platform.OS === 'android' ? 88 : 104, left: 14, right: 14, color: '#FFFFFF', backgroundColor: 'rgba(110,18,34,0.82)', padding: 9, borderRadius: 12 }}>{error}</Text> : null}
      {stageNotice ? <Text accessibilityRole="status" style={{ position: 'absolute', zIndex: 39, top: Platform.OS === 'android' ? 88 : 104, left: 14, right: 14, color: '#FFFFFF', backgroundColor: 'rgba(20,55,92,0.82)', padding: 9, borderRadius: 12 }}>{stageNotice}</Text> : null}
      {guestApproved && !publisherMode ? <Text accessibilityRole="status" style={{ position: 'absolute', zIndex: 38, top: Platform.OS === 'android' ? 88 : 104, left: 14, right: 14, color: '#FFFFFF', backgroundColor: 'rgba(20,55,92,0.86)', padding: 10, borderRadius: 12 }}>You are invited on stage. Use the join control below when you are ready.</Text> : null}
      <LiveKitRoom key={connection.token} serverUrl={connection.livekitUrl} token={connection.token} connect={true} audio={publisherMode} video={publisherMode} options={{ adaptiveStream: true, dynacast: true }} connectOptions={{ autoSubscribe: true }}>
        <LiveMedia streamId={stream.id} creatorId={stream.creator_id} creatorMode={creatorMode} publisherMode={publisherMode} cameraEnabled={cameraEnabled} microphoneEnabled={microphoneEnabled} onToggleCamera={toggleCamera} onToggleMicrophone={toggleMicrophone} moderatorMode={moderatorMode} canManageGuests={canManageGuests} canRequestGuest={canRequestGuest} guestRequests={guestRequests} showGuestRequests={showGuestRequests} title={stream.title} comments={comments} reports={reports} showReports={showReports} participants={participants} showParticipants={showParticipants} draft={draft} setDraft={setDraft} onComment={sendComment} onReact={react} floatingReactions={floatingReactions} onRemoveFloatingReaction={removeFloatingReaction} onReport={report} onHide={hideComment} onEnd={leave} onRequestGuest={requestGuest} guestApproved={guestApproved} guestRequestStatus={guestRequestStatus} onJoinGuest={joinAsGuest} onToggleGuestRequests={() => { setShowReports(false); setShowParticipants(false); showGuestRequests ? setShowGuestRequests(false) : loadGuestRequests(); }} onReviewGuestRequest={reviewGuestRequest} onToggleReports={() => { setShowParticipants(false); setShowGuestRequests(false); showReports ? setShowReports(false) : loadReports(); }} onReviewReport={reviewReport} onToggleParticipants={() => { setShowReports(false); setShowGuestRequests(false); showParticipants ? setShowParticipants(false) : loadParticipants(); }} onSetModerator={setModerator} onInviteGuest={inviteGuest} onMuteGuest={muteGuest} onRemoveGuest={removeGuest} onSpotlightGuest={spotlightGuest} onDemoteToViewer={handleDemotedToViewer} replayEnabled={replayEnabled} replayStatus={replay?.status || 'none'} replayBusy={replayBusy} onStartReplay={confirmStartReplay} onStopReplay={stopReplay} onViewReplay={viewReplay} busy={busy} />
      </LiveKitRoom>
      {busy && <View style={{ position: 'absolute', top: '50%', alignSelf: 'center' }}><ActivityIndicator color={colors.accent} /></View>}
    </View>
  );
}
