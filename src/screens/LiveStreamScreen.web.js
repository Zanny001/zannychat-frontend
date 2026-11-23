import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, PanResponder, Share, ScrollView, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { Ionicons } from '@expo/vector-icons';
import { backendFetch } from '../services/backendClient';
import { hexToRgba } from '../utils/color';
import { getCurrentUser } from '../services/api';
import { supabase, SUPABASE_ENABLED } from '../services/supabaseClient';
import { useTheme } from '../theme/ThemeContext';
import LiveCategoryBackdrop from '../components/LiveCategoryBackdrop';
import { formatLiveBroadcastTimeRemaining, getLiveBroadcastTimeRemaining, LIVE_BROADCAST_WARNING_MS } from '../utils/liveBroadcastTimeout';
import { getActiveCreatorStreamId, hasLiveConnectionCredentials } from '../utils/liveCreatorRecovery';
import { getLiveStageTileFrame } from '../utils/liveStageLayout';

const LIVE_REACTION_EMOJI = Object.freeze({ heart: '❤️', clap: '👏', laugh: '😂', wow: '😮', fire: '🔥', idea: '💡', support: '🙌' });
const isDocumentVisible = () => typeof document === 'undefined' || document.visibilityState !== 'hidden';

function isLiveFeedInvalidation(payload, topic) {
  if (topic !== 'zanny.live.feed.v1' || !payload || payload.length > 512) return false;
  try {
    const event = JSON.parse(String.fromCharCode(...Array.from(payload)));
    return event?.v === 1 && event?.type === 'feed_changed';
  } catch (_) {
    return false;
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

function FloatingLocalVideoTile({ containerRef, colors, role }) {
  const viewport = Dimensions.get('window');
  const bounds = { width: Math.max(180, viewport.width - 28), height: Math.max(220, viewport.height - 238) };
  const [frame, setFrame] = useState(() => ({ x: Math.min(12, Math.max(0, bounds.width - 156)), y: Math.min(Math.max(0, bounds.height - 208), 150), width: 156, height: 208 }));
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const dragOrigin = useRef(frame);
  const resizeOrigin = useRef(frame);
  const drag = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
    onPanResponderGrant: () => { dragOrigin.current = frameRef.current; },
    onPanResponderMove: (_event, gesture) => { const origin = dragOrigin.current; setFrame((current) => ({ ...current, x: Math.max(0, Math.min(bounds.width - current.width, origin.x + gesture.dx)), y: Math.max(0, Math.min(bounds.height - current.height, origin.y + gesture.dy)) })); },
  })).current;
  const resize = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { resizeOrigin.current = frameRef.current; },
    onPanResponderMove: (_event, gesture) => { const origin = resizeOrigin.current; setFrame((current) => ({ ...current, width: Math.max(116, Math.min(360, Math.min(bounds.width - current.x, origin.width + gesture.dx))), height: Math.max(154, Math.min(480, Math.min(bounds.height - current.y, origin.height + gesture.dy))) })); },
  })).current;
  return <View {...drag.panHandlers} style={{ position: 'absolute', left: frame.x, top: frame.y, width: frame.width, height: frame.height, borderRadius: 17, overflow: 'hidden', backgroundColor: '#090914', borderWidth: 1.5, borderColor: colors.accent, zIndex: 5, boxShadow: '0 12px 30px rgba(0,0,0,0.42)' }}>
    <View ref={containerRef} collapsable={false} style={{ width: '100%', height: '100%' }} />
    <View pointerEvents="none" style={{ position: 'absolute', left: 7, right: 7, bottom: 7, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.76)' }}><Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '900' }}>YOU · {role} · DRAG TO MOVE</Text></View>
    <View {...resize.panHandlers} accessibilityRole="adjustable" accessibilityLabel="Resize your LIVE video frame" style={{ position: 'absolute', right: 0, top: 0, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderBottomLeftRadius: 12, backgroundColor: 'rgba(0,0,0,0.78)' }}><Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '900' }}>↘</Text></View>
  </View>;
}
function RemoteVideoTile({ track, participant, colors, creatorId, spotlight = false, single = false, mainStage = false, floating = false, focused = false, onFocus, floatingIndex = 0, floatingCount = 1 }) {
  const containerRef = useRef(null);
  const viewport = useWindowDimensions();
  const bounds = { width: Math.max(180, viewport.width - 28), height: Math.max(220, viewport.height - 238) };
  const [frame, setFrame] = useState(() => getLiveStageTileFrame({ index: floatingIndex, count: floatingCount, width: bounds.width, height: bounds.height }));
  const frameRef = useRef(frame); frameRef.current = frame;
  const boundsRef = useRef(bounds); boundsRef.current = bounds;
  useEffect(() => {
    if (floating) setFrame(getLiveStageTileFrame({ index: floatingIndex, count: floatingCount, width: bounds.width, height: bounds.height }));
  }, [bounds.width, bounds.height, floating, floatingIndex, floatingCount]);
  const gestureOrigin = useRef(frame); const resizeOrigin = useRef(frame);
  const dragResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_event, gesture) => floating && (Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4),
    onPanResponderGrant: () => { gestureOrigin.current = frameRef.current; },
    onPanResponderMove: (_event, gesture) => { const origin = gestureOrigin.current; setFrame((current) => ({ ...current, x: Math.max(0, Math.min(boundsRef.current.width - current.width, origin.x + gesture.dx)), y: Math.max(0, Math.min(boundsRef.current.height - current.height, origin.y + gesture.dy)) })); },
  })).current;
  const resizeResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => floating,
    onMoveShouldSetPanResponder: () => floating,
    onPanResponderGrant: () => { resizeOrigin.current = frameRef.current; },
    onPanResponderMove: (_event, gesture) => { const origin = resizeOrigin.current; setFrame((current) => ({ ...current, width: Math.max(116, Math.min(360, Math.min(boundsRef.current.width - current.x, origin.width + gesture.dx))), height: Math.max(154, Math.min(480, Math.min(boundsRef.current.height - current.y, origin.height + gesture.dy))) })); },
  })).current;
  useEffect(() => {
    const element = track.attach(); element.autoplay = true; element.playsInline = true; element.style.width = '100%'; element.style.height = '100%'; element.style.objectFit = 'cover';
    containerRef.current?.replaceChildren(element);
    return () => { track.detach(element); containerRef.current?.replaceChildren(); };
  }, [track]);
  return <TouchableOpacity activeOpacity={0.9} onPress={onFocus} accessibilityRole="button" accessibilityLabel={(floating ? 'Move or focus ' : 'Focus ') + (participant.name || participant.identity) + ' video tile'} {...(floating ? dragResponder.panHandlers : {})} style={{
    position: mainStage || floating ? 'absolute' : 'relative', top: mainStage ? 0 : floating ? frame.y : undefined, right: mainStage ? 0 : undefined, bottom: mainStage ? 0 : undefined, left: mainStage ? 0 : floating ? frame.x : undefined,
    width: mainStage ? '100%' : floating ? frame.width : spotlight || single ? '100%' : '48%', height: mainStage ? '100%' : floating ? frame.height : undefined, maxWidth: mainStage ? '100%' : floating ? 360 : spotlight || single ? 560 : 520, minWidth: mainStage || floating ? 0 : spotlight || single ? 0 : 140, aspectRatio: mainStage || floating ? undefined : 16 / 9,
    borderRadius: mainStage ? 0 : floating ? 17 : 16, overflow: 'hidden', backgroundColor: '#050509', borderWidth: mainStage ? 0 : focused || spotlight ? 2 : 1, borderColor: focused || spotlight ? colors.accent : colors.border, zIndex: mainStage ? 0 : floating ? 4 : 1, boxShadow: floating ? '0 12px 30px rgba(0,0,0,0.42)' : undefined,
  }}>
    <View ref={containerRef} collapsable={false} style={{ width: '100%', height: '100%' }} />
    {spotlight && !mainStage && <View pointerEvents="none" style={{ position: 'absolute', top: 8, left: 8, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9, backgroundColor: colors.accent }}><Text style={{ color: colors.onAccent, fontWeight: '900', fontSize: 10 }}>SPOTLIGHT</Text></View>}
    <View pointerEvents="none" style={{ position: 'absolute', top: 8, right: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.72)' }}><Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '900' }}>{participant.identity === creatorId ? 'HOST' : 'GUEST'}</Text></View>
    <View pointerEvents="none" style={{ position: 'absolute', left: 8, bottom: 8, maxWidth: '88%', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.72)' }}><Text numberOfLines={1} style={{ color: '#FFFFFF', fontSize: floating ? 11 : 12, fontWeight: '700' }}>{participant.name || participant.identity}</Text></View>
    {floating && <View {...resizeResponder.panHandlers} accessibilityRole="adjustable" accessibilityLabel={'Resize ' + (participant.name || participant.identity) + ' video tile'} style={{ position: 'absolute', right: 0, bottom: 0, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderTopLeftRadius: 12, backgroundColor: 'rgba(0,0,0,0.76)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.38)' }}><Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '900' }}>↘</Text></View>}
  </TouchableOpacity>;
}
function Action({ colors, label, accessibilityLabel, onPress, disabled = false, danger = false }) {
  const { typography } = useTheme();
  return <TouchableOpacity disabled={disabled} onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel || label} accessibilityState={{ disabled }} style={{ minHeight: 48, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 12, backgroundColor: danger ? colors.danger : colors.surfaceAlt, justifyContent: 'center', alignItems: 'center', opacity: disabled ? 0.5 : 1 }}>
    <Text style={[typography.small, { color: danger ? colors.onDanger : colors.textPrimary }]}>{label}</Text>
  </TouchableOpacity>;
}

