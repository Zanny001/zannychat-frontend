import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AudioSession, LiveKitRoom, VideoTrack, isTrackReference, useRoomContext, useTracks } from '@livekit/react-native';
import { Track } from 'livekit-client';
import { backendFetch } from '../services/backendClient';
import { supabase } from '../services/supabaseClient';

function GroupRoomContent({ callType, onEnd }) {
  const room = useRoomContext();
  const cameraTracks = useTracks([Track.Source.Camera]);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(callType !== 'video');

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

  return (
    <View style={styles.room}>
      {callType === 'video' ? (
        <FlatList
          data={cameraTracks.filter(isTrackReference)}
          keyExtractor={(track) => track.participant.identity}
          numColumns={2}
          contentContainerStyle={styles.tiles}
          renderItem={({ item }) => (
            <View style={styles.tile}>
              <VideoTrack trackRef={item} style={styles.video} />
              <Text style={styles.tileName}>{item.participant.name || item.participant.identity}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Waiting for participants to turn on video…</Text>}
        />
      ) : (
        <View style={styles.audioStage}>
          <View style={styles.audioOrb}><Ionicons name="people" size={48} color="#FFFFFF" /></View>
          <Text style={styles.audioTitle}>Group audio call</Text>
          <Text style={styles.audioHint}>You're connected to the secure call room.</Text>
        </View>
      )}
      <View style={styles.controls}>
        <TouchableOpacity onPress={toggleMute} style={[styles.control, muted && styles.controlActive]} accessibilityRole="button" accessibilityLabel={muted ? 'Unmute microphone' : 'Mute microphone'}>
          <Ionicons name={muted ? 'mic-off' : 'mic'} size={23} color="#FFFFFF" />
          <Text style={styles.controlLabel}>{muted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>
        {callType === 'video' && (
          <TouchableOpacity onPress={toggleCamera} style={[styles.control, cameraOff && styles.controlActive]} accessibilityRole="button" accessibilityLabel={cameraOff ? 'Turn camera on' : 'Turn camera off'}>
            <Ionicons name={cameraOff ? 'videocam-off' : 'videocam'} size={23} color="#FFFFFF" />
            <Text style={styles.controlLabel}>{cameraOff ? 'Camera on' : 'Camera off'}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onEnd} style={[styles.control, styles.hangup]} accessibilityRole="button" accessibilityLabel="Leave group call">
          <Ionicons name="call" size={23} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
          <Text style={styles.controlLabel}>Leave</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function GroupCallScreen({ route, navigation }) {
  const { conversationId, conversationName = 'Group', callType = 'audio', roomId = null } = route.params || {};
  const [connection, setConnection] = useState(null);
  const [errorText, setErrorText] = useState('');
  const [busy, setBusy] = useState(true);
  const endingRef = useRef(false);
  const connectionRef = useRef(null);

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

  const endCall = async () => {
    if (!connection || endingRef.current) return;
    endingRef.current = true;
    try {
      const { data } = await supabase.auth.getUser();
      const isHost = connection.room?.host_user_id === data?.user?.id;
      await backendFetch(`/group-calls/${connection.roomId}/${isHost ? 'end' : 'leave'}`, { method: 'POST' });
    } catch (_) {
      // Leaving the media room still takes priority if the backend is offline.
    } finally {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.brand}>ZannyChat</Text>
        <Text style={styles.title}>{conversationName}</Text>
        <Text style={styles.subtitle}>{connection?.callType === 'video' || callType === 'video' ? 'Group video call' : 'Group audio call'}</Text>
      </View>
      {busy ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#B6AFFF" /><Text style={styles.empty}>Preparing secure group call…</Text></View>
      ) : errorText ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color="#F3A8A8" />
          <Text style={styles.error}>{errorText}</Text>
          <Text style={styles.empty}>Group media requires a configured LiveKit SFU and server credentials.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><Text style={styles.backText}>Go back</Text></TouchableOpacity>
        </View>
      ) : connection ? (
        <LiveKitRoom serverUrl={connection.livekitUrl} token={connection.token} connect={true} audio={true} video={connection.callType === 'video'} options={{ adaptiveStream: true, dynacast: true }}>
          <GroupRoomContent callType={connection.callType} onEnd={endCall} />
        </LiveKitRoom>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#11101A' },
  header: { alignItems: 'center', paddingTop: 16, paddingBottom: 12 },
  brand: { color: '#B6AFFF', fontSize: 12, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginTop: 8 },
  subtitle: { color: '#AAA7BD', fontSize: 13, marginTop: 4 },
  room: { flex: 1, justifyContent: 'space-between' },
  tiles: { padding: 8, gap: 8 },
  tile: { flex: 1, minHeight: 190, margin: 4, borderRadius: 18, overflow: 'hidden', backgroundColor: '#242235' },
  video: { flex: 1, minHeight: 190 },
  tileName: { color: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0.55)', padding: 8, fontSize: 12, fontWeight: '700' },
  empty: { color: '#AAA7BD', textAlign: 'center', padding: 18, lineHeight: 21 },
  audioStage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  audioOrb: { width: 112, height: 112, borderRadius: 56, backgroundColor: '#6557D9', alignItems: 'center', justifyContent: 'center' },
  audioTitle: { color: '#FFFFFF', fontSize: 21, fontWeight: '800', marginTop: 22 },
  audioHint: { color: '#AAA7BD', marginTop: 8 },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: 18, padding: 20, paddingBottom: 28 },
  control: { width: 72, height: 72, borderRadius: 26, backgroundColor: '#343146', alignItems: 'center', justifyContent: 'center', gap: 4 },
  controlActive: { backgroundColor: '#6557D9' },
  hangup: { backgroundColor: '#D74358' },
  controlLabel: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  error: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', textAlign: 'center', marginTop: 16 },
  back: { marginTop: 22, backgroundColor: '#6557D9', paddingVertical: 12, paddingHorizontal: 22, borderRadius: 14 },
  backText: { color: '#FFFFFF', fontWeight: '800' },
});
