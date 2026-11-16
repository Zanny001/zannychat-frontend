import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
import { Room, RoomEvent, Track } from 'livekit-client';
import { backendFetch } from '../services/backendClient';
import { useTheme } from '../theme/ThemeContext';

const LIVE_REACTION_EMOJI = Object.freeze({ heart: '❤️', clap: '👏', laugh: '😂', wow: '😮', fire: '🔥', idea: '💡', support: '🙌' });

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

function RemoteVideoTile({ track, participant, colors, creatorId, spotlight = false, single = false }) {
  const containerRef = useRef(null);
  useEffect(() => {
    const element = track.attach();
    element.autoplay = true;
    element.playsInline = true;
    element.style.width = '100%';
    element.style.height = '100%';
    element.style.objectFit = 'contain';
    containerRef.current?.replaceChildren(element);
    return () => {
      track.detach(element);
      containerRef.current?.replaceChildren();
    };
  }, [track]);
  return (
    <View style={{ width: spotlight || single ? '100%' : '48%', maxWidth: spotlight || single ? 560 : 520, minWidth: spotlight || single ? 0 : 140, aspectRatio: 16 / 9, borderRadius: 16, overflow: 'hidden', backgroundColor: '#050509', borderWidth: spotlight ? 2 : 1, borderColor: spotlight ? colors.accent : colors.border }}>
      <View ref={containerRef} collapsable={false} style={{ width: '100%', height: '100%' }} />
      {spotlight && <View style={{ position: 'absolute', top: 8, left: 8, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9, backgroundColor: colors.accent }}><Text style={{ color: colors.onAccent, fontWeight: '900', fontSize: 10 }}>SPOTLIGHT</Text></View>}
      <View style={{ position: 'absolute', top: 8, right: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.72)' }}>
        <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '900' }}>{participant.identity === creatorId ? 'HOST' : 'GUEST'}</Text>
      </View>
      <View style={{ position: 'absolute', left: 8, bottom: 8, maxWidth: '88%', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.65)' }}>
        <Text numberOfLines={1} style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>{participant.name || participant.identity}</Text>
      </View>
    </View>
  );
}

function Action({ colors, label, accessibilityLabel, onPress, disabled = false, danger = false }) {
  const { typography } = useTheme();
  return <TouchableOpacity disabled={disabled} onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel || label} accessibilityState={{ disabled }} style={{ minHeight: 48, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 12, backgroundColor: danger ? colors.danger : colors.surfaceAlt, justifyContent: 'center', alignItems: 'center', opacity: disabled ? 0.5 : 1 }}>
    <Text style={[typography.small, { color: danger ? colors.onDanger : colors.textPrimary }]}>{label}</Text>
  </TouchableOpacity>;
}