export default function LiveStreamScreen({ route, navigation }) {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: roomViewportWidth } = useWindowDimensions();
  const compactRoomHeader = roomViewportWidth < 390;
  const initialConnection = route.params?.connection && typeof route.params.connection === 'object' && !Array.isArray(route.params.connection)
    ? route.params.connection
    : null;
  const requestedStreamId = typeof route.params?.streamId === 'string'
    ? route.params.streamId
    : typeof initialConnection?.stream?.id === 'string' ? initialConnection.stream.id : null;
  const [recoveredStreamId, setRecoveredStreamId] = useState(null);
  const streamId = requestedStreamId || recoveredStreamId;
  const [connection, setConnection] = useState(initialConnection);
  const [connectionLoading, setConnectionLoading] = useState(!hasLiveConnectionCredentials(initialConnection));
  const [connectionRetry, setConnectionRetry] = useState(0);
  const stream = connection?.stream;
  const creatorMode = connection?.role === 'creator';
  const [timeoutClock, setTimeoutClock] = useState(Date.now());
  useEffect(() => {
    if (!creatorMode || !stream?.started_at) return undefined;
    const interval = setInterval(() => setTimeoutClock(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [creatorMode, stream?.id, stream?.started_at]);
  const timeoutRemainingMs = creatorMode ? getLiveBroadcastTimeRemaining(stream?.started_at, timeoutClock) : null;
  const timeoutLabel = timeoutRemainingMs === null ? '' : timeoutRemainingMs === 0 ? '00:00:00' : formatLiveBroadcastTimeRemaining(timeoutRemainingMs);
  const timeoutWarning = timeoutRemainingMs !== null && timeoutRemainingMs <= LIVE_BROADCAST_WARNING_MS;
  const experienceMode = stream?.experience_mode || 'broadcast';
  const category = stream?.category || 'social';
  const [demotedToViewer, setDemotedToViewer] = useState(false);
  const [stageNotice, setStageNotice] = useState('');
  const publisherMode = Boolean(creatorMode || (connection?.role === 'guest' && connection?.canPublish && !demotedToViewer));
  const mediaVideoEnabled = Boolean(publisherMode && experienceMode !== 'audio_room' && connection?.mediaMode !== 'audio');
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
  const liveAuthOwnerRef = useRef(undefined);
  const connectionRequestRef = useRef(0);
  const [status, setStatus] = useState('Connecting…');
  useEffect(() => {
    setDemotedToViewer(false);
    setStageNotice('');
    setCamera(mediaVideoEnabled);
    setMic(publisherMode);
  }, [connection?.token, mediaVideoEnabled, publisherMode]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [replayEnabled, setReplayEnabled] = useState(false);
  const [replayAvailability, setReplayAvailability] = useState('checking');
  const [replay, setReplay] = useState(null);
  const [replayBusy, setReplayBusy] = useState(false);
  const [camera, setCamera] = useState(mediaVideoEnabled);
  const [mic, setMic] = useState(publisherMode);
  const localAudioOnly = publisherMode && mic && !camera;
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [comments, setComments] = useState([]);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const seenReactionIds = useRef(new Set());
  const commentsRefreshInFlight = useRef(false);
  const commentsRefreshQueued = useRef(false);
  const guestStatusRefreshInFlight = useRef(false);
  const guestDecisionInFlight = useRef(false);
  const guestRequestsRefreshInFlight = useRef(false);
  const replayRefreshInFlight = useRef(false);
  const studioParticipantsRefreshInFlight = useRef(false);
  const [draft, setDraft] = useState('');
  const [guestStatus, setGuestStatus] = useState('none');
  const [guestApproved, setGuestApproved] = useState(false);
  const [guestRequests, setGuestRequests] = useState([]);
  const seenGuestRequestIds = useRef(new Set());
  const [reports, setReports] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [panel, setPanel] = useState('');
  const [showOverlayMenu, setShowOverlayMenu] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(true);
  const [focusedStageIdentity, setFocusedStageIdentity] = useState('');

  useEffect(() => {
    if (!SUPABASE_ENABLED || !supabase?.auth?.onAuthStateChange) return undefined;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user?.id || null;
      if (liveAuthOwnerRef.current === undefined) {
        liveAuthOwnerRef.current = nextUserId;
        return;
      }
      if (liveAuthOwnerRef.current === nextUserId) return;
      liveAuthOwnerRef.current = nextUserId;
      connectionRequestRef.current += 1;
      endedRef.current = true;
      roomRef.current?.disconnect();
      setConnection(null);
      setConnectionLoading(false);
      setCamera(false);
      setMic(false);
      setDemotedToViewer(false);
      setStageNotice('');
      setBusy(false);
      setDraft('');
      setReplayEnabled(false);
      setReplay(null);
      setReplayBusy(false);
      setComments([]);
      setReports([]);
      setParticipants([]);
      setGuestRequests([]);
      setFloatingReactions([]);
      setRemoteVideoTracks([]);
      setRemoteAudioParticipants([]);
      seenGuestRequestIds.current.clear();
      seenReactionIds.current.clear();
      setGuestApproved(false);
      setGuestStatus('none');
      setPanel('');
      setAudioBlocked(false);
      setStatus('Disconnected');
      setError('Your account changed. You left this LIVE. Reopen it from LIVE Hub.');
      if (navigation?.canGoBack?.()) navigation.goBack();
    });
    return () => data?.subscription?.unsubscribe?.();
  }, [navigation]);

  const refreshReplay = useCallback(async () => {
    if (!stream?.id || !creatorMode || !replayEnabled || !isDocumentVisible() || replayRefreshInFlight.current) return;
    replayRefreshInFlight.current = true;
    try {
      const result = await backendFetch(`/live/${stream.id}/replays`);
      const rows = Array.isArray(result?.replays) ? result.replays : [];
      setReplay(rows.find((item) => ['starting', 'recording', 'processing', 'ready', 'failed'].includes(item.status)) || null);
    } catch (_) {
      // Keep the last known replay state during transient network failures.
    } finally {
      replayRefreshInFlight.current = false;
    }
  }, [stream?.id, creatorMode, replayEnabled]);

  useEffect(() => {
    if (!creatorMode) {
      setReplayEnabled(false);
      setReplayAvailability('hidden');
      return undefined;
    }
    let active = true;
    setReplayAvailability('checking');
    backendFetch('/live/replays/config')
      .then((result) => { if (active) { const enabled = Boolean(result?.enabled); setReplayEnabled(enabled); setReplayAvailability(enabled ? 'enabled' : 'disabled'); } })
      .catch(() => { if (active) { setReplayEnabled(false); setReplayAvailability('unavailable'); } });
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
    let active = true;
    const requestId = ++connectionRequestRef.current;
    if (!streamId) {
      let recoveredActiveStream = false;
      setConnection(null);
      setConnectionLoading(true);
      setError('');
      setStatus('Recovering your LIVE broadcast…');
      backendFetch('/live/creators/me/profile')
        .then((profile) => {
          const activeId = getActiveCreatorStreamId(profile);
          if (!activeId) throw new Error('No active LIVE broadcast was found on your creator account.');
          if (active && requestId === connectionRequestRef.current) {
            recoveredActiveStream = true;
            setRecoveredStreamId(activeId);
          }
        })
        .catch((recoveryError) => {
          if (active && requestId === connectionRequestRef.current) {
            setError(recoveryError?.message || 'Could not recover your active LIVE broadcast. Return to LIVE Hub and try again.');
            setStatus('Unable to connect');
          }
        })
        .finally(() => {
          if (active && requestId === connectionRequestRef.current && !recoveredActiveStream) setConnectionLoading(false);
        });
      return () => {
        active = false;
        if (connectionRequestRef.current === requestId) connectionRequestRef.current += 1;
      };
    }
    if (initialConnection?.stream?.id === streamId && initialConnection?.token && initialConnection?.livekitUrl) {
      setConnectionLoading(false);
      return undefined;
    }
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
        if (active && requestId === connectionRequestRef.current) {
          setError(joinError?.message || 'Could not join this LIVE stream.');
          setStatus('Unable to connect');
        }
      })
      .finally(() => {
        if (active && requestId === connectionRequestRef.current) setConnectionLoading(false);
      });
    return () => {
      active = false;
      if (connectionRequestRef.current === requestId) connectionRequestRef.current += 1;
    };
  }, [streamId, connectionRetry]);

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
          setStatus(experienceMode === 'audio_room' ? 'Joining audio room…' : 'Starting camera and microphone…');
          if (experienceMode === 'audio_room') {
            await room.localParticipant.setMicrophoneEnabled(true);
            if (!active) return;
            setCamera(false); setMic(true);
          } else {
            await room.localParticipant.enableCameraAndMicrophone();
            if (!active) return;
            setCamera(true); setMic(true);
            const video = room.localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack;
            if (video && localRef.current) attach(video, localRef.current);
          }
          setStatus(experienceMode === 'audio_room' ? 'You are in the audio room' : 'You are LIVE');
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
  }, [stream?.id, connection?.livekitUrl, connection?.token, creatorMode, connectionLoading, experienceMode]);

  useEffect(() => {
    if (!stream?.id) return undefined;
    let active = true;
    const room = roomRef.current;
    const heartbeat = () => {
      if (!active || !isDocumentVisible() || roomRef.current?.state !== 'connected') return;
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

  const returnFromLive = useCallback(() => {
    if (route.params?.returnToCreatorProfile && navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    // replace also handles direct/deep-linked LIVE entry with no prior route.
    navigation.replace('Main', { screen: 'LIVE' });
  }, [navigation, route.params?.returnToCreatorProfile]);

  const exitEndedStream = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    roomRef.current?.disconnect();
    setBusy(false);
    setStatus('LIVE ended');
    returnFromLive();
  }, [returnFromLive]);

  const refreshComments = useCallback(async () => {
    if (endedRef.current || !stream?.id || !isDocumentVisible()) return;
    if (commentsRefreshInFlight.current) { commentsRefreshQueued.current = true; return; }
    commentsRefreshInFlight.current = true;
    try {
      const result = await backendFetch(`/live/${stream.id}/comments`);
      if (endedRef.current) return;
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
    } catch (err) {
      if (!endedRef.current && ['LIVE stream has ended', 'LIVE stream not found'].includes(err?.message)) {
        exitEndedStream();
      } else if (!endedRef.current) {
        setError((current) => current || err?.message || 'Comments unavailable.');
      }
    } finally {
      commentsRefreshInFlight.current = false;
      if (commentsRefreshQueued.current) {
        commentsRefreshQueued.current = false;
        if (!endedRef.current) void refreshComments();
      }
    }
  }, [stream?.id, exitEndedStream]);


  useEffect(() => {
    // The LiveKit Room is created by the connection effect above and stored
    // in roomRef. Read it here instead of referencing an out-of-scope
    // `room` variable during render (which crashes the entire web app).
    const room = roomRef.current;
    if (!room || !stream?.id) return undefined;
    const onDataReceived = (payload, _participant, _kind, topic) => {
      if (isLiveFeedInvalidation(payload, topic)) refreshComments();
    };
    room.on(RoomEvent.DataReceived, onDataReceived);
    room.on(RoomEvent.Reconnected, refreshComments);
    return () => {
      room.off(RoomEvent.DataReceived, onDataReceived);
      room.off(RoomEvent.Reconnected, refreshComments);
    };
  }, [stream?.id, connection?.token, refreshComments]);

  useEffect(() => {
    if (!stream?.id) return undefined;
    refreshComments();
    const timer = setInterval(refreshComments, 30_000);
    return () => clearInterval(timer);
  }, [stream?.id, refreshComments]);

  useEffect(() => {
    if (!stream?.id || creatorMode || publisherMode || !stream.allow_guests) return undefined;
    let active = true;
    const check = async () => {
      if (!active || endedRef.current || !isDocumentVisible() || guestStatusRefreshInFlight.current) return;
      guestStatusRefreshInFlight.current = true;
      try {
        const result = await backendFetch(`/live/${stream.id}/guest-status`);
        if (active && !endedRef.current) { setGuestStatus(result?.status || 'none'); setGuestApproved(result?.status === 'accepted'); }
      } catch (_) {
        // Preserve the last known guest approval state during transient failures.
      } finally {
        guestStatusRefreshInFlight.current = false;
      }
    };
    check();
    const timer = setInterval(check, 6000);
    return () => { active = false; clearInterval(timer); };
  }, [stream?.id, creatorMode, publisherMode, stream?.allow_guests]);

  useEffect(() => {
    if (!navigation?.addListener || !stream?.id) return undefined;
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (endedRef.current) return;
      event.preventDefault();
      if (creatorMode) {
        const confirmed = typeof window !== 'undefined'
          && window.confirm('End LIVE broadcast? Leaving the creator room will end the broadcast for everyone.');
        if (confirmed) leaveRef.current?.();
        return;
      }
      leaveRef.current?.();
    });
    return unsubscribe;
  }, [navigation, stream?.id, creatorMode]);

  useEffect(() => {
    if (!creatorMode || !stream?.id || !stream.allow_guests) return undefined;
    let active = true;
    const refreshGuestRequests = async () => {
      if (!active || endedRef.current || !isDocumentVisible() || guestRequestsRefreshInFlight.current) return;
      guestRequestsRefreshInFlight.current = true;
      try {
        const result = await backendFetch(`/live/${stream.id}/guest-requests`);
        if (!active || endedRef.current) return;
        const incoming = Array.isArray(result?.requests) ? result.requests : [];
        const incomingIds = new Set(incoming.map((item) => item.user_id));
        seenGuestRequestIds.current.forEach((userId) => {
          if (!incomingIds.has(userId)) seenGuestRequestIds.current.delete(userId);
        });
        const hasNewRequest = incoming.some((item) => !seenGuestRequestIds.current.has(item.user_id));
        incoming.forEach((item) => seenGuestRequestIds.current.add(item.user_id));
        setGuestRequests(incoming);
        if (hasNewRequest) setPanel('guestRequests');
      } catch (_) {
        // Keep existing guest requests visible while the network recovers.
      } finally {
        guestRequestsRefreshInFlight.current = false;
      }
    };
    refreshGuestRequests();
    const timer = setInterval(refreshGuestRequests, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [creatorMode, stream?.id, stream?.allow_guests]);

  const leave = async () => {
    if (!stream?.id || endedRef.current || busy) return;
    endedRef.current = true;
    setBusy(true);
    let endConfirmed = false;
    try {
      await backendFetch('/live/' + stream.id + '/' + (creatorMode ? 'end' : 'leave'), { method: 'POST' });
      endConfirmed = true;
      roomRef.current?.disconnect();
      if (!creatorMode) {
        setBusy(false);
        returnFromLive();
        return;
      }

      const ownerId = stream.creator_id || null;
      const currentUser = await getCurrentUser().catch(() => null);
      if (!ownerId || currentUser?.id !== ownerId) {
        setBusy(false);
        returnFromLive();
        return;
      }

      const [profileResult, replayResult] = await Promise.allSettled([
        backendFetch('/live/creators/me/profile'),
        backendFetch('/live/' + stream.id + '/replays'),
      ]);
      const confirmedUser = await getCurrentUser().catch(() => null);
      if (confirmedUser?.id !== ownerId) {
        setBusy(false);
        returnFromLive();
        return;
      }

      const profileSummary = profileResult.status === 'fulfilled' ? profileResult.value : null;
      const endedStream = Array.isArray(profileSummary?.streams?.recent)
        ? profileSummary.streams.recent.find((item) => item.id === stream.id)
        : null;
      const replaySummary = replayResult.status === 'fulfilled' ? replayResult.value : null;
      const finalReplay = Array.isArray(replaySummary?.replays) ? replaySummary.replays[0] : null;
      setBusy(false);
      navigation.replace('LivePostStreamSummary', {
        streamId: stream.id,
        creatorId: ownerId,
        title: endedStream?.title || stream.title || 'Your LIVE broadcast',
        startedAt: endedStream?.started_at || stream.started_at || null,
        endedAt: endedStream?.ended_at || new Date().toISOString(),
        replayStatus: finalReplay?.status || replay?.status || null,
        replayId: finalReplay?.id || replay?.id || null,
        replayEnabled: Boolean(replayEnabled || finalReplay || replay),
      });
    } catch (err) {
      if (endConfirmed) {
        roomRef.current?.disconnect();
        setBusy(false);
        returnFromLive();
        return;
      }
      endedRef.current = false;
      setBusy(false);
      setError(err?.message || (creatorMode ? 'Could not end the LIVE session.' : 'Could not leave the LIVE session.'));
    }
  };
  const confirmEnd = () => {
    if (!creatorMode || endedRef.current || busy) return;
    const confirmed = typeof window !== 'undefined' && window.confirm('End LIVE broadcast? This will stop the broadcast for everyone.');
    if (confirmed) leaveRef.current?.();
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
  const shareLiveStream = async () => {
    if (!stream?.id) return;
    const url = `https://zannychat.vercel.app/LiveStream?streamId=${encodeURIComponent(stream.id)}`;
    try {
      await Share.share({ title: stream.title || 'ZannyChat LIVE', message: `Join my LIVE on ZannyChat: ${url}`, url });
    } catch (err) {
      setError(err?.message || 'Could not share this LIVE stream.');
    }
  };

  const requestGuest = async () => {
    try { await backendFetch(`/live/${stream.id}/guest-requests`, { method: 'POST' }); setGuestStatus('requested'); }
    catch (err) { setError(err?.message || 'Could not request guest access.'); }
  };
  const joinGuest = async (mediaMode = 'video') => {
    try {
      const next = await backendFetch(`/live/${stream.id}/join`, {
        method: 'POST',
        body: JSON.stringify({ mediaMode }),
      });
      if (next?.role !== 'guest' || !next?.canPublish) throw new Error('Guest access has not been approved.');
      setDemotedToViewer(false);
      setStageNotice('');
      setConnection(next);
    } catch (err) { setError(err?.message || 'Could not join as guest.'); }
  };

  const decideGuestInvitation = async (status, mediaMode = 'video') => {
    if (!stream?.id || guestDecisionInFlight.current || !['accepted', 'declined'].includes(status)) return;
    guestDecisionInFlight.current = true;
    try {
      const result = await backendFetch(`/live/${stream.id}/guest-invitation`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setGuestStatus(result?.status || status);
      setGuestApproved(status === 'accepted');
      if (status === 'accepted') await joinGuest(mediaMode);
    } catch (err) {
      setError(err?.message || (status === 'accepted' ? 'Could not accept LIVE invitation.' : 'Could not decline LIVE invitation.'));
    } finally {
      guestDecisionInFlight.current = false;
    }
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

  const setModerator = async (userId, makeModerator) => {
    try {
      await backendFetch(`/live/${stream.id}/moderators${makeModerator ? '' : `/${userId}`}`, {
        method: makeModerator ? 'POST' : 'DELETE',
        ...(makeModerator ? { body: JSON.stringify({ userId }) } : {}),
      });
      setParticipants((current) => current.flatMap((item) => item.userId === userId
        ? (makeModerator || item.joined ? [{ ...item, moderator: makeModerator }] : [])
        : [item]));
    } catch (err) { setError(err?.message || 'Could not update LIVE moderator.'); }
  };

  useEffect(() => {
    if (!creatorMode || panel !== 'stage' || !stream?.id) return undefined;
    let active = true;
    const refreshStudioParticipants = () => {
      if (!active || !isDocumentVisible() || studioParticipantsRefreshInFlight.current) return;
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
    const interval = setInterval(refreshStudioParticipants, 5_000);
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
  const removeParticipant = async (userId) => {
    const participant = participants.find((item) => item.userId === userId);
    const displayName = participant?.name || 'this participant';
    if (typeof window !== 'undefined' && !window.confirm('Remove ' + displayName + ' from this LIVE stream? They will be disconnected and blocked from rejoining this stream.')) return;
    try {
      await backendFetch(`/live/${stream.id}/participants/${userId}`, { method: 'DELETE' });
      setParticipants((items) => items.filter((item) => item.userId !== userId));
    } catch (err) {
      setError(err?.message || 'Could not remove participant from LIVE.');
    }
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

  if (!stream || !connection) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 28, gap: 14 }}>
    {connectionLoading ? <ActivityIndicator size="large" color={colors.accent} /> : null}
    <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '800', textAlign: 'center' }}>{connectionLoading ? (requestedStreamId ? 'Connecting to LIVE…' : 'Recovering your LIVE broadcast…') : error || 'This LIVE room is unavailable.'}</Text>
    {!connectionLoading ? <Action colors={colors} label="Try again" onPress={() => setConnectionRetry((value) => value + 1)} /> : null}
    <Action colors={colors} label="Go back" onPress={() => navigation.goBack()} />
  </SafeAreaView>;

  const orderedRemoteTracks = [...remoteVideoTracks].sort((a, b) =>
    Number(b.participant.attributes?.zannychat_spotlight === 'true') - Number(a.participant.attributes?.zannychat_spotlight === 'true')
  );
  const mainRemoteTrack = publisherMode || experienceMode === 'video_chat' ? null : (
    orderedRemoteTracks.find((item) => item.participant.identity === focusedStageIdentity)
    || orderedRemoteTracks.find((item) => item.participant.attributes?.zannychat_spotlight === 'true')
    || orderedRemoteTracks.find((item) => item.participant.identity === stream.creator_id)
    || orderedRemoteTracks[0]
    || null
  );
  const floatingRemoteTracks = experienceMode === 'video_chat' ? orderedRemoteTracks : orderedRemoteTracks.filter((item) => item.track.sid !== mainRemoteTrack?.track.sid);

  return <View style={{ flex: 1, minHeight: '100%', backgroundColor: '#05050B', position: 'relative', overflow: 'hidden' }}>
    <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#05050B' }}>
      {publisherMode && experienceMode !== 'audio_room' && connection?.mediaMode !== 'audio' ? (
        experienceMode === 'video_chat' ? <><LiveCategoryBackdrop category={category} title={stream.title} mode={experienceMode} /><FloatingLocalVideoTile containerRef={localRef} colors={colors} role={creatorMode ? 'HOST' : 'GUEST'} /></> : <>
          <View ref={localRef} collapsable={false} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#090914' }} />
          {!camera && <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111019' }}><Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 18 }}>Camera off</Text><Text style={{ color: 'rgba(255,255,255,0.68)', marginTop: 6 }}>Your voice is still live</Text></View>}
          <View style={{ position: 'absolute', left: 22, bottom: 112, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(5,5,11,0.66)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}><Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>{creatorMode ? 'YOU · HOST' : 'YOU · GUEST'}</Text></View>
        </>
      ) : mainRemoteTrack ? (
        <RemoteVideoTile
          key={mainRemoteTrack.track.sid}
          track={mainRemoteTrack.track}
          participant={mainRemoteTrack.participant}
          colors={colors}
          creatorId={stream.creator_id}
          spotlight={mainRemoteTrack.participant.attributes?.zannychat_spotlight === 'true'}
          mainStage
          focused
          onFocus={() => setFocusedStageIdentity(mainRemoteTrack.participant.identity)}
        />
      ) : (
        <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#0B0A16' }}>
          {experienceMode !== 'broadcast' && <LiveCategoryBackdrop category={category} title={stream.title} mode={experienceMode} />}
          <View style={{ width: 84, height: 84, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderWidth: 1, borderColor: hexToRgba(colors.onPrimary, 0.28) }}><Ionicons name={experienceMode === 'audio_room' ? 'people' : 'sparkles'} size={34} color={colors.onPrimary} /></View>
          <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '900', marginTop: 16 }}>{experienceMode === 'audio_room' ? 'The audio conversation is open' : experienceMode === 'video_chat' ? 'The themed video stage is open' : audioOnlyParticipants.length || localAudioOnly ? 'LIVE audio is on' : 'The stage is warming up'}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.66)', textAlign: 'center', marginTop: 7, maxWidth: 340, lineHeight: 21 }}>{experienceMode === 'audio_room' ? 'Take a seat and join the conversation.' : experienceMode === 'video_chat' ? 'Creator and guest video frames float above the category theme.' : audioOnlyParticipants.length || localAudioOnly ? 'The conversation continues while cameras are off.' : "Waiting for the creator's video. It will appear here when their camera is on."}</Text>
          {experienceMode === 'audio_room' && <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 9, marginTop: 16, maxWidth: 350 }}>
            {localAudioOnly && <View style={{ minWidth: 112, alignItems: 'center', padding: 12, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' }}><Text style={{ fontSize: 34 }}>💺</Text><Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '900', marginTop: 5 }}>YOU · {creatorMode ? 'HOST' : 'GUEST'}</Text></View>}
            {audioOnlyParticipants.map((person) => <View key={person.identity} style={{ minWidth: 112, alignItems: 'center', padding: 12, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}><Text style={{ fontSize: 34 }}>💺</Text><Text numberOfLines={1} style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '900', marginTop: 5, maxWidth: 120 }}>{person.name || person.identity}</Text><View style={{ marginTop: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.accent }}><Text style={{ color: colors.onAccent, fontSize: 9, fontWeight: '900' }}>{person.identity === stream.creator_id ? 'HOST' : 'GUEST'}</Text></View></View>)}
            {Array.from({ length: Math.max(0, 6 - audioOnlyParticipants.length - (localAudioOnly ? 1 : 0)) }, (_, index) => <View key={'open-seat-' + index} accessibilityLabel={'Available LIVE seat ' + (index + 1)} style={{ minWidth: 112, alignItems: 'center', padding: 12, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.035)', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.30)' }}><Text style={{ fontSize: 34, opacity: 0.65 }}>🪑</Text><Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '900', marginTop: 5 }}>OPEN SEAT</Text><Text style={{ color: 'rgba(255,255,255,0.62)', fontSize: 9, marginTop: 3 }}>Available</Text></View>)}
          </View>}
        </View>
      )}
      <View pointerEvents="box-none" style={{ position: 'absolute', top: (experienceMode === 'video_chat' ? 174 : 88) + insets.top, left: 14, right: 14, bottom: 150 + insets.bottom }}>
        {floatingRemoteTracks.slice(0, 5).map((item, floatingIndex) => (
          <RemoteVideoTile
            key={item.track.sid}
            track={item.track}
            participant={item.participant}
            colors={colors}
            creatorId={stream.creator_id}
            floating
            floatingIndex={floatingIndex}
            floatingCount={floatingRemoteTracks.length}
            focused={focusedStageIdentity === item.participant.identity}
            spotlight={item.participant.attributes?.zannychat_spotlight === 'true'}
            onFocus={() => setFocusedStageIdentity(item.participant.identity)}
          />
        ))}
      </View>
      {audioOnlyParticipants.length > 0 && <View style={{ position: 'absolute', top: 86 + insets.top, left: 16, maxWidth: 230, padding: 10, borderRadius: 13, backgroundColor: 'rgba(5,5,11,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
        {audioOnlyParticipants.slice(0, 3).map((participant) => <Text key={participant.identity} style={{ color: '#FFFFFF', fontSize: 11, marginVertical: 2 }}>{participant.identity === stream.creator_id ? 'HOST' : 'GUEST'} · {participant.name || participant.identity} · Audio only</Text>)}
      </View>}
      <View ref={remoteAudioRef} collapsable={false} style={{ width: 1, height: 1, opacity: 0 }} />
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {floatingReactions.map((item, index) => <FloatingReaction key={item.id} item={item} index={index} onComplete={removeFloatingReaction} />)}
      </View>
    </View>

    <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(5,5,11,0.58)' }}>
      <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9, backgroundColor: colors.danger }}><Text style={{ color: colors.onDanger, fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>● LIVE</Text></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '900' }}>{stream.title}</Text>
        <Text numberOfLines={1} style={{ color: 'rgba(255,255,255,0.68)', fontSize: 11, marginTop: 2 }}>{status}</Text>
        {creatorMode && timeoutLabel ? <Text accessibilityRole="timer" accessibilityLabel={timeoutRemainingMs === 0 ? 'LIVE time limit reached; ending automatically' : timeoutWarning ? 'LIVE ends in less than ten minutes' : 'LIVE time remaining ' + timeoutLabel} style={{ color: timeoutWarning ? colors.onDanger : '#FFFFFF', backgroundColor: timeoutWarning ? colors.danger : 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: timeoutWarning ? hexToRgba(colors.onDanger, 0.35) : 'rgba(255,255,255,0.16)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', fontSize: 10, fontWeight: '900', marginTop: 3, letterSpacing: 0.4 }}>{timeoutRemainingMs === 0 ? 'TIME LIMIT REACHED · ENDING' : timeoutWarning ? 'ENDS IN ' + timeoutLabel : 'TIME LEFT ' + timeoutLabel}</Text> : null}
      </View>
      {!compactRoomHeader ? (<View style={{ paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.primary, borderWidth: 1, borderColor: hexToRgba(colors.onPrimary, 0.24) }}>
        <Text style={{ color: colors.onPrimary, fontSize: 9, fontWeight: '900', letterSpacing: 0.45 }}>{creatorMode ? 'HOST' : publisherMode ? 'GUEST' : moderatorMode ? 'MODERATOR' : 'VIEWER'}</Text>
      </View>) : null}
      {creatorMode && replayEnabled ? <TouchableOpacity
        onPress={() => { replay?.status === 'ready' ? viewReplay() : replay?.status === 'recording' ? stopReplay() : confirmStartReplay(); }}
        disabled={replayBusy || ['starting', 'processing'].includes(replay?.status)}
        accessibilityRole="button"
        accessibilityLabel={replay?.status === 'ready' ? 'Watch saved LIVE replay' : replay?.status === 'recording' ? 'Stop LIVE replay recording' : 'Start LIVE replay recording'}
        accessibilityState={{ disabled: replayBusy || ['starting', 'processing'].includes(replay?.status), busy: replayBusy }}
        style={{ minWidth: 52, height: 48, paddingHorizontal: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 14, backgroundColor: replay?.status === 'recording' ? hexToRgba(colors.danger, 0.16) : hexToRgba(colors.primary, 0.16), borderWidth: 1, borderColor: replay?.status === 'recording' ? colors.danger : colors.border, opacity: replayBusy || ['starting', 'processing'].includes(replay?.status) ? 0.55 : 1 }}
      >
        {replayBusy || ['starting', 'processing'].includes(replay?.status) ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name={replay?.status === 'ready' ? 'play-circle-outline' : replay?.status === 'recording' ? 'stop-circle-outline' : 'radio-button-on-outline'} size={15} color={replay?.status === 'recording' ? colors.danger : colors.primary} />}
        <Text style={{ color: replay?.status === 'recording' ? colors.danger : colors.textPrimary, fontSize: 8, fontWeight: '900', letterSpacing: 0.2 }}>{replayBusy || ['starting', 'processing'].includes(replay?.status) ? 'WAIT' : replay?.status === 'ready' ? 'PLAY' : replay?.status === 'recording' ? 'STOP' : 'REC'}</Text>
      </TouchableOpacity> : null}
      <Action colors={colors} label="Tools" accessibilityLabel="Open LIVE controls menu" onPress={() => setShowOverlayMenu((value) => !value)} />
      <Action colors={colors} label={creatorMode ? 'END LIVE' : 'LEAVE'} accessibilityLabel={creatorMode ? 'End LIVE broadcast' : 'Leave LIVE stream'} danger={creatorMode} disabled={busy} onPress={creatorMode ? confirmEnd : leave} />
    </View>

    {!!error && <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 78, left: 16, right: 16, padding: 10, borderRadius: 12, backgroundColor: 'rgba(100,20,35,0.86)' }}><Text accessibilityRole="alert" style={{ color: '#FFFFFF', fontSize: 12 }}>{error}</Text></View>}
    {!!stageNotice && <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 118, left: 16, right: 16, padding: 10, borderRadius: 12, backgroundColor: 'rgba(30,70,90,0.86)' }}><Text accessibilityRole="status" style={{ color: '#FFFFFF', fontSize: 12 }}>{stageNotice}</Text></View>}
    {guestStatus === 'pending' && !publisherMode ? <View style={{ position: 'absolute', zIndex: 30, top: insets.top + 164, left: 16, right: 16, padding: 13, borderRadius: 16, backgroundColor: 'rgba(12,11,28,0.96)', borderWidth: 1, borderColor: 'rgba(190,160,255,0.65)' }}>
      <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '900' }}>LIVE guest invitation</Text>
      <Text style={{ color: '#E6E2F4', fontSize: 12, marginTop: 4 }}>The creator invited you to join the stage. Choose whether to join before your camera or microphone is enabled.</Text>
      <View style={{ flexDirection: 'row', gap: 9, marginTop: 11 }}>
        <Action colors={colors} label="Video Join" onPress={() => decideGuestInvitation('accepted', 'video')} />
        <Action colors={colors} label="Audio Join" onPress={() => decideGuestInvitation('accepted', 'audio')} />
        <Action colors={colors} label="Reject" onPress={() => decideGuestInvitation('declined')} danger />
      </View>
    </View> : guestApproved && !publisherMode ? <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 164, left: 16, right: 16, padding: 10, borderRadius: 12, backgroundColor: 'rgba(30,70,90,0.88)' }}><Text accessibilityRole="status" style={{ color: '#FFFFFF', fontSize: 12 }}>Your invitation is accepted. Join the stage when you are ready.</Text></View> : null}

    <View pointerEvents="box-none" style={{ position: 'absolute', left: 14, bottom: 96 + insets.bottom, width: 'min(390px, 70%)', maxHeight: '42%', gap: 8 }}>
      {commentsVisible && comments.slice(-4).map((item) => <View key={item.id} style={{ alignSelf: 'flex-start', maxWidth: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 14, backgroundColor: 'rgba(5,5,11,0.68)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
        <Text style={{ color: '#B9A9FF', fontSize: 11, fontWeight: '900' }}>{item.user_name || 'ZannyChat user'}</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 12, flexShrink: 1 }}>{item.body}</Text>
        {moderatorMode && <TouchableOpacity onPress={() => hideComment(item.id)} accessibilityRole="button" accessibilityLabel="Hide comment" style={{ minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#FF9EAB', fontSize: 11 }}>Hide</Text></TouchableOpacity>}
      </View>)}
      {!comments.length && commentsVisible && <Text style={{ color: 'rgba(255,255,255,0.68)', fontSize: 12, padding: 8 }}>Be the first to say hello.</Text>}
    </View>

    <View pointerEvents="box-none" style={{ position: 'absolute', left: 14, right: 14, bottom: 12 + insets.bottom, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <TextInput value={draft} onChangeText={(v) => setDraft(v.slice(0, 500))} maxLength={500} placeholder="Say something kind…" placeholderTextColor="rgba(255,255,255,0.62)" accessibilityLabel="LIVE chat message" style={{ flex: 1, minWidth: 0, color: '#FFFFFF', backgroundColor: 'rgba(8,8,18,0.78)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 18, paddingHorizontal: 15, paddingVertical: 12 }} />
      <Action colors={colors} label="Send" disabled={busy || !draft.trim()} onPress={sendComment} />
    </View>

    <View pointerEvents="box-none" style={{ position: 'absolute', right: 14, bottom: 150 + insets.bottom, gap: 8, alignItems: 'center' }}>
      {Object.entries(LIVE_REACTION_EMOJI).map(([reaction, emoji]) => <Action key={reaction} colors={colors} label={emoji} accessibilityLabel={'Send ' + reaction + ' reaction'} onPress={() => react(reaction)} />)}
    </View>

    {audioBlocked && <View style={{ position: 'absolute', top: '45%', alignSelf: 'center' }}><Action colors={colors} label="Enable LIVE audio" onPress={() => roomRef.current?.startAudio().then(() => setAudioBlocked(false)).catch((err) => setError(err?.message || 'Audio playback is blocked.'))} /></View>}

    {showOverlayMenu && <View style={{ position: 'absolute', top: 76 + insets.top, right: 14, width: 230, padding: 10, borderRadius: 18, backgroundColor: 'rgba(12,11,24,0.96)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', gap: 7, zIndex: 20 }}>
      <Action colors={colors} label={commentsVisible ? 'Clean mode' : 'Exit clean mode'} onPress={() => { setCommentsVisible((value) => !value); setShowOverlayMenu(false); }} />
      <Action colors={colors} label="Share LIVE" onPress={() => { shareLiveStream(); setShowOverlayMenu(false); }} />
      {publisherMode && experienceMode !== 'audio_room' && connection?.mediaMode !== 'audio' && <Action colors={colors} label={camera ? 'Turn camera off' : 'Turn camera on'} onPress={() => { toggleCamera(); setShowOverlayMenu(false); }} />}
      {publisherMode && <Action colors={colors} label={mic ? 'Mute microphone' : 'Unmute microphone'} onPress={() => { toggleMic(); setShowOverlayMenu(false); }} />}
      {!creatorMode && <Action colors={colors} label="Creator profile" accessibilityLabel="Open LIVE creator profile" onPress={() => { navigation.navigate('LiveCreatorProfile', { participant: { id: stream.creator_id, name: route.params?.creatorName || stream.creator_name || 'LIVE Creator', avatarColor: route.params?.creatorAvatarColor || stream.creator_avatar_color }, fromLive: true, currentLiveStreamId: stream.id, alreadyViewingLive: true, isCurrentUser: false }); setShowOverlayMenu(false); }} />}
      {creatorMode && stream.allow_guests && <Action colors={colors} label="Creator Studio" onPress={() => { loadParticipants(); setShowOverlayMenu(false); }} />}
      {creatorMode && stream.allow_guests && <Action colors={colors} label="Open full guest queue" onPress={() => { navigation.navigate('LiveGuestQueue', { streamId: stream.id, title: stream.title || 'LIVE stage' }); setShowOverlayMenu(false); }} />}
      {creatorMode && <Action colors={colors} label="Participant moderation" onPress={() => { navigation.navigate('LiveModeration', { streamId: stream.id, title: stream.title || 'LIVE stage' }); setShowOverlayMenu(false); }} />}
      {moderatorMode && <Action colors={colors} label="Open safety reports workspace" onPress={() => { navigation.navigate('LiveReports', { streamId: stream.id, title: stream.title || 'LIVE stage', canManageParticipants: creatorMode }); setShowOverlayMenu(false); }} />}
      {creatorMode && stream.allow_guests && <Action colors={colors} label={`Guest requests (${guestRequests.length})`} onPress={() => { setPanel(panel === 'guestRequests' ? '' : 'guestRequests'); setShowOverlayMenu(false); }} />}
      {creatorMode && !replayEnabled && <View accessibilityRole="summary" style={{ paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}><Text style={{ color: colors.textPrimary, fontSize: 11, fontWeight: '800' }}>{replayAvailability === 'checking' ? 'Checking replay setup…' : replayAvailability === 'unavailable' ? 'Replay setup could not be checked' : 'Replay recording unavailable'}</Text><Text style={{ color: colors.textSecondary, fontSize: 10, maxWidth: 220 }}>{replayAvailability === 'unavailable' ? 'Try again later. Your LIVE broadcast is unaffected.' : replayAvailability === 'checking' ? 'Please wait' : 'Replay recording is not enabled for this server.'}</Text></View>}
      {moderatorMode && <Action colors={colors} label="Safety reports" onPress={() => { loadReports(); setShowOverlayMenu(false); }} />}
      {!publisherMode && stream.allow_guests && <Action colors={colors} label={guestApproved ? 'Join the stage' : guestStatus === 'requested' ? 'Request pending' : 'Request to join'} disabled={guestStatus === 'requested'} onPress={() => { guestApproved ? joinGuest() : requestGuest(); setShowOverlayMenu(false); }} />}
      {!creatorMode && <Action colors={colors} label="Report LIVE" onPress={() => { report(); setShowOverlayMenu(false); }} />}
      <Action colors={colors} label="Close menu" onPress={() => setShowOverlayMenu(false)} />
    </View>}

    {!!panel && <View style={{ position: 'absolute', top: 82 + insets.top, right: 14, bottom: 92 + insets.bottom, width: 360, maxWidth: '92%', padding: 14, borderRadius: 20, backgroundColor: 'rgba(12,11,24,0.97)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', zIndex: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '900' }}>{panel === 'stage' ? 'Creator Studio' : panel === 'guestRequests' ? 'Guest requests' : 'LIVE safety reports'}</Text>
        <Action colors={colors} label="Close" onPress={() => setPanel('')} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8 }}>
        {panel === 'stage' && creatorMode && <>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, padding: 10, borderRadius: 12, backgroundColor: colors.surfaceAlt }}><Text style={{ color: colors.textPrimary, fontWeight: '900', fontSize: 20 }}>{participants.filter((item) => item.joined && item.role === 'viewer').length}</Text><Text style={{ color: colors.textSecondary, fontSize: 11 }}>Viewers listed</Text></View>
            <View style={{ flex: 1, padding: 10, borderRadius: 12, backgroundColor: colors.surfaceAlt }}><Text style={{ color: colors.textPrimary, fontWeight: '900', fontSize: 20 }}>{participants.filter((item) => item.joined && item.role === 'guest').length}/5</Text><Text style={{ color: colors.textSecondary, fontSize: 11 }}>Guests</Text></View>
            <View style={{ flex: 1, padding: 10, borderRadius: 12, backgroundColor: colors.surfaceAlt }}><Text style={{ color: colors.textPrimary, fontWeight: '900', fontSize: 20 }}>{Math.max(0, 5 - participants.filter((item) => item.joined && item.role === 'guest').length)}</Text><Text style={{ color: colors.textSecondary, fontSize: 11 }}>Open slots</Text></View>
          </View>
          {participants.map((item) => <View key={item.userId} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
            <View style={{ width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: item.avatarColor || colors.primary }}><Text style={{ color: '#FFFFFF', fontWeight: '900' }}>{(item.name || 'P').trim().charAt(0).toUpperCase()}</Text></View><View style={{ flex: 1, minWidth: 100 }}><Text style={{ color: colors.textPrimary, fontWeight: '800' }}>{item.name}{item.role === 'creator' ? ' · Host' : item.stage ? ' · On stage' : !item.joined ? ' · offline' : ' · Viewer'}</Text><Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 2 }}>{item.connectionStatus === 'connected' ? 'Connected' : 'Not connected'}{item.microphoneMuted === true ? ' · Mic muted' : item.microphoneMuted === false ? ' · Mic on' : ''}{item.cameraEnabled === true ? ' · Camera on' : item.cameraEnabled === false ? ' · Camera off' : ''}</Text></View>
            {stream.allow_guests && item.joined && item.role === 'viewer' && <Action colors={colors} label={item.guestInvited ? 'Invited' : 'Invite'} disabled={busy || item.guestInvited} onPress={() => inviteGuest(item.userId)} />}
            {item.stage && <Action colors={colors} label={item.microphoneMuted ? 'Unmute' : 'Mute'} onPress={() => muteGuest(item.userId, !item.microphoneMuted)} />}
            {item.stage && <Action colors={colors} label={item.spotlighted ? 'Unspotlight' : 'Spotlight'} onPress={() => spotlightGuest(item.userId, !item.spotlighted)} />}
            {item.stage && <Action colors={colors} label="Move to audience" onPress={() => removeGuest(item.userId)} />}
            {item.joined && item.role !== 'creator' && <Action colors={colors} label="Remove from LIVE" danger onPress={() => removeParticipant(item.userId)} />}
            {item.role !== 'creator' && (item.moderator || item.joined) && <Action colors={colors} label={item.moderator ? 'Remove moderator' : 'Make moderator'} danger={item.moderator} onPress={() => setModerator(item.userId, !item.moderator)} />}
          </View>)}
          {!participants.length && <Text style={{ color: colors.textSecondary }}>No connected viewers or guests yet.</Text>}
        </>}
        {panel === 'guestRequests' && creatorMode && <>
          {guestRequests.map((item) => <View key={item.user_id} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
            <View style={{ width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: item.avatarColor || colors.primary }}><Text style={{ color: '#FFFFFF', fontWeight: '900' }}>{(item.name || 'G').trim().charAt(0).toUpperCase()}</Text></View><View style={{ flex: 1, minWidth: 100 }}><Text style={{ color: colors.textPrimary, fontWeight: '800' }}>{item.name || item.user_id}</Text><Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 2 }}>Requested to join your stage</Text></View>
            <Action colors={colors} label="Approve" onPress={() => reviewGuestRequest(item.user_id, 'accepted')} />
            <Action colors={colors} label="Decline" danger onPress={() => reviewGuestRequest(item.user_id, 'declined')} />
          </View>)}
          {!guestRequests.length && <Text style={{ color: colors.textSecondary }}>No pending guest requests.</Text>}
        </>}
        {panel === 'reports' && <>
          {reports.map((item) => <View key={item.id} style={{ paddingVertical: 7 }}>
            <Text style={{ color: colors.textPrimary }}>{item.reason} · {item.status}</Text>
            {item.status === 'open' && <Action colors={colors} label="Review" onPress={() => reviewReport(item.id, 'reviewing')} />}
            {['open','reviewing'].includes(item.status) && <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}><Action colors={colors} label="Resolve" onPress={() => reviewReport(item.id, 'resolved')} /><Action colors={colors} label="Dismiss" onPress={() => reviewReport(item.id, 'dismissed')} /></View>}
          </View>)}
          {!reports.length && <Text style={{ color: colors.textSecondary }}>No open safety reports.</Text>}
        </>}
      </ScrollView>
    </View>}
    {busy && <View pointerEvents="none" style={{ position: 'absolute', top: '50%', alignSelf: 'center' }}><ActivityIndicator color="#FFFFFF" /></View>}
  </View>;
}
