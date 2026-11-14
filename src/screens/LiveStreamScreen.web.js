import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Room, RoomEvent, Track } from 'livekit-client';
import { backendFetch } from '../services/backendClient';
import { useTheme } from '../theme/ThemeContext';

const LIVE_REACTION_EMOJI = Object.freeze({ heart: '❤️', clap: '👏', laugh: '😂', wow: '😮', fire: '🔥' });

function FloatingReaction({ item, index, onComplete }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.timing(progress, { toValue: 1, duration: 1800, useNativeDriver: true });
    animation.start(({ finished }) => { if (finished) onComplete(item.id); });
    return () => animation.stop();
  }, [item.id, onComplete, progress]);
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -210] });
  const opacity = progress.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] });
  const scale = progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.65, 1.2, 1] });
  return (
    <Animated.Text style={{ position: 'absolute', bottom: 26, left: (15 + (index * 17) % 70) + '%', opacity, transform: [{ translateY }, { scale }], fontSize: 32 }}>
      {LIVE_REACTION_EMOJI[item.reaction] || LIVE_REACTION_EMOJI.heart}
    </Animated.Text>
  );
}

function RemoteVideoTile({ track, colors }) {
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
    <View style={{ width: '48%', minWidth: 140, minHeight: 190, borderRadius: 16, overflow: 'hidden', backgroundColor: '#050509', borderWidth: 1, borderColor: colors.border }}>
      <View ref={containerRef} collapsable={false} style={{ width: '100%', height: 190 }} />
      <View style={{ position: 'absolute', left: 8, bottom: 8, maxWidth: '88%', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.65)' }}>
        <Text numberOfLines={1} style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>{track.participant.name || track.participant.identity}</Text>
      </View>
    </View>
  );
}

function Action({ colors, label, accessibilityLabel, onPress, disabled = false, danger = false }) {
  const { typography } = useTheme();
  return <TouchableOpacity disabled={disabled} onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel || label} accessibilityState={{ disabled }} style={{ minHeight: 44, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 12, backgroundColor: danger ? colors.danger : colors.surfaceAlt, justifyContent: 'center', alignItems: 'center', opacity: disabled ? 0.5 : 1 }}>
    <Text style={[typography.small, { color: danger ? colors.onDanger : colors.textPrimary }]}>{label}</Text>
  </TouchableOpacity>;
}