export default function LiveStreamScreen({ route, navigation }) {
  const { colors, typography } = useTheme();
  const initialConnection = route.params?.connection && typeof route.params.connection === 'object'
    ? route.params.connection
    : null;
  const streamId = route.params?.streamId || initialConnection?.stream?.id || null;
  const [connection, setConnection] = useState(initialConnection);
  const [connectionLoading, setConnectionLoading] = useState(Boolean(streamId && !initialConnection));
  const stream = connection?.stream;
  const creatorMode = connection?.role === 'creator';
  const [demotedToViewer, setDemotedToViewer] = useState(false);
  const [stageNotice, setStageNotice] = useState('');
  const publisherMode = Boolean(creatorMode || (connection?.role === 'guest' && connection?.canPublish && !demotedToViewer));
  const moderatorMode = Boolean(creatorMode || connection?.canModerate);
  const roomRef = useRef(null);
  const publisherModeRef = useRef(publisherMode);
  publisherModeRef.current = publisherMode;
  const localRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [remoteVideoTracks, setRemoteVideoTracks] = useState([]);
  const [remoteAudioParticipants, setRemoteAudioParticipants] = useState([]);
  const audioOnlyParticipants = remoteAudioParticipants.filter((participant) => !remoteVideoTracks.some((entry) => entry.participant.identity === participant.identity));
  const endedRef = useRef(false);
  const leaveRef = useRef(null);
  const [status, setStatus] = useState('Connecting…');
  useEffect(() => {
    setDemotedToViewer(false);
    setStageNotice('');
    setCamera(publisherMode);
    setMic(publisherMode);
  }, [connection?.token]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [replayEnabled, setReplayEnabled] = useState(false);
  const [replay, setReplay] = useState(null);
  const [replayBusy, setReplayBusy] = useState(false);
  const [camera, setCamera] = useState(publisherMode);
  const [mic, setMic] = useState(publisherMode);
  const localAudioOnly = publisherMode && mic && !camera;
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [comments, setComments] = useState([]);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const seenReactionIds = useRef(new Set());
  const [draft, setDraft] = useState('');
  const [guestStatus, setGuestStatus] = useState('none');
  const [guestApproved, setGuestApproved] = useState(false);
  const [guestRequests, setGuestRequests] = useState([]);
  const seenGuestRequestIds = useRef(new Set());
  const [reports, setReports] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [panel, setPanel] = useState('');

  const refreshReplay = useCallback(async () => {
    if (!stream?.id || !creatorMode || !replayEnabled) return;
    try {
      const result = await backendFetch(`/live/${stream.id}/replays`);
      const rows = Array.isArray(result?.replays) ? result.replays : [];
      setReplay(rows.find((item) => ['starting', 'recording', 'processing', 'ready', 'failed'].includes(item.status)) || null);
    } catch (_) {}
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
    if (!streamId) {
      setConnection(null);
      setConnectionLoading(false);
      setError('This LIVE link is incomplete. Reopen it from LIVE Hub.');
      setStatus('Unable to connect');
      return undefined;
    }
    if (initialConnection?.stream?.id === streamId && initialConnection?.token && initialConnection?.livekitUrl) {
      setConnectionLoading(false);
      return undefined;
    }
    let active = true;
    setConnection(null);
    setConnectionLoading(true);
    setError('');
    backendFetch(`/live/${streamId}/join`, { method: 'POST' })
      .then((nextConnection) => {
        if (!nextConnection?.stream?.id || nextConnection.stream.id !== streamId
            || !nextConnection?.token || !nextConnection?.livekitUrl) {
          throw new Error('The server did not return a complete LIVE room connection.');
        }
        if (active) setConnection(nextConnection);
      })
      .catch((joinError) => {
        if (active) {
          setError(joinError?.message || 'Could not join this LIVE stream.');
          setStatus('Unable to connect');
        }
      })
      .finally(() => {
        if (active) setConnectionLoading(false);
      });
    return () => { active = false; };
  }, [streamId]);

  useEffect(() => {
    if (connectionLoading) {
      setStatus('Connecting…');
      return undefined;
    }
    if (!stream?.id || !connection?.livekitUrl || !connection?.token) {
      setError('This LIVE room is missing its secure connection details.');
      setStatus('Unable to connect');
      return undefined;
    }
    let active = true;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    const attach = (track, target) => {
      if (!active || !target) return;
      const element = track.attach();
      element.autoplay = true;
      element.playsInline = true;
      if (track.kind === Track.Kind.Video) {
        element.style.width = '100%';
        element.style.height = '100%';
        element.style.objectFit = 'contain';
      }
      target.appendChild(element);
    };
    const onSubscribed = (track, publication, participant) => {
      if (track.kind === Track.Kind.Video) {
        setRemoteVideoTracks((current) => current.some((item) => item.track.sid === track.sid)
          ? current
          : [...current, { track, publication, participant }]);
      } else if (track.kind === Track.Kind.Audio) {
        attach(track, remoteAudioRef.current);
        setRemoteAudioParticipants((current) => current.some((item) => item.identity === participant.identity)
          ? current
          : [...current, { identity: participant.identity, name: participant.name || participant.identity }]);
      }
    };
    const onUnsubscribed = (track, publication, participant) => {
      if (track.kind === Track.Kind.Video) {
        setRemoteVideoTracks((current) => current.filter((item) => item.track.sid !== track.sid));
      }
      if (track.kind === Track.Kind.Audio) {
        setRemoteAudioParticipants((current) => current.filter((item) => item.identity !== participant.identity));
      }
      track.detach();
    };
    const onUnpublished = (publication, participant) => {
      if (publication.source === Track.Source.Camera) {
        setRemoteVideoTracks((current) => current.filter((item) => item.participant.identity !== participant.identity));
      }
      if (publication.source === Track.Source.Microphone) {
        setRemoteAudioParticipants((current) => current.filter((item) => item.identity !== participant.identity));
      }
    };
    const onTrackMuted = (publication, participant) => {
      if (!participant.isLocal && publication.source === Track.Source.Camera) {
        setRemoteVideoTracks((current) => current.filter((item) => item.participant.identity !== participant.identity));
      }
    };
    const onTrackUnmuted = (publication, participant) => {
      if (!participant.isLocal && publication.source === Track.Source.Camera && publication.track) {
        setRemoteVideoTracks((current) => current.some((item) => item.track.sid === publication.track.sid)
          ? current
          : [...current, { track: publication.track, publication, participant }]);
      }
    };
    const onParticipantDisconnected = (participant) => {
      setRemoteVideoTracks((current) => current.filter((item) => item.participant.identity !== participant.identity));
      setRemoteAudioParticipants((current) => current.filter((item) => item.identity !== participant.identity));
    };
    const onTrackSubscriptionFailed = (trackSid, participant) => {
      if (!active) return;
      setError('Could not receive media from ' + (participant?.name || participant?.identity || 'a LIVE participant') + '. Check the connection and try rejoining.');
    };
    const onLocalPublished = (publication) => {
      if (publication.source === Track.Source.Camera && publication.videoTrack && localRef.current) {
        localRef.current.replaceChildren();
        attach(publication.videoTrack, localRef.current);
      }
    };

    room.on(RoomEvent.TrackSubscribed, onSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, onUnsubscribed);
    room.on(RoomEvent.TrackUnpublished, onUnpublished);
    room.on(RoomEvent.TrackMuted, onTrackMuted);
    room.on(RoomEvent.TrackUnmuted, onTrackUnmuted);
    room.on(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
    room.on(RoomEvent.TrackSubscriptionFailed, onTrackSubscriptionFailed);
    room.on(RoomEvent.ParticipantAttributesChanged, () => setRemoteVideoTracks((current) => [...current]));
    room.on(RoomEvent.LocalTrackPublished, onLocalPublished);
    room.on(RoomEvent.ParticipantPermissionsChanged, (_previousPermissions, participant) => {
      if (participant.identity === room.localParticipant.identity && participant.permissions?.canPublish === false) {
        setDemotedToViewer(true);
        setCamera(false);
        setMic(false);
        setStageNotice('The creator moved you to the audience. You can keep watching the LIVE.');
        setStatus('Watching as viewer');
      }
    });
    room.on(RoomEvent.AudioPlaybackStatusChanged, () => active && setAudioBlocked(!room.canPlaybackAudio));
    room.on(RoomEvent.Disconnected, () => active && setStatus('Disconnected'));
    (async () => {
      try {
        await room.connect(connection.livekitUrl, connection.token, { autoSubscribe: true });
        if (!active) return;
        if (publisherModeRef.current) {
          setStatus('Starting camera and microphone…');
          await room.localParticipant.enableCameraAndMicrophone();
          if (!active) return;
          setCamera(true); setMic(true);
          const video = room.localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack;
          if (video && localRef.current) attach(video, localRef.current);
          setStatus('You are LIVE');
        } else {
          setStatus('Connected · waiting for the creator');
        }
      } catch (err) {
        if (active) { setStatus('Connection failed'); setError(err?.message || 'Could not connect to the LiveKit room.'); }
      }
    })();

    return () => {
      active = false;
      room.removeAllListeners();
      room.disconnect();
      if (localRef.current) localRef.current.replaceChildren();
      if (remoteAudioRef.current) remoteAudioRef.current.replaceChildren();
      setRemoteVideoTracks([]);
      setRemoteAudioParticipants([]);
      roomRef.current = null;
    };
  }, [stream?.id, connection?.livekitUrl, connection?.token, creatorMode, connectionLoading]);

  useEffect(() => {
    if (!stream?.id) return undefined;
    let active = true;
    const room = roomRef.current;
    const heartbeat = () => {
      if (!active || roomRef.current?.state !== 'connected') return;
      backendFetch(`/live/${stream.id}/heartbeat`, { method: 'POST' })
        .catch((error) => { if (active) console.warn('[live] presence heartbeat failed:', error?.message || error); });
    };
    heartbeat();
    room?.on(RoomEvent.Connected, heartbeat);
    room?.on(RoomEvent.Reconnected, heartbeat);
    const interval = setInterval(heartbeat, 30_000);
    return () => {
      active = false;
      clearInterval(interval);
      room?.off(RoomEvent.Connected, heartbeat);
      room?.off(RoomEvent.Reconnected, heartbeat);
    };
  }, [stream?.id, status, connection?.token]);

  const refreshComments = useCallback(async () => {
    if (!stream?.id) return;
    try {
      const result = await backendFetch(`/live/${stream.id}/comments`);
      setComments(Array.isArray(result?.comments) ? result.comments : []);
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
    } catch (err) { setError((current) => current || err?.message || 'Comments unavailable.'); }
  }, [stream?.id]);

  useEffect(() => {
    if (!stream?.id) return undefined;
    refreshComments();
    const timer = setInterval(refreshComments, 4000);
    return () => clearInterval(timer);
  }, [stream?.id, refreshComments]);

  useEffect(() => {
    if (!stream?.id || creatorMode || publisherMode || !stream.allow_guests) return undefined;
    let active = true;
    const check = async () => {
      try {
        const result = await backendFetch(`/live/${stream.id}/guest-status`);
        if (active) { setGuestStatus(result?.status || 'none'); setGuestApproved(result?.status === 'accepted'); }
      } catch (_) {}
    };
    check();
    const timer = setInterval(check, 4000);
    return () => { active = false; clearInterval(timer); };
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
    if (!creatorMode || !stream?.id || !stream.allow_guests) return undefined;
    let active = true;
    const refreshGuestRequests = async () => {
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
        if (hasNewRequest) setPanel('guestRequests');
      } catch (_) {}
    };
    refreshGuestRequests();
    const timer = setInterval(refreshGuestRequests, 3500);
    return () => { active = false; clearInterval(timer); };
  }, [creatorMode, stream?.id, stream?.allow_guests]);

  const leave = async () => {
    if (!stream?.id || endedRef.current || busy) return;
    endedRef.current = true;
    setBusy(true);
    try {
      await backendFetch(`/live/${stream.id}/${creatorMode ? 'end' : 'leave'}`, { method: 'POST' });
      roomRef.current?.disconnect();
      setBusy(false);
      navigation.goBack();
    } catch (err) {
      endedRef.current = false;
      setBusy(false);
      setError(err?.message || (creatorMode ? 'Could not end the LIVE session.' : 'Could not leave the LIVE session.'));
    }
  };
  leaveRef.current = leave;
  const toggleCamera = async () => {
    try { const next = !camera; await roomRef.current?.localParticipant.setCameraEnabled(next); setCamera(next); }
    catch (err) { setError(err?.message || 'Camera permission is unavailable.'); }
  };
  const toggleMic = async () => {
    try { const next = !mic; await roomRef.current?.localParticipant.setMicrophoneEnabled(next); setMic(next); }
    catch (err) { setError(err?.message || 'Microphone permission is unavailable.'); }
  };
  const sendComment = async () => {
    if (!draft.trim() || busy) return;
    setBusy(true);
    try {
      const result = await backendFetch(`/live/${stream.id}/comment`, { method: 'POST', body: JSON.stringify({ body: draft.trim() }) });
      if (result?.comment) setComments((items) => [...items, result.comment].slice(-50));
      setDraft('');
    } catch (err) { setError(err?.message || 'Comment not sent.'); }
    finally { setBusy(false); }
  };
  const react = async (reaction = 'heart') => {
    if (!stream?.id) {
      setError('The LIVE room is still connecting. Please try again.');
      return;
    }
    try {
      const result = await backendFetch(`/live/${stream.id}/react`, { method: 'POST', body: JSON.stringify({ reaction }) });
      if (result?.accepted) await refreshComments();
    } catch (err) {
      setError(err?.message || 'Reaction not sent.');
    }
  };
  const removeFloatingReaction = useCallback((reactionId) => {
    setFloatingReactions((current) => current.filter((item) => item.id !== reactionId));
  }, []);
  const report = async () => {
    const reason = typeof window !== 'undefined' ? window.prompt('Report reason: harassment, hate, spam, or other') : null;
    if (!reason) return;
    const value = reason.trim().toLowerCase();
    if (!['harassment','hate','nudity','violence','spam','copyright','other'].includes(value)) { setError('Invalid report reason.'); return; }
    try { await backendFetch(`/live/${stream.id}/report`, { method: 'POST', body: JSON.stringify({ reason: value }) }); setStatus('Report submitted'); }
    catch (err) { setError(err?.message || 'Report not sent.'); }
  };
  const requestGuest = async () => {
    try { await backendFetch(`/live/${stream.id}/guest-requests`, { method: 'POST' }); setGuestStatus('requested'); }
    catch (err) { setError(err?.message || 'Could not request guest access.'); }
  };
  const joinGuest = async () => {
    try {
      const next = await backendFetch(`/live/${stream.id}/join`, { method: 'POST' });
      if (next?.role !== 'guest' || !next?.canPublish) throw new Error('Guest access has not been approved.');
      setDemotedToViewer(false);
      setStageNotice('');
      setConnection(next);
    } catch (err) { setError(err?.message || 'Could not join as guest.'); }
  };
  const hideComment = async (id) => {
    try { await backendFetch(`/live/${stream.id}/comments/${id}/hide`, { method: 'POST' }); setComments((items) => items.filter((item) => item.id !== id)); }
    catch (err) { setError(err?.message || 'Could not hide comment.'); }
  };
  const loadReports = async () => {
    try {
      if (panel === 'reports') { setPanel(''); return; }
      const result = await backendFetch(`/live/${stream.id}/reports`);
      setReports(Array.isArray(result?.reports) ? result.reports : []); setPanel('reports');
    } catch (err) { setError(err?.message || 'Could not load reports.'); }
  };
  const reviewReport = async (id, statusValue) => {
    try {
      const result = await backendFetch(`/live/${stream.id}/reports/${id}`, { method: 'PATCH', body: JSON.stringify({ status: statusValue }) });
      setReports((items) => items.map((item) => item.id === id ? { ...item, ...result.report } : item));
    } catch (err) { setError(err?.message || 'Could not update report.'); }
  };

  const loadParticipants = async () => {
    try {
      const result = await backendFetch(`/live/${stream.id}/participants`);
      setParticipants(Array.isArray(result?.participants) ? result.participants : []);
      setPanel(panel === 'stage' ? '' : 'stage');
    } catch (err) { setError(err?.message || 'Could not load LIVE stage participants.'); }
  };

  useEffect(() => {
    if (!creatorMode || panel !== 'stage' || !stream?.id) return undefined;
    let active = true;
    const refreshStudioParticipants = () => {
      backendFetch(`/live/${stream.id}/participants`)
        .then((result) => {
          if (active) setParticipants(Array.isArray(result?.participants) ? result.participants : []);
        })
        .catch((refreshError) => {
          if (active) console.warn('[live] creator studio refresh failed:', refreshError?.message || refreshError);
        });
    };
    const interval = setInterval(refreshStudioParticipants, 15_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [creatorMode, panel, stream?.id]);
  const reviewGuestRequest = async (userId, statusValue) => {
    try {
      await backendFetch(`/live/${stream.id}/guest-requests/${userId}`, {
        method: 'PATCH', body: JSON.stringify({ status: statusValue }),
      });
      setGuestRequests((items) => items.filter((item) => item.user_id !== userId));
    } catch (err) { setError(err?.message || 'Could not update guest request.'); }
  };

  const inviteGuest = async (userId) => {
    try {
      await backendFetch(`/live/${stream.id}/guests/invite`, { method: 'POST', body: JSON.stringify({ userId }) });
      setParticipants((items) => items.map((item) => item.userId === userId ? { ...item, guestInvited: true } : item));
    } catch (err) { setError(err?.message || 'Could not invite guest.'); }
  };
  const muteGuest = async (userId, muted) => {
    try {
      const result = await backendFetch(`/live/${stream.id}/guests/${userId}/mute`, { method: 'PATCH', body: JSON.stringify({ muted }) });
      setParticipants((items) => items.map((item) => item.userId === userId ? { ...item, microphoneMuted: result.microphoneMuted } : item));
    } catch (err) { setError(err?.message || 'Could not update guest microphone.'); }
  };
  const removeGuest = async (userId) => {
    const guest = participants.find((item) => item.userId === userId);
    if (typeof window !== 'undefined' && !window.confirm(`Remove ${guest?.name || 'this guest'} from the LIVE stage?`)) return;
    try {
      await backendFetch(`/live/${stream.id}/guests/${userId}`, { method: 'DELETE' });
      await loadParticipants();
    } catch (err) { setError(err?.message || 'Could not remove guest.'); }
  };

  const spotlightGuest = async (userId, spotlighted) => {
    try {
      await backendFetch(`/live/${stream.id}/guests/${userId}/spotlight`, {
        method: 'PATCH', body: JSON.stringify({ spotlighted }),
      });
      setParticipants((items) => items.map((item) => ({ ...item, spotlighted: spotlighted && item.userId === userId })));
    } catch (err) { setError(err?.message || 'Could not update LIVE spotlight.'); }
  };

  const startReplay = async () => {
    if (!stream?.id || replayBusy) return;
    setReplayBusy(true);
    try {
      const result = await backendFetch(`/live/${stream.id}/replays/start`, { method: 'POST' });
      setReplay(result?.replay || null);
      setStatus('Replay recording started · auto-stops after five minutes');
    } catch (err) {
      setError(err?.message || 'Could not start replay recording.');
    } finally {
      setReplayBusy(false);
    }
  };
  const confirmStartReplay = () => {
    if (typeof window !== 'undefined' && !window.confirm("Record this LIVE for up to five minutes? Replay access follows the stream's audience settings.")) return;
    startReplay();
  };
  const stopReplay = async () => {
    if (!stream?.id || !replay?.id || replayBusy) return;
    setReplayBusy(true);
    try {
      const result = await backendFetch(`/live/${stream.id}/replays/${replay.id}/stop`, { method: 'POST' });
      setReplay((current) => ({ ...current, ...(result?.replay || {}), status: result?.replay?.status || 'processing' }));
      setStatus('Preparing LIVE replay…');
      refreshReplay();
    } catch (err) {
      setError(err?.message || 'Could not stop replay recording.');
    } finally {
      setReplayBusy(false);
    }
  };
  const viewReplay = () => {
    if (replay?.id) navigation.navigate('LiveReplay', { replay: { ...replay, streamTitle: stream?.title || 'LIVE replay' } });
  };

  if (!stream || !connection) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}><Text style={[typography.body, { color: colors.textPrimary }]}>This LIVE room is unavailable.</Text><Action colors={colors} label="Go back" onPress={() => navigation.goBack()} /></SafeAreaView>;

  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 }}>
      <Text style={[typography.small, { color: colors.danger }]}>● LIVE</Text>
      <Text numberOfLines={1} style={[typography.heading, { color: colors.textPrimary, flex: 1, minWidth: 0 }]}>{stream.title}</Text>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{status}</Text>
    </View>
    {!!error && <Text accessibilityRole="alert" style={[typography.caption, { color: colors.danger, paddingHorizontal: 14, paddingBottom: 8 }]}>{error}</Text>}
    {!!stageNotice && <Text accessibilityRole="status" style={[typography.caption, { color: colors.accent, paddingHorizontal: 14, paddingBottom: 8 }]}>{stageNotice}</Text>}
    {guestApproved && !publisherMode && <Text accessibilityRole="status" style={[typography.caption, { color: colors.accent, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.surface }]}>The creator invited you to the LIVE stage. Tap “Join the stage” below to connect your camera and microphone.</Text>}
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
      <View style={{ minHeight: 220, marginHorizontal: 12, borderRadius: 18, overflow: 'hidden', backgroundColor: '#050509', position: 'relative' }}>
        {(() => {
          const videoTileCount = remoteVideoTracks.length + (publisherMode ? 1 : 0);
          return (
            <>
              {!videoTileCount && !audioOnlyParticipants.length && !localAudioOnly && <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: 12 }}>Waiting for the creator's video. It will appear here when their camera is on.</Text>}
              {!videoTileCount && (audioOnlyParticipants.length > 0 || localAudioOnly) && (
                <View style={{ alignItems: 'center', padding: 18 }}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 17 }}>LIVE audio is on</Text>
                  <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 6 }}>The stage is continuing with microphones while cameras are off.</Text>
                </View>
              )}
              {!!videoTileCount && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'stretch', gap: 8, padding: 8 }}>
                  {publisherMode && (
                    <View style={{ width: videoTileCount === 1 ? '100%' : '48%', maxWidth: videoTileCount === 1 ? 560 : 520, minWidth: videoTileCount === 1 ? 0 : 140, aspectRatio: 16 / 9, borderRadius: 16, overflow: 'hidden', backgroundColor: '#050509', borderWidth: 1, borderColor: colors.accent }}>
                      <View ref={localRef} collapsable={false} style={{ width: '100%', height: '100%' }} />
                      {!camera && <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111019' }}><Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Camera off</Text></View>}
                      <View style={{ position: 'absolute', left: 8, bottom: 8, maxWidth: '88%', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.65)' }}>
                        <Text numberOfLines={1} style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>{creatorMode ? 'You · Creator' : 'You · Guest'}</Text>
                      </View>
                    </View>
                  )}
                  {[...remoteVideoTracks].sort((a, b) => Number(b.participant.attributes?.zannychat_spotlight === 'true') - Number(a.participant.attributes?.zannychat_spotlight === 'true')).map((item) => <RemoteVideoTile key={item.track.sid} track={item.track} participant={item.participant} colors={colors} creatorId={stream.creator_id} spotlight={item.participant.attributes?.zannychat_spotlight === 'true'} single={videoTileCount === 1} />)}
                </View>
              )}
              {audioOnlyParticipants.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, padding: 8 }}>
                  {audioOnlyParticipants.map((participant) => <View key={participant.identity} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                    <Text style={{ color: colors.textPrimary, fontSize: 12 }}>{participant.identity === stream.creator_id ? 'HOST' : 'GUEST'} · {participant.name || participant.identity} · Audio only</Text>
                  </View>)}
                </View>
              )}
            </>
          );
        })()}
        <View ref={remoteAudioRef} collapsable={false} style={{ width: 1, height: 1, opacity: 0 }} />
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          {floatingReactions.map((item, index) => (
            <FloatingReaction key={item.id} item={item} index={index} onComplete={removeFloatingReaction} />
          ))}
        </View>
      </View>
      {audioBlocked && <View style={{ padding: 12 }}><Action colors={colors} label="Enable LIVE audio" onPress={() => roomRef.current?.startAudio().then(() => setAudioBlocked(false)).catch((err) => setError(err?.message || 'Audio playback is blocked.'))} /></View>}
      {publisherMode && <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, padding: 12 }}>
        <Action colors={colors} label={camera ? 'Turn camera off' : 'Turn camera on'} onPress={toggleCamera} />
        <Action colors={colors} label={mic ? 'Mute mic' : 'Unmute mic'} onPress={toggleMic} />
      </View>}
      {creatorMode && stream.allow_guests && <View style={{ paddingHorizontal: 12, paddingBottom: 10, flexDirection: 'row', gap: 8 }}>
        <Action colors={colors} label={panel === 'stage' ? 'Close Creator Studio' : 'Creator Studio'} onPress={loadParticipants} />
        <Action colors={colors} label={`Guest requests (${guestRequests.length})`} onPress={() => setPanel(panel === 'guestRequests' ? '' : 'guestRequests')} />
      </View>}
      {creatorMode && replayEnabled && <View style={{ paddingHorizontal: 12, paddingBottom: 10 }}><Action colors={colors} label={replayBusy ? 'Updating replay…' : replay?.status === 'ready' ? 'Watch saved LIVE replay' : replay?.status === 'recording' ? 'Stop LIVE replay' : replay?.status === 'processing' || replay?.status === 'starting' ? 'Preparing replay…' : 'Start LIVE replay'} disabled={replayBusy || ['starting', 'processing'].includes(replay?.status)} onPress={replay?.status === 'ready' ? viewReplay : replay?.status === 'recording' ? stopReplay : confirmStartReplay} /></View>}
      {moderatorMode && <View style={{ paddingHorizontal: 12, paddingBottom: 10 }}><Action colors={colors} label={panel === 'reports' ? 'Close safety reports' : 'Safety reports'} onPress={loadReports} /></View>}
      {panel === 'stage' && creatorMode && <View style={{ margin: 12, padding: 12, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <View>
            <Text style={{ color: colors.textPrimary, fontWeight: '900' }}>Creator Studio</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>Live audience and stage controls</Text>
          </View>
          <View style={{ paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, backgroundColor: colors.surfaceAlt }}>
            <Text style={{ color: colors.accent, fontWeight: '900', fontSize: 10 }}>HOST</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
          <View style={{ flex: 1, minWidth: 0, padding: 10, borderRadius: 12, backgroundColor: colors.surfaceAlt }}>
            <Text style={{ color: colors.textPrimary, fontWeight: '900', fontSize: 20 }}>{participants.filter((item) => item.joined && item.role === 'viewer').length}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Viewers</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0, padding: 10, borderRadius: 12, backgroundColor: colors.surfaceAlt }}>
            <Text style={{ color: colors.textPrimary, fontWeight: '900', fontSize: 20 }}>{participants.filter((item) => item.joined && item.role === 'guest').length}/5</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Guests on stage</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0, padding: 10, borderRadius: 12, backgroundColor: colors.surfaceAlt }}>
            <Text style={{ color: colors.textPrimary, fontWeight: '900', fontSize: 20 }}>{Math.max(0, 5 - participants.filter((item) => item.joined && item.role === 'guest').length)}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Open slots</Text>
          </View>
        </View>
        {participants.map((item) => <View key={item.userId} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text style={{ color: colors.textPrimary, flex: 1, minWidth: 100 }}>{item.name}{item.stage ? ' · On stage' : !item.joined ? ' · offline' : ''}</Text>
          {stream.allow_guests && item.joined && item.role === 'viewer' && <Action colors={colors} label={item.guestInvited ? 'Invited' : 'Invite to stage'} disabled={busy || item.guestInvited} onPress={() => inviteGuest(item.userId)} />}
          {item.stage && <Action colors={colors} label={item.microphoneMuted ? 'Unmute mic' : 'Mute mic'} onPress={() => muteGuest(item.userId, !item.microphoneMuted)} />}
          {item.stage && <Action colors={colors} label={item.spotlighted ? 'Unspotlight' : 'Spotlight'} onPress={() => spotlightGuest(item.userId, !item.spotlighted)} />}
          {item.stage && <Action colors={colors} label="Remove guest" danger onPress={() => removeGuest(item.userId)} />}
        </View>)}
        {!participants.length && <Text style={{ color: colors.textSecondary }}>No connected viewers or guests yet.</Text>}
      </View>}
      {panel === 'guestRequests' && creatorMode && <View style={{ margin: 12, padding: 12, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.accent }}>
        <Text style={{ color: colors.textPrimary, fontWeight: '900', marginBottom: 8 }}>Viewer requests to join your LIVE stage ({guestRequests.length})</Text>
        {guestRequests.map((item) => <View key={item.user_id} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text style={{ color: colors.textPrimary, flex: 1, minWidth: 100 }}>{item.name || 'Viewer'}</Text>
          <Action colors={colors} label="Approve" onPress={() => reviewGuestRequest(item.user_id, 'accepted')} />
          <Action colors={colors} label="Decline" danger onPress={() => reviewGuestRequest(item.user_id, 'declined')} />
        </View>)}
        {!guestRequests.length && <Text style={{ color: colors.textSecondary }}>No pending guest requests.</Text>}
      </View>}
      {panel === 'reports' && <View style={{ margin: 12, padding: 12, borderRadius: 14, backgroundColor: colors.surface }}>
        <Text style={{ color: colors.textPrimary, fontWeight: '900', marginBottom: 8 }}>LIVE safety reports</Text>
        {reports.map((item) => <View key={item.id} style={{ paddingVertical: 7 }}>
          <Text style={{ color: colors.textPrimary }}>{item.reason} · {item.status}</Text>
          {item.status === 'open' && <Action colors={colors} label="Review" onPress={() => reviewReport(item.id, 'reviewing')} />}
          {['open','reviewing'].includes(item.status) && <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            <Action colors={colors} label="Resolve" onPress={() => reviewReport(item.id, 'resolved')} /><Action colors={colors} label="Dismiss" onPress={() => reviewReport(item.id, 'dismissed')} />
          </View>}
        </View>)}
      </View>}
      {!publisherMode && stream.allow_guests && <View style={{ paddingHorizontal: 12, paddingBottom: 10 }}>
        {guestApproved ? <Action colors={colors} label="Join the stage" onPress={joinGuest} /> : <Action colors={colors} label={guestStatus === 'requested' ? 'Guest request pending' : 'Request to join on stage'} disabled={guestStatus === 'requested'} onPress={requestGuest} />}
      </View>}
      <View style={{ paddingHorizontal: 14, paddingTop: 6 }}>
        <Text style={{ color: colors.textPrimary, fontWeight: '900', marginBottom: 8 }}>LIVE chat</Text>
        {comments.map((item) => <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 5, gap: 8 }}>
          <Text style={{ color: colors.accent, fontWeight: '800' }}>{item.user_name || 'ZannyChat user'}</Text>
          <Text style={{ color: colors.textPrimary, flex: 1 }}>{item.body}</Text>
          {moderatorMode && <TouchableOpacity onPress={() => hideComment(item.id)} accessibilityRole="button" accessibilityLabel="Hide comment" style={{ minWidth: 48, minHeight: 48, justifyContent: "center", alignItems: "center" }}><Text style={{ color: colors.danger }}>Hide</Text></TouchableOpacity>}
        </View>)}
        {!comments.length && <Text style={{ color: colors.textSecondary, paddingVertical: 8 }}>Be the first to say hello.</Text>}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9, paddingHorizontal: 12, paddingTop: 6 }}>
        {Object.entries(LIVE_REACTION_EMOJI).map(([reaction, emoji]) => <Action key={reaction} colors={colors} label={emoji} accessibilityLabel={'Send ' + reaction + ' reaction'} onPress={() => react(reaction)} />)}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 }}>
        <TextInput value={draft} onChangeText={(v) => setDraft(v.slice(0, 500))} maxLength={500} placeholder="Say something kind…" placeholderTextColor={colors.textSecondary} accessibilityLabel="LIVE chat message" style={{ flex: 1, color: colors.textPrimary, backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 }} />
        <Action colors={colors} label="Send" disabled={busy || !draft.trim()} onPress={sendComment} />
        {!creatorMode && <Action colors={colors} label="Report" onPress={report} />}
      </View>
    </ScrollView>
    <View style={{ alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: colors.border }}><Action colors={colors} label={creatorMode ? 'End LIVE' : 'Leave LIVE'} danger disabled={busy} onPress={leave} /></View>
    {busy && <View style={{ position: 'absolute', top: '50%', alignSelf: 'center' }}><ActivityIndicator color={colors.textPrimary} /></View>}
  </SafeAreaView>;
}
