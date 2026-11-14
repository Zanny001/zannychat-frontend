import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, SafeAreaView, StatusBar, StyleSheet, Text, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AudioSession, LiveKitRoom, VideoTrack, isTrackReference, useRoomContext, useTracks, useParticipants } from '@livekit/react-native';
import { RoomEvent, Track } from 'livekit-client';
import { backendFetch } from '../services/backendClient';
import { supabase } from '../services/supabaseClient';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../utils/color';
import CallInvitePicker from '../components/CallInvitePicker';

function GroupRoomContent({ callType, onEnd, onAddPeople, canInvite, onParticipantsChange, endLabel }) {
  const room = useRoomContext();
  const { colors, typography } = useTheme();
  const cameraTracks = useTracks([Track.Source.Camera]);
  const participants = useParticipants();
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(callType !== 'video');
  const [connectionState, setConnectionState] = useState('Connected');

  useEffect(() => {
    onParticipantsChange?.(participants.map((participant) => participant.identity));
  }, [participants, onParticipantsChange]);

  useEffect(() => {
    const onReconnecting = () => setConnectionState('Reconnecting…');
    const onReconnected = () => setConnectionState('Connected');
    const onDisconnected = () => setConnectionState('Disconnected');
    room.on(RoomEvent.Reconnecting, onReconnecting);
    room.on(RoomEvent.Reconnected, onReconnected);
    room.on(RoomEvent.Disconnected, onDisconnected);
    return () => {
      room.off(RoomEvent.Reconnecting, onReconnecting);
      room.off(RoomEvent.Reconnected, onReconnected);
      room.off(RoomEvent.Disconnected, onDisconnected);
    };
  }, [room]);

  const toggleMute = async () => {
    try {
      await room.localParticipant.setMicrophoneEnabled(muted);
      setMuted(!muted);
    } catch (_) {
      Alert.alert('Microphone unavailable', 'Check microphone permission and try again.');
    }
  };
  const toggleCamera = async () => {
    try {
      await room.localParticipant.setCameraEnabled(cameraOff);
      setCameraOff(!cameraOff);
    } catch (_) {
      Alert.alert('Camera unavailable', 'Check camera permission and try again.');
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

      {callType === 'video' ? (
        <FlatList
          data={tracks}
          keyExtractor={(track) => track.participant.identity}
          numColumns={2}
          contentContainerStyle={styles.tiles}
          renderItem={({ item }) => (
            <View style={[styles.tile, { backgroundColor: colors.surfaceAlt }]}>
              <VideoTrack trackRef={item} style={styles.video} />
              <View style={styles.tileCaption}>
                <Text style={[styles.tileName, typography.small]} numberOfLines={1}>{item.participant.name || item.participant.identity}</Text>
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
          <Text style={[styles.audioTitle, typography.title, { color: colors.textPrimary }]}>Group audio call</Text>
          <Text style={[styles.audioHint, typography.body, { color: colors.textSecondary }]}>Everyone in the room can hear you when your microphone is on.</Text>
          <View style={styles.participantList}>
            {participants.map((participant) => (
              <View key={participant.identity} style={[styles.participantChip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border || colors.surfaceAlt }]}>
                <Ionicons name="person-circle-outline" size={18} color={colors.primary} />
                <Text style={[styles.participantName, typography.small, { color: colors.textPrimary }]} numberOfLines={1}>
                  {participant.name || participant.identity}
                  {participant.isLocal ? ' (you)' : ''}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.controls}>
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
        {callType === 'video' && (
          <Pressable
            onPress={toggleCamera}
            accessibilityRole="button"
            accessibilityLabel={cameraOff ? 'Turn camera on' : 'Turn camera off'}
            accessibilityState={{ selected: cameraOff }}
            style={({ pressed }) => controlStyle(pressed, cameraOff)}
          >
            <Ionicons name={cameraOff ? 'videocam-off' : 'videocam'} size={23} color={cameraOff ? colors.onPrimary : colors.textPrimary} />
            <Text style={[styles.controlLabel, typography.small, { color: cameraOff ? colors.onPrimary : colors.textPrimary }]}>{cameraOff ? 'Camera on' : 'Camera off'}</Text>
          </Pressable>
        )}
        {canInvite && (
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
  const { conversationId, conversationName = 'Group', callType = 'audio', roomId = null } = route.params || {};
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
  const handleParticipantsChange = useCallback((ids) => setParticipantIds(ids), []);

  useEffect(() => {
    let active = true;
    AudioSession.startAudioSession().catch(() => {});
    const connect = async () => {
      try {
        let result;
        if (roomId) {
          result = await backendFetch(`/group-calls/${roomId}/join`, { method: 'POST' });
        } else {
          if (!conversationId) throw new Error('This group conversation is missing.');
          result = await backendFetch('/group-calls', {
            method: 'POST',
            body: JSON.stringify({ conversationId, callType }),
          });
        }
        if (active) {
          const connected = { ...result, roomId: result.room.id, callType: result.room.call_type || callType };
          connectionRef.current = connected;
          setConnection(connected);
        } else if (result?.room?.id) {
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
      AudioSession.stopAudioSession();
      const current = connectionRef.current;
      if (current?.roomId && !endingRef.current) {
        backendFetch(`/group-calls/${current.roomId}/leave`, { method: 'POST' }).catch(() => {});
      }
    };
  }, [conversationId, roomId]);

  useEffect(() => {
    if (!connection?.room) return undefined;
    let active = true;
    (async () => {
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
  }, [connection?.room?.id, conversationId]);

  const invitePerson = async (person) => {
    await backendFetch(`/group-calls/${connection.roomId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ userIds: [person.id] }),
    });
  };

  const endCall = async () => {
    if (!connection || endingRef.current) return;
    endingRef.current = true;
    try {
      await backendFetch(`/group-calls/${connection.roomId}/${canEnd ? 'end' : 'leave'}`, { method: 'POST' });
    } catch (_) {
      // Leaving the media room still takes priority if the backend is offline.
    } finally {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={resolvedMode === 'light' ? 'dark-content' : 'light-content'} />
      <View style={styles.header}>
        <Text style={[styles.brand, typography.small, { color: colors.primary }]}>ZannyChat</Text>
        <Text style={[styles.title, typography.title, { color: colors.textPrimary }]} numberOfLines={1}>{conversationName}</Text>
        <Text style={[styles.subtitle, typography.caption, { color: colors.textSecondary }]}>
          {connection?.callType === 'video' || callType === 'video' ? 'Group video call' : 'Group audio call'}
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
          <GroupRoomContent callType={connection.callType} onEnd={endCall} onAddPeople={() => setInvitePickerVisible(true)} canInvite={canInvite} onParticipantsChange={handleParticipantsChange} endLabel={canEnd ? 'End call' : 'Leave'} />
        </LiveKitRoom>
      ) : null}
      {connection?.room ? (
        <CallInvitePicker
          visible={invitePickerVisible}
          onClose={() => setInvitePickerVisible(false)}
          onInvite={invitePerson}
          conversationId={connection.room.conversation_id || conversationId}
          filterToConversationMembers={!connection.room.source_call_id}
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
  tiles: { padding: 8, gap: 8, flexGrow: 1 },
  tile: { flex: 1, minHeight: 190, margin: 4, borderRadius: 18, overflow: 'hidden' },
  video: { flex: 1, minHeight: 190 },
  tileCaption: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 8, backgroundColor: 'rgba(0,0,0,0.55)' },
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
  controls: { flexDirection: 'row', justifyContent: 'center', gap: 14, padding: 18, paddingBottom: 26 },
  control: { minWidth: 76, minHeight: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 10 },
  controlLabel: { fontSize: 11, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  error: { fontSize: 17, fontWeight: '700', textAlign: 'center', marginTop: 16, maxWidth: '100%' },
  back: { marginTop: 22, paddingVertical: 12, paddingHorizontal: 22, borderRadius: 14 },
  backText: { color: '#FFFFFF', fontWeight: '800' },
});