export default function LiveStreamScreen({ route, navigation }) {
  const { colors, typography } = useTheme();
  const connection = route.params?.connection;
  const stream = connection?.stream;
  const creatorMode = Boolean(route.params?.creatorMode || connection?.role === 'creator');
  const publisherMode = Boolean(creatorMode || (connection?.role === 'guest' && connection?.canPublish));
  const moderatorMode = Boolean(creatorMode || connection?.canModerate);
  const roomRef = useRef(null);
  const localRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [remoteVideoTracks, setRemoteVideoTracks] = useState([]);
  const endedRef = useRef(false);
  const [status, setStatus] = useState('Connecting…');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [camera, setCamera] = useState(publisherMode);
  const [mic, setMic] = useState(publisherMode);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [comments, setComments] = useState([]);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const seenReactionIds = useRef(new Set());
  const [draft, setDraft] = useState('');
  const [guestStatus, setGuestStatus] = useState('none');
  const [guestApproved, setGuestApproved] = useState(false);
  const [reports, setReports] = useState([]);
  const [panel, setPanel] = useState('');

  useEffect(() => {
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
    const onSubscribed = (track) => {
      if (track.kind === Track.Kind.Video) {
        setRemoteVideoTracks((current) => current.some((item) => item.sid === track.sid) ? current : [...current, track]);
      } else if (track.kind === Track.Kind.Audio) {
        attach(track, remoteAudioRef.current);
      }
    };
    const onUnsubscribed = (track) => {
      if (track.kind === Track.Kind.Video) {
        setRemoteVideoTracks((current) => current.filter((item) => item.sid !== track.sid));
      }
      track.detach();
    };
    const onLocalPublished = (publication) => {
      if (publication.source === Track.Source.Camera && publication.videoTrack && localRef.current) {
        localRef.current.replaceChildren();
        attach(publication.videoTrack, localRef.current);
      }
    };

    room.on(RoomEvent.TrackSubscribed, onSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, onUnsubscribed);
    room.on(RoomEvent.LocalTrackPublished, onLocalPublished);
    room.on(RoomEvent.AudioPlaybackStatusChanged, () => active && setAudioBlocked(!room.canPlaybackAudio));
    room.on(RoomEvent.Disconnected, () => active && setStatus('Disconnected'));
    (async () => {
      try {
        await room.connect(connection.livekitUrl, connection.token);
        if (!active) return;
        if (publisherMode) {
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
      if (!endedRef.current) backendFetch(`/live/${stream.id}/${creatorMode ? 'end' : 'leave'}`, { method: 'POST' }).catch(() => {});
      if (localRef.current) localRef.current.replaceChildren();
      if (remoteAudioRef.current) remoteAudioRef.current.replaceChildren();
      setRemoteVideoTracks([]);
      roomRef.current = null;
    };
  }, [stream?.id, connection?.livekitUrl, connection?.token, creatorMode, publisherMode]);

  const refreshComments = useCallback(async () => {
    if (!stream?.id) return;
    try {
      const result = await backendFetch(`/live/${stream.id}/comments`);
      setComments(Array.isArray(result?.comments) ? result.comments : []);
      const incomingReactions = (Array.isArray(result?.reactions) ? result.reactions : [])
        .filter((item) => item?.id && !seenReactionIds.current.has(item.id));
      incomingReactions.forEach((item) => seenReactionIds.current.add(item.id));
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
    const timer = setInterval(check, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [stream?.id, creatorMode, publisherMode, stream?.allow_guests]);

  const leave = async () => {
    if (!stream?.id || endedRef.current) return;
    endedRef.current = true; setBusy(true);
    try { await backendFetch(`/live/${stream.id}/${creatorMode ? 'end' : 'leave'}`, { method: 'POST' }); }
    catch (err) { setError(err?.message || 'Could not close the LIVE session.'); }
    roomRef.current?.disconnect(); setBusy(false); navigation.goBack();
  };
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
    try { await backendFetch(`/live/${stream.id}/react`, { method: 'POST', body: JSON.stringify({ reaction }) }); }
    catch (err) { setError(err?.message || 'Reaction not sent.'); }
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
      navigation.setParams({ connection: next, creatorMode: false });
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

  if (!stream || !connection) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}><Text style={[typography.body, { color: colors.textPrimary }]}>This LIVE room is unavailable.</Text><Action colors={colors} label="Go back" onPress={() => navigation.goBack()} /></SafeAreaView>;

  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 }}>
      <Text style={[typography.small, { color: colors.danger }]}>● LIVE</Text>
      <Text numberOfLines={1} style={[typography.heading, { color: colors.textPrimary, flex: 1, minWidth: 0 }]}>{stream.title}</Text>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{status}</Text>
    </View>
    {!!error && <Text accessibilityRole="alert" style={[typography.caption, { color: colors.danger, paddingHorizontal: 14, paddingBottom: 8 }]}>{error}</Text>}
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
      <View style={{ minHeight: 220, marginHorizontal: 12, borderRadius: 18, overflow: 'hidden', backgroundColor: '#050509', position: 'relative' }}>
        {publisherMode && <View ref={localRef} collapsable={false} style={{ width: '100%', minHeight: 220 }} />}
        {!remoteVideoTracks.length && !publisherMode && <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: 12 }}>If the creator is not on screen yet, their video will appear here.</Text>}
        {!!remoteVideoTracks.length && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'stretch', gap: 8, padding: 8 }}>
            {remoteVideoTracks.map((track) => <RemoteVideoTile key={track.sid} track={track} colors={colors} />)}
          </View>
        )}
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
      {moderatorMode && <View style={{ paddingHorizontal: 12, paddingBottom: 10 }}><Action colors={colors} label={panel === 'reports' ? 'Close safety reports' : 'Safety reports'} onPress={loadReports} /></View>}
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
          {moderatorMode && <TouchableOpacity onPress={() => hideComment(item.id)} accessibilityRole="button" accessibilityLabel="Hide comment" style={{ minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "center" }}><Text style={{ color: colors.danger }}>Hide</Text></TouchableOpacity>}
        </View>)}
        {!comments.length && <Text style={{ color: colors.textSecondary, paddingVertical: 8 }}>Be the first to say hello.</Text>}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 }}>
        <TextInput value={draft} onChangeText={(v) => setDraft(v.slice(0, 500))} maxLength={500} placeholder="Say something kind…" placeholderTextColor={colors.textSecondary} accessibilityLabel="LIVE chat message" style={{ flex: 1, color: colors.textPrimary, backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 }} />
        <Action colors={colors} label="Send" disabled={busy || !draft.trim()} onPress={sendComment} />{Object.entries(LIVE_REACTION_EMOJI).map(([reaction, emoji]) => <Action key={reaction} colors={colors} label={emoji} accessibilityLabel={'Send ' + reaction + ' reaction'} onPress={() => react(reaction)} />)}
        {!creatorMode && <Action colors={colors} label="Report" onPress={report} />}
      </View>
    </ScrollView>
    <View style={{ alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: colors.border }}><Action colors={colors} label={creatorMode ? 'End LIVE' : 'Leave LIVE'} danger disabled={busy} onPress={leave} /></View>
    {busy && <View style={{ position: 'absolute', top: '50%', alignSelf: 'center' }}><ActivityIndicator color={colors.textPrimary} /></View>}
  </SafeAreaView>;
}
