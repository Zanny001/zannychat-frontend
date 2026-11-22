import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, DeviceEventEmitter, FlatList, Platform, StatusBar, StyleSheet, Text, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AudioSession, LiveKitRoom, VideoTrack, isTrackReference, useRoomContext, useTracks, useParticipants } from '@livekit/react-native';
import { RoomEvent, Track } from 'livekit-client';
import { backendFetch } from '../services/backendClient';
import { supabase } from '../services/supabaseClient';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../utils/color';
import CallInvitePicker from '../components/CallInvitePicker';
import { updateCallStatus } from '../services/calls';
import { endNativeCall, fulfillNativeIncomingConnected, reportNativeCallEnded, reportNativeOutgoingConnected, setNativeMuted } from '../services/nativeCallSystem';

function GroupRoomContent({ roomId, callType, onEnd, onAddPeople, canInvite, onParticipantsChange, endLabel, nativeCallId, nativeRequestId, isCaller, onRoomConnected, directCall }) {
  const room = useRoomContext();
  const { colors, typography, layout } = useTheme();
  const cameraTracks = useTracks([Track.Source.Camera]);
  const participants = useParticipants();
  const [, setParticipantMediaRevision] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(callType !== 'video');
  const [isVideo, setIsVideo] = useState(callType === 'video');
  const [cameraFacingMode, setCameraFacingMode] = useState('user');
  const cameraSwitchInProgressRef = useRef(false);
  const [connectionState, setConnectionState] = useState('Connecting…');
  const canInviteNow = canInvite && connectionState === 'Connected';

  useEffect(() => {
    const refreshMediaState = () => setParticipantMediaRevision((revision) => revision + 1);
    room.on(RoomEvent.TrackMuted, refreshMediaState);
    room.on(RoomEvent.TrackUnmuted, refreshMediaState);
    return () => {
      room.off(RoomEvent.TrackMuted, refreshMediaState);
      room.off(RoomEvent.TrackUnmuted, refreshMediaState);
    };
  }, [room]);

  useEffect(() => {
    onParticipantsChange?.(participants.map((participant) => participant.identity));
  }, [participants, onParticipantsChange]);

  useEffect(() => {
    if (connectionState !== 'Connected' || !roomId) return undefined;
    let active = true;
    const heartbeat = () => {
      if (!active || room.state !== 'connected') return;
      backendFetch(`/group-calls/${roomId}/heartbeat`, { method: 'POST' })
        .catch((error) => { if (active) console.warn('[group-calls] presence heartbeat failed:', error?.message || error); });
    };
    heartbeat();
    const interval = setInterval(heartbeat, 30_000);
    return () => { active = false; clearInterval(interval); };
  }, [connectionState, room, roomId]);

  useEffect(() => {
    const onConnected = () => {
      setConnectionState('Connected');
      onRoomConnected?.();
    };
    const onReconnecting = () => setConnectionState('Reconnecting…');
    const onReconnected = () => setConnectionState('Connected');
    const onDisconnected = () => setConnectionState('Disconnected');
    room.on(RoomEvent.Connected, onConnected);
    if (room.state === 'connected') { setConnectionState('Connected'); onRoomConnected?.(); }
    room.on(RoomEvent.Reconnecting, onReconnecting);
    room.on(RoomEvent.Reconnected, onReconnected);
    room.on(RoomEvent.Disconnected, onDisconnected);
    return () => {
      room.off(RoomEvent.Connected, onConnected);
      room.off(RoomEvent.Reconnecting, onReconnecting);
      room.off(RoomEvent.Reconnected, onReconnected);
      room.off(RoomEvent.Disconnected, onDisconnected);
    };
  }, [room, onRoomConnected]);

  useEffect(() => {
    if (!nativeCallId) return undefined;
    const subscription = DeviceEventEmitter.addListener('zannychat:native-call-muted', ({ id, isMuted }) => {
      if (id !== nativeCallId) return;
      room.localParticipant.setMicrophoneEnabled(!isMuted).then(() => setMuted(Boolean(isMuted))).catch(() => {});
    });
    return () => subscription.remove();
  }, [nativeCallId, room]);

  const toggleMute = async () => {
    const next = !muted;
    try {
      await room.localParticipant.setMicrophoneEnabled(!next);
      if (nativeCallId) setNativeMuted(nativeCallId, next).catch(() => {});
      setMuted(next);
    } catch (_) {
      Alert.alert('Microphone unavailable', 'Check microphone permission and try again.');
    }
  };
  const toggleCamera = async () => {
    try {
      await room.localParticipant.setCameraEnabled(cameraOff);
      setCameraOff(!cameraOff);
      setIsVideo(cameraOff);
    } catch (_) {
      Alert.alert('Camera unavailable', 'Check camera permission and try again.');
    }
  };

  const switchCamera = async () => {
    if (cameraSwitchInProgressRef.current || cameraOff || !isVideo || room.state !== 'connected') return;
    const publication = room.localParticipant.getTrackPublication(Track.Source.Camera);
    const videoTrack = publication?.videoTrack;
    if (!videoTrack || typeof videoTrack.restartTrack !== 'function') {
      Alert.alert('Camera switching unavailable', 'This device does not support switching cameras during a group call.');
      return;
    }
    const nextFacingMode = cameraFacingMode === 'user' ? 'environment' : 'user';
    cameraSwitchInProgressRef.current = true;
    try {
      await videoTrack.restartTrack({ facingMode: nextFacingMode });
      setCameraFacingMode(nextFacingMode);
    } catch (_) {
      Alert.alert('Could not switch camera', 'Your current camera is still active. Please try again.');
    } finally {
      cameraSwitchInProgressRef.current = false;
    }
  };

  const chooseAudioOutput = async () => {
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
      Alert.alert('Audio output', 'Choose where call audio should play.', [
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
  };

  const tracks = cameraTracks.filter(isTrackReference);
  const controlStyle = (pressed, active = false, destructive = false) => [
    styles.control,
    { backgroundColor: destructive ? colors.danger : active ? colors.primary : colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, shadowColor: destructive ? colors.danger : active ? colors.primary : colors.textPrimary, shadowOpacity: destructive || active ? 0.28 : 0.1, shadowRadius: active ? 13 : 7, shadowOffset: { width: 0, height: 5 }, elevation: active || destructive ? 5 : 2 },
    pressed && { opacity: 0.76, transform: [{ scale: 0.97 }] },
  ];

  return (
    <View style={[styles.room, { backgroundColor: colors.background }]}>
      <View style={styles.connectionRow} accessibilityLiveRegion="polite">
        <View style={[styles.connectionDot, { backgroundColor: connectionState === 'Connected' ? colors.online : colors.warning || colors.gold }]} />
        <Text style={[styles.connectionText, typography.small, { color: colors.textSecondary }]}>{connectionState}</Text>
        <Text style={[styles.connectionText, { color: colors.textSecondary }]}>· {participants.length} connected</Text>
      </View>

      <View style={styles.rosterStrip} accessibilityLabel={`Call participants, ${participants.length} connected`}>
        <Text style={[styles.rosterEyebrow, typography.caption, { color: colors.textSecondary }]}>IN THE ROOM</Text>
        <View style={styles.rosterChips}>
          {participants.map((participant) => (
            <View key={participant.identity} style={[styles.rosterChip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border || colors.surfaceAlt }]}>
              <View style={[styles.rosterPresence, { backgroundColor: colors.online }]} />
              <Text style={[styles.rosterName, typography.small, { color: colors.textPrimary }]} numberOfLines={1}>
                {participant.name || participant.identity}{participant.isLocal ? ' · You' : ''}
              </Text>
              <Ionicons
                name={participant.isMicrophoneEnabled === false ? 'mic-off-outline' : 'mic-outline'}
                size={13}
                color={participant.isMicrophoneEnabled === false ? colors.warning || colors.gold : colors.textSecondary}
                accessibilityLabel={participant.isMicrophoneEnabled === false ? 'Microphone muted' : 'Microphone on'}
              />
              <Ionicons
                name={participant.isCameraEnabled ? 'videocam-outline' : 'videocam-off-outline'}
                size={13}
                color={participant.isCameraEnabled ? colors.primary : colors.textSecondary}
                accessibilityLabel={participant.isCameraEnabled ? 'Camera on' : 'Camera off'}
              />
            </View>
          ))}
        </View>
      </View>

      {(isVideo || tracks.length > 0) ? (
        <FlatList
          style={{ width: '100%', maxWidth: layout.mediaStageMaxWidth, alignSelf: 'center', flexGrow: 1 }}
          data={tracks}
          keyExtractor={(track) => track.participant.identity}
          numColumns={2}
          contentContainerStyle={styles.tiles}
          renderItem={({ item }) => (
            <View style={[styles.tile, { backgroundColor: colors.surfaceAlt, borderColor: item.participant.isSpeaking ? colors.accent : colors.border }]}>
              <VideoTrack trackRef={item} style={styles.video} />
              <View style={styles.tileCaption}>
                <View style={styles.tileCaptionRow}><Text style={[styles.tileName, typography.small]} numberOfLines={1}>{item.participant.name || item.participant.identity}</Text>{item.participant.isSpeaking ? <Text style={styles.speakingLabel}>SPEAKING</Text> : null}</View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.videoEmpty}>
              <Ionicons name="videocam-off-outline" size={30} color={colors.textSecondary} />
              <Text style={[styles.empty, typography.body, { color: colors.textSecondary }]}>Waiting for participants to turn on video…</Text>
            </View>
          }
        />
      ) : (
        <View style={styles.audioStage}>
          <View style={[styles.audioOrb, { backgroundColor: colors.primary, shadowColor: colors.primary, borderColor: hexToRgba(colors.onPrimary, 0.28) }]}>
            <Ionicons name="people" size={46} color={colors.onPrimary || '#FFFFFF'} />
          </View>
          <Text style={[styles.audioTitle, typography.title, { color: colors.textPrimary }]}>{directCall ? 'Voice call' : 'Group audio call'}</Text>
          <Text style={[styles.audioHint, typography.body, { color: colors.textSecondary }]}>Everyone in the room can hear you when your microphone is on.</Text>
          <View style={styles.participantList}>
            {participants.map((participant) => (
              <View key={participant.identity} accessibilityRole="text" accessibilityLabel={`${participant.name || participant.identity}${participant.isLocal ? ' (you)' : ''}${participant.isSpeaking ? ', speaking' : ''}`} style={[styles.participantChip, { backgroundColor: participant.isSpeaking ? hexToRgba(colors.primary, 0.12) : colors.surfaceAlt, borderColor: participant.isSpeaking ? colors.primary : colors.border || colors.surfaceAlt }]}>
                <Ionicons name={participant.isSpeaking ? 'volume-high' : 'person-circle-outline'} size={18} color={participant.isSpeaking ? colors.primary : colors.textSecondary} />
                <Text style={[styles.participantName, typography.small, { color: colors.textPrimary }]} numberOfLines={1}>
                  {participant.name || participant.identity}
                  {participant.isLocal ? ' (you)' : ''}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={[styles.controls, { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', backgroundColor: hexToRgba(colors.surface, 0.84), borderColor: colors.border }]}>
        <Pressable
          onPress={toggleMute}
          accessibilityRole="button"
          accessibilityLabel={muted ? 'Unmute microphone' : 'Mute microphone'}
          accessibilityState={{ selected: muted }}
          style={({ pressed }) => controlStyle(pressed, muted)}
        >
          <Ionicons name={muted ? 'mic-off' : 'mic'} size={23} color={muted ? colors.onPrimary : colors.textPrimary} />
          <Text style={[styles.controlLabel, typography.small, { color: muted ? colors.onPrimary : colors.textPrimary }]}>{muted ? 'Unmute' : 'Mute'}</Text>
        </Pressable>
        <Pressable
          onPress={chooseAudioOutput}
          accessibilityRole="button"
          accessibilityLabel="Choose audio output"
          style={({ pressed }) => controlStyle(pressed)}
        >
          <Ionicons name="volume-high-outline" size={23} color={colors.textPrimary} />
          <Text style={[styles.controlLabel, typography.small, { color: colors.textPrimary }]}>Audio</Text>
        </Pressable>
        <Pressable
            onPress={toggleCamera}
            accessibilityRole="button"
            accessibilityLabel={cameraOff ? 'Turn camera on' : 'Turn camera off'}
            accessibilityState={{ selected: cameraOff }}
            style={({ pressed }) => controlStyle(pressed, cameraOff)}
          >
            <Ionicons name={cameraOff ? 'videocam-off' : 'videocam'} size={23} color={cameraOff ? colors.onPrimary : colors.textPrimary} />
            <Text style={[styles.controlLabel, typography.small, { color: cameraOff ? colors.onPrimary : colors.textPrimary }]}>{cameraOff ? 'Switch to video' : 'Switch to audio'}</Text>
        </Pressable>
        {isVideo && !cameraOff && (
          <Pressable
            onPress={switchCamera}
            accessibilityRole="button"
            accessibilityLabel={cameraFacingMode === 'user' ? 'Switch to rear camera' : 'Switch to front camera'}
            style={({ pressed }) => controlStyle(pressed)}
          >
            <Ionicons name="camera-reverse" size={22} color={colors.textPrimary} />
            <Text style={[styles.controlLabel, typography.small, { color: colors.textPrimary }]}>Flip camera</Text>
          </Pressable>
        )}
        {canInviteNow && (
          <Pressable
            onPress={onAddPeople}
            accessibilityRole="button"
            accessibilityLabel="Add people to call"
            style={({ pressed }) => controlStyle(pressed, false)}
          >
            <Ionicons name="person-add" size={22} color={colors.textPrimary} />
            <Text style={[styles.controlLabel, typography.small, { color: colors.textPrimary }]}>Add people</Text>
          </Pressable>
        )}
        <Pressable
          onPress={onEnd}
          accessibilityRole="button"
          accessibilityLabel={endLabel === 'End call' ? 'End call' : 'Leave group call'}
          style={({ pressed }) => controlStyle(pressed, false, true)}
        >
          <Ionicons name="call" size={23} color={colors.onDanger} style={{ transform: [{ rotate: '135deg' }] }} />
          <Text style={[styles.controlLabel, typography.small, { color: colors.onDanger }]}>{endLabel || 'Leave'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function GroupCallScreen({ route, navigation }) {
  const { conversationId, conversationName = 'Group', callType = 'audio', roomId = null, directCallId = null, directCall = null, nativeCallId = null, nativeRequestId = null, isCaller = false, connection: initialConnection = null } = route.params || {};
  const { colors, resolvedMode, typography } = useTheme();
  const [connection, setConnection] = useState(null);
  const [errorText, setErrorText] = useState('');
  const [busy, setBusy] = useState(true);
  const [invitePickerVisible, setInvitePickerVisible] = useState(false);
  const [canInvite, setCanInvite] = useState(false);
  const [canEnd, setCanEnd] = useState(false);
  const [participantIds, setParticipantIds] = useState([]);
  const endingRef = useRef(false);
  const connectionRef = useRef(null);
  const nativeConnectedRef = useRef(false);
  const preserveAudioSessionRef = useRef(false);
  const handleParticipantsChange = useCallback((ids) => setParticipantIds(ids), []);

  useEffect(() => {
    let active = true;
    AudioSession.startAudioSession().catch(() => {});
    const connect = async () => {
      try {
        let result;
        if (directCallId) {
          result = initialConnection?.callId === directCallId && initialConnection?.token && initialConnection?.livekitUrl
            ? initialConnection
            : await backendFetch(`/calls/${directCallId}/livekit-token`, { method: 'POST' });
          const sourceCall = directCall || {};
          result = {
            ...result,
            room: {
              id: directCallId,
              conversation_id: sourceCall.conversation_id || conversationId,
              host_user_id: sourceCall.caller_id,
              source_call_id: directCallId,
              call_type: result.callType || sourceCall.call_type || callType,
            },
          };
        } else if (roomId) {
          result = initialConnection?.room?.id === roomId && initialConnection?.token && initialConnection?.livekitUrl
            ? initialConnection
            : await backendFetch(`/group-calls/${roomId}/join`, { method: 'POST' });
        } else {
          if (!conversationId) throw new Error('This group conversation is missing.');
          result = await backendFetch('/group-calls', {
            method: 'POST',
            body: JSON.stringify({ conversationId, callType }),
          });
        }
        if (active) {
          const connected = { ...result, roomId: result.roomId || result.room.id, callType: result.callType || result.room.call_type || callType };
          connectionRef.current = connected;
          setConnection(connected);
        } else if (result?.room?.id && !directCallId) {
          await backendFetch(`/group-calls/${result.room.id}/leave`, { method: 'POST' }).catch(() => {});
        }
      } catch (error) {
        if (active) setErrorText(error?.message || 'Group calling is not configured yet.');
      } finally {
        if (active) setBusy(false);
      }
    };
    connect();
    return () => {
      active = false;
      if (!preserveAudioSessionRef.current) AudioSession.stopAudioSession();
      const current = connectionRef.current;
      if (current?.roomId && !directCallId && !endingRef.current) {
        backendFetch(`/group-calls/${current.roomId}/leave`, { method: 'POST' }).catch(() => {});
      }
    };
  }, [conversationId, roomId, directCallId, directCall, initialConnection]);

  useEffect(() => {
    if (!connection?.room) return undefined;
    let active = true;
    (async () => {
      if (directCallId) {
        setCanInvite(true);
        setCanEnd(true);
        return;
      }
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!active || !userId) return;
      if (connection.room.source_call_id) {
        setCanInvite(connection.room.host_user_id === userId);
        setCanEnd(true);
        return;
      }
      const { data: membership } = await supabase.from('conversation_participants')
        .select('is_admin')
        .eq('conversation_id', connection.room.conversation_id || conversationId)
        .eq('user_id', userId)
        .maybeSingle();
      if (!active) return;
      const manager = connection.room.host_user_id === userId || membership?.is_admin === true;
      setCanInvite(manager);
      setCanEnd(manager);
    })().catch(() => {});
    return () => { active = false; };
  }, [connection?.room?.id, conversationId, directCallId]);

  const invitePerson = async (person) => {
    if (directCallId) {
      endingRef.current = true;
      try {
        const result = await backendFetch(`/group-calls/upgrade/${directCallId}`, {
          method: 'POST',
          body: JSON.stringify({ userIds: [person.id], callType: connection?.callType || callType }),
        });
        if (!result?.room?.id) throw new Error('Could not upgrade this call to a conference.');
        preserveAudioSessionRef.current = true;
        navigation.replace('GroupCall', {
          roomId: result.room.id,
          connection: result,
          conversationId: result.room.conversation_id || conversationId,
          conversationName: 'Group call',
          callType: result.room.call_type || callType,
        });
      } catch (error) {
        endingRef.current = false;
        throw error;
      }
      return;
    }
    await backendFetch(`/group-calls/${connection.roomId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ userIds: [person.id] }),
    });
  };

  const endCall = async () => {
    if (endingRef.current) return;
    if (!connection) { navigation.goBack(); return; }
    endingRef.current = true;
    try {
      if (directCallId) {
        await updateCallStatus(directCallId, 'ended');
        if (nativeCallId) await endNativeCall(nativeCallId).catch(() => {});
      } else {
        await backendFetch(`/group-calls/${connection.roomId}/${canEnd ? 'end' : 'leave'}`, { method: 'POST' });
      }
    } catch (error) {
      // Let unmount cleanup retry a group participant leave if needed.
      endingRef.current = false;
      setErrorText(error?.message || 'The call could not be ended on the server. Leaving this device now.');
    } finally {
      navigation.goBack();
    }
  };

  const handleRoomConnected = useCallback(() => {
    if (nativeConnectedRef.current) return;
    if (isCaller && nativeCallId) {
      nativeConnectedRef.current = true;
      reportNativeOutgoingConnected(nativeCallId).catch(() => {});
    } else if (nativeRequestId) {
      nativeConnectedRef.current = true;
      fulfillNativeIncomingConnected(nativeRequestId).catch(() => {});
    }
  }, [isCaller, nativeCallId, nativeRequestId]);

  useEffect(() => {
    if (!directCallId || !supabase) return undefined;
    let active = true;
    const heartbeat = () => supabase.rpc('heartbeat_call_session', { p_call_id: directCallId })
      .then(({ error }) => {
        if (active && error && /expired|unauthorized|participant/i.test(error.message || '')) {
          setErrorText('This call session expired. Please start a new call.');
          updateCallStatus(directCallId, 'ended').catch(() => {});
        }
      }).catch(() => {});
    heartbeat();
    const timer = setInterval(heartbeat, 30_000);
    const handleCallUpdate = (next) => {
      if (!active || !next || endingRef.current) return;
      if (next.group_room_id) {
        endingRef.current = true;
        preserveAudioSessionRef.current = true;
        navigation.replace('GroupCall', {
          roomId: next.group_room_id,
          conversationId: next.conversation_id || conversationId,
          conversationName: 'Group call',
          callType: next.call_type || callType,
        });
      } else if (['declined', 'cancelled', 'ended', 'missed', 'failed'].includes(next.status)) {
        endingRef.current = true;
        if (nativeCallId) reportNativeCallEnded(nativeCallId, 'remoteEnded').catch(() => {});
        navigation.goBack();
      }
    };
    const channel = supabase.channel(`direct-livekit-call:${directCallId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'call_sessions', filter: `id=eq.${directCallId}` }, (event) => handleCallUpdate(event?.new))
      .subscribe((channelStatus) => {
        if (channelStatus === 'SUBSCRIBED') {
          supabase.from('call_sessions').select('id,conversation_id,call_type,status,group_room_id')
            .eq('id', directCallId).maybeSingle()
            .then(({ data }) => { if (data) handleCallUpdate(data); }).catch(() => {});
        }
      });
    return () => {
      active = false;
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [callType, conversationId, directCallId, navigation, nativeCallId]);

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={resolvedMode === 'light' ? 'dark-content' : 'light-content'} />
      <View style={styles.header}>
        <Text style={[styles.brand, typography.small, { color: colors.primary }]}>ZannyChat</Text>
        <Text style={[styles.title, typography.title, { color: colors.textPrimary }]} numberOfLines={1}>{conversationName}</Text>
        <Text style={[styles.subtitle, typography.caption, { color: colors.textSecondary }]}>
          {(connection?.callType || callType) === 'video' ? 'Group video call' : 'Group audio call'}
        </Text>
      </View>
      {busy ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.empty, { color: colors.textSecondary }]}>Preparing your group call…</Text>
        </View>
      ) : errorText ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.danger} />
          <Text style={[styles.error, typography.bodyStrong, { color: colors.textPrimary }]}>{errorText}</Text>
          <Text style={[styles.empty, { color: colors.textSecondary }]}>Group media requires a configured LiveKit SFU and server credentials.</Text>
          <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.back, { backgroundColor: colors.primary }, pressed && { opacity: 0.8 }]} accessibilityRole="button" accessibilityLabel="Go back">
            <Text style={[styles.backText, typography.small, { color: colors.onPrimary }]}>Go back</Text>
          </Pressable>
        </View>
      ) : connection ? (
        <LiveKitRoom serverUrl={connection.livekitUrl} token={connection.token} connect={true} audio={true} video={connection.callType === 'video'} options={{ adaptiveStream: true, dynacast: true }}>
          <GroupRoomContent roomId={directCallId ? null : connection.roomId} callType={connection.callType} onEnd={endCall} onAddPeople={() => setInvitePickerVisible(true)} canInvite={canInvite} onParticipantsChange={handleParticipantsChange} endLabel={canEnd ? 'End call' : 'Leave'} nativeCallId={nativeCallId} nativeRequestId={nativeRequestId} isCaller={isCaller} onRoomConnected={handleRoomConnected} directCall={Boolean(directCallId)} />
        </LiveKitRoom>
      ) : null}
      {connection?.room ? (
        <CallInvitePicker
          visible={invitePickerVisible}
          onClose={() => setInvitePickerVisible(false)}
          onInvite={invitePerson}
          conversationId={connection.room.conversation_id || conversationId}
          roomId={directCallId ? null : connection.roomId}
          filterToConversationMembers={!directCallId && !connection.room.source_call_id}
          excludeIds={participantIds}
          title="Add people to call"
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { alignItems: 'center', paddingTop: 14, paddingBottom: 10, paddingHorizontal: 20 },
  brand: { fontSize: 12, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { fontSize: 22, fontWeight: '800', marginTop: 8, maxWidth: '100%', textAlign: 'center' },
  subtitle: { fontSize: 13, marginTop: 4 },
  room: { flex: 1, justifyContent: 'space-between' },
  connectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 6 },
  connectionDot: { width: 7, height: 7, borderRadius: 4 },
  connectionText: { fontSize: 12, fontWeight: '600' },
  rosterStrip: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 10, gap: 7, width: '100%', maxWidth: 760, alignSelf: 'center' },
  rosterEyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  rosterChips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 7 },
  rosterChip: { maxWidth: '48%', minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 },
  rosterPresence: { width: 6, height: 6, borderRadius: 3 },
  rosterName: { maxWidth: 150, fontSize: 11, fontWeight: '700' },
  tiles: { padding: 8, gap: 8, flexGrow: 1 },
  tile: { flex: 1, minHeight: 190, margin: 4, borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  video: { flex: 1, minHeight: 190 },
  tileCaption: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 9, backgroundColor: 'rgba(0,0,0,0.58)' },
  tileCaptionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  speakingLabel: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  tileName: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  videoEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  empty: { textAlign: 'center', padding: 16, lineHeight: 21 },
  audioStage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  audioOrb: { width: 108, height: 108, borderRadius: 54, borderWidth: 1, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.34, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  audioTitle: { fontSize: 21, fontWeight: '800', marginTop: 20, textAlign: 'center' },
  audioHint: { marginTop: 8, textAlign: 'center', lineHeight: 20, maxWidth: 300 },
  participantList: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 22 },
  participantChip: { maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: StyleSheet.hairlineWidth, borderRadius: 18, paddingVertical: 7, paddingHorizontal: 10 },
  participantName: { fontSize: 12, fontWeight: '600', maxWidth: 180 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 9, marginHorizontal: 12, marginBottom: 14, padding: 12, paddingBottom: 16, borderRadius: 28, borderWidth: 1 },
  control: { minWidth: 68, minHeight: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 8 },
  controlLabel: { fontSize: 11, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  error: { fontSize: 17, fontWeight: '700', textAlign: 'center', marginTop: 16, maxWidth: '100%' },
  back: { marginTop: 22, paddingVertical: 12, paddingHorizontal: 22, borderRadius: 14 },
  backText: { color: '#FFFFFF', fontWeight: '800' },
});
