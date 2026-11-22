import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Room, RoomEvent, Track } from 'livekit-client';
import { backendFetch } from '../services/backendClient';
import { supabase } from '../services/supabaseClient';
import { useTheme } from '../theme/ThemeContext';
import CallInvitePicker from '../components/CallInvitePicker';
import { updateCallStatus } from '../services/calls';

function MediaTile({ track, name, local, colors }) {
  const elementRef = useRef(null);
  useEffect(() => {
    if (!track || !elementRef.current) return undefined;
    const element = track.attach();
    element.autoplay = true;
    element.playsInline = true;
    element.muted = Boolean(local);
    element.style.width = '100%';
    element.style.height = '100%';
    element.style.objectFit = 'cover';
    elementRef.current.replaceChildren(element);
    return () => {
      track.detach(element);
      elementRef.current?.replaceChildren();
    };
  }, [track, local]);
  return (
    <View style={[styles.videoTile, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      <View ref={elementRef} style={styles.videoElement} />
      <View style={styles.videoName}><Text style={styles.videoNameText}>{name}</Text></View>
    </View>
  );
}

export default function GroupCallScreenWeb({ route, navigation }) {
  const { roomId, directCallId = null, directCall = null, conversationId, conversationName = 'Group call', callType = 'audio', connection: initialConnection = null } = route.params || {};
  const { colors, typography } = useTheme();
  const [connection, setConnection] = useState(null);
  const [status, setStatus] = useState('Connecting…');
  const [errorText, setErrorText] = useState('');
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(callType !== 'video');
  const [isVideo, setIsVideo] = useState(callType === 'video');
  const [cameraFacingMode, setCameraFacingMode] = useState('user');
  const cameraSwitchInProgressRef = useRef(false);
  const [remoteVideoTracks, setRemoteVideoTracks] = useState([]);
  const [participantIds, setParticipantIds] = useState([]);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [invitePickerVisible, setInvitePickerVisible] = useState(false);
  const [canInvite, setCanInvite] = useState(false);
  const [canEnd, setCanEnd] = useState(false);
  const roomRef = useRef(null);
  const joinedRoomIdRef = useRef(roomId || null);
  const remoteAudioRef = useRef(null);
  const remoteAudioTracksRef = useRef(new Map());
  const activeRef = useRef(false);
  const endedRef = useRef(false);
  const requestedVideo = callType === 'video';
  const isVideoMode = isVideo;
  const canInviteNow = canInvite && status === 'Connected';

  useEffect(() => {
    if (!roomId && !directCallId && !conversationId) {
      setStatus('Unavailable');
      setErrorText('This group conversation is missing.');
      return undefined;
    }
    let active = true;
    activeRef.current = true;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    const refreshParticipants = () => {
      if (!active) return;
      setParticipantIds([room.localParticipant.identity, ...Array.from(room.remoteParticipants.values()).map((p) => p.identity)].filter(Boolean));
    };
    const onTrackSubscribed = (track, _publication, participant) => {
      if (track.kind === Track.Kind.Audio) {
        const previousElement = remoteAudioTracksRef.current.get(track.sid);
        if (previousElement) {
          track.detach(previousElement);
          previousElement.remove?.();
        }
        const element = track.attach();
        element.autoplay = true;
        element.playsInline = true;
        element.muted = false;
        element.volume = 1;
        element.setAttribute?.('autoplay', '');
        element.setAttribute?.('playsinline', '');
        const audioContainer = remoteAudioRef.current;
        if (audioContainer && element.parentNode !== audioContainer) audioContainer.appendChild(element);
        remoteAudioTracksRef.current.set(track.sid, element);
        // Browsers may reject autoplay until a user gesture. Surface the
        // existing audio-unlock action instead of silently losing remote audio.
        const playback = element.play?.();
        if (playback?.catch) playback.catch(() => { if (active) setAudioBlocked(true); });
      } else if (track.kind === Track.Kind.Video) {
        setRemoteVideoTracks((current) => current.some((entry) => entry.track.sid === track.sid)
          ? current.map((entry) => entry.track.sid === track.sid
            ? { ...entry, track, participant, isMuted: Boolean(track.isMuted) }
            : entry)
          : [...current, { track, participant, isMuted: Boolean(track.isMuted) }]);
      }
      refreshParticipants();
      setAudioBlocked(!room.canPlaybackAudio);
    };
    const updateRemoteVideoMuteState = (publication, participant, isMuted) => {
      const trackSid = publication?.trackSid || publication?.sid || publication?.track?.sid;
      if (publication?.kind !== Track.Kind.Video) return;
      if (publication?.source && publication.source !== Track.Source.Camera) return;
      if (!trackSid && !participant?.identity) return;
      setRemoteVideoTracks((current) => current.map((entry) => (
        (trackSid && entry.track.sid === trackSid) || (!trackSid && entry.participant?.identity === participant.identity)
          ? { ...entry, isMuted }
          : entry
      )));
    };
    const onTrackMuted = (publication, participant) => {
      updateRemoteVideoMuteState(publication, participant, true);
      refreshParticipants();
    };
    const onTrackUnmuted = (publication, participant) => {
      updateRemoteVideoMuteState(publication, participant, false);
      refreshParticipants();
    };
    const onTrackUnsubscribed = (track) => {
      const detached = track.detach();
      (Array.isArray(detached) ? detached : [detached]).filter(Boolean).forEach((element) => element.remove?.());
      remoteAudioTracksRef.current.delete(track.sid);
      if (track.kind === Track.Kind.Video) setRemoteVideoTracks((current) => current.filter((entry) => entry.track.sid !== track.sid));
      refreshParticipants();
    };
    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
    room.on(RoomEvent.TrackMuted, onTrackMuted);
    room.on(RoomEvent.TrackUnmuted, onTrackUnmuted);
    room.on(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed);
    room.on(RoomEvent.ParticipantConnected, refreshParticipants);
    room.on(RoomEvent.ParticipantDisconnected, refreshParticipants);
    room.on(RoomEvent.AudioPlaybackStatusChanged, () => setAudioBlocked(!room.canPlaybackAudio));
    room.on(RoomEvent.Reconnecting, () => { if (active) setStatus('Reconnecting…'); });
    room.on(RoomEvent.Reconnected, () => { if (active) setStatus('Connected'); });
    room.on(RoomEvent.Disconnected, () => { if (active && !endedRef.current) setStatus('Disconnected'); });

    (async () => {
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
        result = await backendFetch('/group-calls', {
          method: 'POST',
          body: JSON.stringify({ conversationId, callType }),
        });
      }
      if (!active) {
        if (result?.room?.id && !directCallId) await backendFetch(`/group-calls/${result.room.id}/leave`, { method: 'POST' }).catch(() => {});
        return;
      }
      const connected = { ...result, roomId: result.roomId || result.room.id, callType: result.callType || result.room.call_type || callType };
      joinedRoomIdRef.current = connected.roomId;
      setConnection(connected);
      setIsVideo(connected.callType === 'video');
      setCameraOff(connected.callType !== 'video');
      await room.connect(connected.livekitUrl, connected.token);
      if (!active) return;
      await room.localParticipant.setMicrophoneEnabled(true);
      if (connected.callType === 'video') {
        try {
          await room.localParticipant.setCameraEnabled(true);
          setCameraOff(false);
        } catch (_) {
          setCameraOff(true);
          setErrorText('Camera access is unavailable. You can continue with audio.');
        }
      }
      refreshParticipants();
      setAudioBlocked(!room.canPlaybackAudio);
      setStatus('Connected');
    })().catch(async (error) => {
      if (!active) return;
      // A failed browser media startup must not leave an accepted direct call
      // appearing active after the caller has lost its media connection.
      const activeRoomId = joinedRoomIdRef.current;
      if (directCallId && activeRoomId) {
        await updateCallStatus(directCallId, 'ended').catch(() => {});
      } else if (activeRoomId) {
        await backendFetch(`/group-calls/${activeRoomId}/leave`, { method: 'POST' }).catch(() => {});
      }
      try { room.disconnect(); } catch (_) {}
      const permissionMessage = error?.name === 'NotAllowedError'
        ? 'Chrome blocked microphone or camera access. Allow ZannyChat to use your microphone and camera in site settings, then start a new call.'
        : error?.name === 'NotFoundError'
          ? 'No usable microphone or camera was found on this device.'
          : error?.name === 'NotReadableError'
            ? 'Your microphone or camera is busy in another app. Close other apps using it and try again.'
            : error?.name === 'OverconstrainedError'
              ? 'This device cannot provide the requested call quality. Try again with another camera or microphone.'
              : error?.message || 'Could not connect to this call. Check your connection and try again.';
      setStatus('Unavailable');
      setErrorText(permissionMessage);
    });

    return () => {
      active = false;
      activeRef.current = false;
      room.removeAllListeners();
      for (const [trackSid, element] of remoteAudioTracksRef.current) {
        try {
          const publication = Array.from(room.remoteParticipants.values())
            .flatMap((participant) => Array.from(participant.trackPublications.values()))
            .find((entry) => entry.trackSid === trackSid || entry.track?.sid === trackSid);
          publication?.track?.detach(element);
        } catch (_) {}
        element.remove?.();
      }
      remoteAudioTracksRef.current.clear();
      room.disconnect();
      for (const publication of room.localParticipant.trackPublications.values()) publication.track?.stop?.();
      const activeRoomId = joinedRoomIdRef.current;
      if (!directCallId && !endedRef.current && activeRoomId) backendFetch(`/group-calls/${activeRoomId}/leave`, { method: 'POST' }).catch(() => {});
      roomRef.current = null;
    };
  }, [roomId, directCallId, directCall, requestedVideo, initialConnection, conversationId, callType]);

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

  useEffect(() => {
    if (!connection?.roomId || status !== 'Connected') return undefined;
    let active = true;
    const heartbeat = async () => {
      try {
        let result;
        if (directCallId) {
          if (!supabase) throw new Error('Supabase is unavailable for call presence.');
          result = await supabase.rpc('heartbeat_call_session', { p_call_id: directCallId });
          if (result?.error) throw result.error;
        } else {
          result = await backendFetch(`/group-calls/${connection.roomId}/heartbeat`, { method: 'POST' });
        }
        return result;
      } catch (error) {
        if (active) console.warn('[calls] presence heartbeat failed:', error?.message || error);
        return null;
      }
    };
    heartbeat();
    const interval = setInterval(heartbeat, 30_000);
    return () => { active = false; clearInterval(interval); };
  }, [connection?.roomId, directCallId, status]);

  const toggleMute = useCallback(async () => {
    const next = !muted;
    try {
      await roomRef.current?.localParticipant.setMicrophoneEnabled(!next);
      setMuted(next);
    } catch (error) { setErrorText(error?.message || 'Could not change microphone state.'); }
  }, [muted]);

  const toggleCamera = useCallback(async () => {
    const next = !cameraOff;
    try {
      await roomRef.current?.localParticipant.setCameraEnabled(!next);
      setCameraOff(next);
      setIsVideo(!next);
    } catch (error) { setErrorText(error?.message || 'Could not change camera state.'); }
  }, [cameraOff]);

  const switchCamera = useCallback(async () => {
    const room = roomRef.current;
    if (cameraSwitchInProgressRef.current || cameraOff || !isVideo || !activeRef.current || !room || room.state !== 'connected') return;
    const videoTrack = room.localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack;
    if (!videoTrack || typeof videoTrack.restartTrack !== 'function') {
      setErrorText('Camera switching is unavailable on this device. Your call can continue.');
      return;
    }
    const nextFacingMode = cameraFacingMode === 'user' ? 'environment' : 'user';
    cameraSwitchInProgressRef.current = true;
    try {
      await videoTrack.restartTrack({ facingMode: nextFacingMode });
      setCameraFacingMode(nextFacingMode);
      setErrorText('');
    } catch (_) {
      setErrorText('Could not switch camera. Your current camera is still active.');
    } finally {
      cameraSwitchInProgressRef.current = false;
    }
  }, [cameraFacingMode, cameraOff, isVideo]);

  const enableAudio = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.startAudio();
      const playbackResults = await Promise.allSettled(
        Array.from(remoteAudioTracksRef.current.values()).map((element) => element.play?.())
      );
      const rejectedPlayback = playbackResults.some((result) => result.status === 'rejected');
      setAudioBlocked(!room.canPlaybackAudio || rejectedPlayback);
    } catch (_) { setAudioBlocked(true); }
  }, []);

  const endCall = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    const activeRoom = roomRef.current;
    // Disconnect and stop local capture, then leave immediately. Server state
    // is updated asynchronously so an offline API cannot trap the user in-call.
    try { activeRoom?.disconnect(); } catch (_) {}
    try {
      for (const publication of activeRoom?.localParticipant?.trackPublications?.values?.() || []) {
        publication.track?.stop?.();
      }
    } catch (_) {}
    const activeRoomId = connection?.roomId || joinedRoomIdRef.current || roomId;
    navigation.goBack();
    const persistLeave = directCallId
      ? updateCallStatus(directCallId, 'ended')
      : activeRoomId
        ? backendFetch(`/group-calls/${activeRoomId}/${canEnd ? 'end' : 'leave'}`, { method: 'POST' })
        : Promise.resolve();
    Promise.resolve(persistLeave).catch((error) => {
      // Heartbeats stop on unmount; backend stale-session cleanup is the
      // fallback if the best-effort leave request cannot reach the server.
      console.warn('[calls] local room disconnected; server leave update failed:', error?.message || error);
    });
  }, [canEnd, connection?.roomId, directCallId, navigation, roomId]);

  const invitePerson = useCallback(async (person) => {
    if (directCallId) {
      endedRef.current = true;
      let result;
      try {
        result = await backendFetch(`/group-calls/upgrade/${directCallId}`, {
          method: 'POST',
          body: JSON.stringify({ userIds: [person.id], callType: connection?.callType || callType }),
        });
      } catch (error) {
        endedRef.current = false;
        throw error;
      }
      if (!result?.room?.id) {
        endedRef.current = false;
        throw new Error('Could not upgrade this call to a conference.');
      }
      navigation.replace('GroupCall', {
        roomId: result.room.id,
        connection: result,
        conversationId: result.room.conversation_id || conversationId,
        conversationName: 'Group call',
        callType: result.room.call_type || callType,
      });
      return;
    }
    await backendFetch(`/group-calls/${connection.roomId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ userIds: [person.id] }),
    });
  }, [callType, connection?.callType, connection?.roomId, conversationId, directCallId, navigation]);

  useEffect(() => {
    if (!directCallId || !supabase) return undefined;
    let active = true;
    const handleCallUpdate = (next) => {
      if (!active || !next || endedRef.current) return;
      if (next.group_room_id) {
        endedRef.current = true;
        navigation.replace('GroupCall', {
          roomId: next.group_room_id,
          conversationId: next.conversation_id || conversationId,
          conversationName: 'Group call',
          callType: next.call_type || callType,
        });
      } else if (['declined', 'cancelled', 'ended', 'missed', 'failed'].includes(next.status)) {
        endedRef.current = true;
        navigation.goBack();
      }
    };
    const channel = supabase.channel(`direct-livekit-call-web:${directCallId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'call_sessions', filter: `id=eq.${directCallId}` }, (event) => handleCallUpdate(event?.new))
      .subscribe((channelStatus) => {
        if (channelStatus === 'SUBSCRIBED') {
          supabase.from('call_sessions').select('id,conversation_id,call_type,status,group_room_id')
            .eq('id', directCallId).maybeSingle()
            .then(({ data }) => { if (data) handleCallUpdate(data); }).catch(() => {});
        }
      });
    return () => { active = false; supabase.removeChannel(channel); };
  }, [callType, conversationId, directCallId, navigation]);

  const localCameraTrack = roomRef.current?.localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack;
  const remoteVideoTracksView = remoteVideoTracks;

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerCopy}>
          <Text style={[typography.title, { color: colors.textPrimary }]}>{conversationName || 'Group call'}</Text>
          <Text style={[typography.small, { color: colors.textSecondary }]}>{status} · {participantIds.length || 1} connected</Text>
        </View>
      </View>

      <View style={styles.rosterStrip} accessibilityLabel={`Call participants, ${participantIds.length} connected`}>
        <Text style={[typography.caption, styles.rosterEyebrow, { color: colors.textSecondary }]}>IN THE ROOM</Text>
        <View style={styles.rosterChips}>
          {participantIds.map((identity) => {
            const participant = identity === roomRef.current?.localParticipant?.identity
              ? roomRef.current?.localParticipant
              : roomRef.current?.remoteParticipants?.get(identity);
            return (
              <View key={identity} style={[styles.rosterChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.rosterPresence, { backgroundColor: colors.online }]} />
                <Text style={[typography.small, styles.rosterName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {participant?.name || identity}{identity === roomRef.current?.localParticipant?.identity ? ' · You' : ''}
                </Text>
                <Ionicons
                  name={participant?.isMicrophoneEnabled === false ? 'mic-off-outline' : 'mic-outline'}
                  size={13}
                  color={participant?.isMicrophoneEnabled === false ? colors.warning || colors.gold : colors.textSecondary}
                  accessibilityLabel={participant?.isMicrophoneEnabled === false ? 'Microphone muted' : 'Microphone on'}
                />
                <Ionicons
                  name={participant?.isCameraEnabled ? 'videocam-outline' : 'videocam-off-outline'}
                  size={13}
                  color={participant?.isCameraEnabled ? colors.primary : colors.textSecondary}
                  accessibilityLabel={participant?.isCameraEnabled ? 'Camera on' : 'Camera off'}
                />
              </View>
            );
          })}
        </View>
      </View>

      {errorText ? <Text style={[typography.small, styles.error, { color: colors.danger }]}>{errorText}</Text> : null}

      {(isVideoMode || localCameraTrack || remoteVideoTracksView.length > 0) ? (
        <ScrollView contentContainerStyle={styles.videoGrid}>
          {localCameraTrack && !cameraOff
            ? <MediaTile track={localCameraTrack} name="You" local colors={colors} />
            : <View style={[styles.placeholderTile, { backgroundColor: colors.surface, borderColor: colors.border }]}><Ionicons name="videocam-off" size={28} color={colors.textSecondary} /><Text style={[typography.small, { color: colors.textSecondary }]}>Your camera is off</Text></View>}
          {remoteVideoTracksView.map(({ track, participant, isMuted }) => (
            isMuted
              ? <View key={track.sid} style={[styles.placeholderTile, { backgroundColor: colors.surface, borderColor: colors.border }]}><Ionicons name="videocam-off" size={28} color={colors.textSecondary} /><Text style={[typography.small, { color: colors.textSecondary }]}>{participant?.name || participant?.identity || 'Participant'} camera is off</Text></View>
              : <MediaTile key={track.sid} track={track} name={participant?.name || participant?.identity || 'Participant'} colors={colors} />
          ))}
          {!remoteVideoTracksView.length ? <View style={[styles.placeholderTile, { backgroundColor: colors.surface, borderColor: colors.border }]}><Ionicons name="people" size={28} color={colors.textSecondary} /><Text style={[typography.small, { color: colors.textSecondary }]}>Waiting for other cameras…</Text></View> : null}
        </ScrollView>
      ) : (
        <View style={styles.audioStage}>
          <View style={[styles.audioOrb, { backgroundColor: colors.surface, borderColor: colors.border }]}><Ionicons name="people" size={44} color={colors.primary} /></View>
          <Text style={[typography.title, { color: colors.textPrimary }]}>{directCallId ? 'Voice call' : 'Voice conference'}</Text>
          <Text style={[typography.small, { color: colors.textSecondary }]}>{participantIds.length || 1} participants connected</Text>
        </View>
      )}

      <View ref={remoteAudioRef} style={styles.hiddenAudio} />
      {audioBlocked ? (
        <TouchableOpacity onPress={enableAudio} accessibilityRole="button" accessibilityLabel="Enable call audio" style={[styles.audioUnlock, { backgroundColor: colors.primary }]}>
          <Ionicons name="volume-high" size={17} color={colors.onPrimary} />
          <Text style={[typography.small, { color: colors.onPrimary, fontWeight: '800' }]}>Tap to hear participants</Text>
        </TouchableOpacity>
      ) : null}

      <View style={[styles.controls, { backgroundColor: hexToRgba(colors.surface, 0.86), borderColor: colors.border }]}>
        <TouchableOpacity onPress={toggleMute} accessibilityRole="button" accessibilityLabel={muted ? 'Unmute microphone' : 'Mute microphone'} style={[styles.control, { backgroundColor: muted ? colors.primary : colors.surface, borderColor: colors.border }]}>
          <Ionicons name={muted ? 'mic-off' : 'mic'} size={21} color={muted ? colors.onPrimary : colors.textPrimary} />
          <Text style={[typography.small, { color: muted ? colors.onPrimary : colors.textPrimary }]}>{muted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleCamera} accessibilityRole="button" accessibilityLabel={cameraOff ? 'Turn camera on' : 'Turn camera off'} style={[styles.control, { backgroundColor: cameraOff ? colors.primary : colors.surface, borderColor: colors.border }]}>
            <Ionicons name={cameraOff ? 'videocam-off' : 'videocam'} size={21} color={cameraOff ? colors.onPrimary : colors.textPrimary} />
            <Text style={[typography.small, { color: cameraOff ? colors.onPrimary : colors.textPrimary }]}>{cameraOff ? 'Switch to video' : 'Switch to audio'}</Text>
        </TouchableOpacity>
        {isVideo && !cameraOff ? (
          <TouchableOpacity onPress={switchCamera} accessibilityRole="button" accessibilityLabel={cameraFacingMode === 'user' ? 'Switch to rear camera' : 'Switch to front camera'} style={[styles.control, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="camera-reverse" size={21} color={colors.textPrimary} />
            <Text style={[typography.small, { color: colors.textPrimary }]}>Flip camera</Text>
          </TouchableOpacity>
        ) : null}
        {canInviteNow ? (
          <TouchableOpacity onPress={() => setInvitePickerVisible(true)} accessibilityRole="button" accessibilityLabel="Add people to call" style={[styles.control, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="person-add" size={21} color={colors.textPrimary} />
            <Text style={[typography.small, { color: colors.textPrimary }]}>Add people</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity onPress={endCall} accessibilityRole="button" accessibilityLabel={canEnd ? 'End call' : 'Leave call'} style={[styles.control, { backgroundColor: colors.danger, borderColor: colors.danger }]}>
          <Ionicons name="call" size={21} color={colors.onDanger} style={{ transform: [{ rotate: '135deg' }] }} />
          <Text style={[typography.small, { color: colors.onDanger }]}>{canEnd ? 'End call' : 'Leave'}</Text>
        </TouchableOpacity>
      </View>

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
  safe: { flex: 1, minHeight: '100%' },
  header: { minHeight: 68, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth },
  headerCopy: { flex: 1, gap: 4 },
  error: { paddingHorizontal: 18, paddingTop: 10 },
  rosterStrip: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8, gap: 7, width: '100%', maxWidth: 760, alignSelf: 'center' },
  rosterEyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  rosterChips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 7 },
  rosterChip: { maxWidth: '48%', minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 },
  rosterPresence: { width: 6, height: 6, borderRadius: 3 },
  rosterName: { maxWidth: 150, fontSize: 11, fontWeight: '700' },
  videoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 14, justifyContent: 'center' },
  videoTile: { width: '47%', minWidth: 145, aspectRatio: 9 / 16, maxHeight: 330, borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  videoElement: { flex: 1, width: '100%', minHeight: 180 },
  videoName: { position: 'absolute', left: 8, bottom: 8, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  videoNameText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  placeholderTile: { width: '47%', minWidth: 145, aspectRatio: 9 / 16, maxHeight: 330, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 9 },
  audioStage: { flex: 1, minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: 12 },
  audioOrb: { width: 116, height: 116, borderRadius: 58, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  hiddenAudio: { width: 0, height: 0, overflow: 'hidden' },
  audioUnlock: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 13, marginBottom: 8 },
  controls: { width: '100%', maxWidth: 680, alignSelf: 'center', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 9, marginHorizontal: 12, marginBottom: 14, paddingHorizontal: 12, paddingVertical: 14, borderWidth: 1, borderRadius: 28 },
  control: { minWidth: 68, minHeight: 64, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7 },
});
