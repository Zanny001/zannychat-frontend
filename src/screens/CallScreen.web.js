import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import CallInvitePicker from '../components/CallInvitePicker';
import { useTheme } from '../theme/ThemeContext';
import { sendCallSignal, subscribeToCallSession, subscribeToCallSignals, updateCallStatus } from '../services/calls';
import { backendFetch } from '../services/backendClient';
import { supabase } from '../services/supabaseClient';
import { formatCallDuration, getCallEndStatus, isTerminalCallStatus } from '../utils/callPolicy';
import { getIceNetworkNotice } from '../utils/callNetworkStatus';

const FALLBACK_ICE_SERVERS = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

export default function CallScreenWeb({ route, navigation }) {
  const params = route.params || {};
  const { colors, typography, resolvedMode } = useTheme();
  const { call: initialCall, callId, conversationId, callType = 'audio', isCaller = false, participantName = 'ZannyChat contact', avatarColor } = params;
  const initial = initialCall || { id: callId, conversation_id: conversationId, call_type: callType, status: 'accepted' };
  const [call, setCall] = useState(initial);
  const [phase, setPhase] = useState('Connecting…');
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState((initial.call_type || callType) !== 'video');
  const [activeCallType, setActiveCallType] = useState(initial.call_type || callType);
  const [remoteVideoActive, setRemoteVideoActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [errorText, setErrorText] = useState('');
  const [mediaNotice, setMediaNotice] = useState('');
  const [networkNotice, setNetworkNotice] = useState('');
  const [invitePickerVisible, setInvitePickerVisible] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [audioPlaybackBlocked, setAudioPlaybackBlocked] = useState(false);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const pcRef = useRef(null);
  const cameraSenderRef = useRef(null);
  const cameraSwitchInProgressRef = useRef(false);
  const localStreamRef = useRef(null);
  const cameraFacingModeRef = useRef('user');
  const callRef = useRef(initial);
  const activeRef = useRef(true);
  const remoteDescriptionReady = useRef(false);
  const queuedIce = useRef([]);
  const seenSignals = useRef(new Set());
  const connectedAtRef = useRef(null);
  const offerStartedRef = useRef(false);
  const iceRestartInProgressRef = useRef(false);
  const disconnectTimerRef = useRef(null);
  const upgradeNavigatedRef = useRef(false);
  const endingRef = useRef(false);

  const immersiveVideo = activeCallType === 'video' || remoteVideoActive;
  const foreground = immersiveVideo ? '#FFFFFF' : colors.textPrimary;
  const secondaryForeground = immersiveVideo ? '#C4C2D2' : colors.textSecondary;

  const playRemoteMedia = useCallback(async () => {
    const element = remoteAudioRef.current;
    if (!element || !remoteStream) return;
    if (element.srcObject !== remoteStream) element.srcObject = remoteStream;
    try {
      await element.play?.();
      setAudioPlaybackBlocked(false);
    } catch (_) {
      // Browsers may block autoplay until the user taps an explicit control.
      setAudioPlaybackBlocked(true);
    }
  }, [remoteStream]);

  useEffect(() => {
    playRemoteMedia();
  }, [playRemoteMedia]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play?.().catch(() => {});
    }
  }, [remoteStream, remoteVideoActive]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play?.().catch(() => {});
    }
  }, [localStream, cameraOff, activeCallType]);

  const navigateToConference = useCallback(async (room, connectionResult = null) => {
    if (!room?.id || upgradeNavigatedRef.current) return;
    upgradeNavigatedRef.current = true;
    endingRef.current = true;
    navigation.replace('GroupCall', {
      roomId: room.id,
      connection: connectionResult,
      conversationId: room.conversation_id || conversationId,
      conversationName: 'Group call',
      callType: room.call_type || activeCallType,
    });
  }, [activeCallType, conversationId, navigation]);

  const navigateToDirectLiveKit = useCallback(async (currentCall, connectionResult) => {
    if (!activeRef.current || endingRef.current || !currentCall?.id || !connectionResult?.token || !connectionResult?.livekitUrl || !connectionResult?.roomId || upgradeNavigatedRef.current) return false;
    const { data: latestCall, error: latestCallError } = await supabase.from('call_sessions')
      .select('id,conversation_id,call_type,status,group_room_id')
      .eq('id', currentCall.id).maybeSingle();
    if (!activeRef.current || endingRef.current) return false;
    if (latestCallError || !latestCall) {
      endingRef.current = true;
      if (activeRef.current) setErrorText('Could not verify that this call is still active. Please start a new call.');
      navigation.goBack();
      return false;
    }
    if (latestCall.status !== 'accepted') {
      endingRef.current = true;
      navigation.goBack();
      return false;
    }
    if (latestCall.group_room_id) {
      await navigateToConference({ id: latestCall.group_room_id, conversation_id: latestCall.conversation_id, call_type: latestCall.call_type });
      return true;
    }
    upgradeNavigatedRef.current = true;
    endingRef.current = true;
    navigation.replace('GroupCall', {
      directCallId: currentCall.id,
      directCall: { ...currentCall, ...latestCall },
      connection: connectionResult,
      conversationId: latestCall.conversation_id || conversationId,
      conversationName: participantName,
      callType: latestCall.call_type || activeCallType,
    });
    return true;
  }, [activeCallType, conversationId, navigation, navigateToConference, participantName]);

  const endCall = useCallback((reason = 'ended') => {
    if (endingRef.current) return;
    endingRef.current = true;
    // Stop local capture and leave immediately; network persistence is best-effort.
    try { pcRef.current?.close(); } catch (_) {}
    try { localStreamRef.current?.getTracks?.().forEach((track) => track.stop()); } catch (_) {}
    try { remoteStreamRef.current?.getTracks?.().forEach((track) => track.stop()); } catch (_) {}
    const current = callRef.current || call;
    navigation.goBack();
    if (current?.id && ['ringing', 'accepted'].includes(current.status)) {
      const nextStatus = getCallEndStatus({ reason, isCaller, status: current.status });
      updateCallStatus(current.id, nextStatus)
        .then((updated) => { callRef.current = { ...current, ...updated }; })
        .catch((error) => {
          console.warn('[calls] local media stopped; call-end status will be reconciled after network recovery:', error?.message || error);
        });
    }
  }, [call, isCaller, navigation]);

  useEffect(() => {
    if (!navigation?.addListener) return undefined;
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (endingRef.current) return;
      const current = callRef.current || call;
      if (!current?.id || isTerminalCallStatus(current.status)) return;
      const nextStatus = getCallEndStatus({ reason: 'ended', isCaller, status: current.status });
      event.preventDefault();
      endingRef.current = true;
      updateCallStatus(current.id, nextStatus)
        .then((updated) => { callRef.current = { ...current, ...updated }; })
        .catch(() => {})
        .finally(() => navigation.dispatch(event.data.action));
    });
    return unsubscribe;
  }, [call, isCaller, navigation]);

  useEffect(() => {
    activeRef.current = true;
    let unsubscribeSignals = () => {};
    let unsubscribeSession = () => {};
    let pc = null;
    let stream = null;
    let signalingReady = false;
    let currentStatus = callRef.current?.status;

    const processSignal = async (signal) => {
      if (!activeRef.current || !signal?.id || seenSignals.current.has(signal.id) || !pc) return;
      seenSignals.current.add(signal.id);
      const expectedRemoteId = isCaller ? callRef.current?.callee_id : callRef.current?.caller_id;
      if (signal.sender_id !== expectedRemoteId) return;
      try {
        if (signal.signal_type === 'offer') {
          if (pc.signalingState !== 'stable') {
            if (isCaller) return;
            await pc.setLocalDescription({ type: 'rollback' });
          }
          remoteDescriptionReady.current = false;
          await pc.setRemoteDescription(new window.RTCSessionDescription(signal.payload));
          remoteDescriptionReady.current = true;
          for (const candidate of queuedIce.current.splice(0)) await pc.addIceCandidate(new window.RTCIceCandidate(candidate));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendCallSignal({ call: callRef.current, type: 'answer', payload: { type: answer.type, sdp: answer.sdp } });
          setPhase('Connecting…');
        } else if (signal.signal_type === 'answer' && pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new window.RTCSessionDescription(signal.payload));
          remoteDescriptionReady.current = true;
          for (const candidate of queuedIce.current.splice(0)) await pc.addIceCandidate(new window.RTCIceCandidate(candidate));
        } else if (signal.signal_type === 'ice-candidate') {
          if (remoteDescriptionReady.current && pc.remoteDescription) await pc.addIceCandidate(new window.RTCIceCandidate(signal.payload));
          else queuedIce.current.push(signal.payload);
        }
      } catch (error) {
        if (activeRef.current) setErrorText('Could not establish the media connection. Check your network and try again.');
      }
    };

    const run = async () => {
      if (!callRef.current?.id) throw new Error('Call session is missing. Please start the call again.');
      if (!supabase) throw new Error('Sign in to ZannyChat before starting a call.');
      if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
        throw new Error('This browser does not support audio/video calling. Try the latest Chrome, Edge, Firefox, or Safari over HTTPS.');
      }
      const { data: liveCall, error: liveCallError } = await supabase.from('call_sessions')
        .select('id,conversation_id,caller_id,callee_id,call_type,status,created_at,accepted_at,ended_at,expires_at,group_room_id')
        .eq('id', callRef.current.id).maybeSingle();
      if (liveCallError) throw liveCallError;
      if (liveCall?.group_room_id) {
        callRef.current = liveCall;
        if (activeRef.current) setCall(liveCall);
        await navigateToConference({ id: liveCall.group_room_id, conversation_id: liveCall.conversation_id, call_type: liveCall.call_type });
        return;
      }
      if (!liveCall || (isCaller ? !['ringing', 'accepted'].includes(liveCall.status) : liveCall.status !== 'accepted')) {
        throw new Error('This call is no longer available. Please start or answer the call again.');
      }
      if (liveCall.status === 'accepted') {
        try {
          const liveKitConnection = await backendFetch(`/calls/${liveCall.id}/livekit-token`, { method: 'POST' });
          if (await navigateToDirectLiveKit(liveCall, liveKitConnection)) return;
          if (!activeRef.current || endingRef.current) return;
        } catch (liveKitError) {
          const { data: latestCall, error: stateError } = await supabase.from('call_sessions').select('id,conversation_id,call_type,status,group_room_id').eq('id', liveCall.id).maybeSingle();
          if (!stateError && (!latestCall || latestCall.status !== 'accepted')) {
            endingRef.current = true;
            navigation.goBack();
            return;
          }
          if (!stateError && latestCall.group_room_id) {
            await navigateToConference({ id: latestCall.group_room_id, conversation_id: latestCall.conversation_id, call_type: latestCall.call_type });
            return;
          }
          console.warn('[calls] LiveKit direct transport unavailable; retaining WebRTC fallback:', liveKitError?.message || liveKitError);
        }
      }
      callRef.current = liveCall;
      if (activeRef.current) setCall(liveCall);

      let startupMediaNotice = '';
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: liveCall.call_type === 'video' ? { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 540 }, frameRate: { ideal: 24 } } : false,
        });
      } catch (mediaError) {
        const recoverableCameraErrors = ['NotAllowedError', 'NotFoundError', 'NotReadableError', 'OverconstrainedError', 'AbortError'];
        if (liveCall.call_type !== 'video' || !recoverableCameraErrors.includes(mediaError?.name)) throw mediaError;
        // A camera failure must not take down an otherwise usable microphone
        // on the WebRTC fallback path. Retry audio-only, then allow camera retry.
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        startupMediaNotice = mediaError.name === 'NotAllowedError'
          ? 'Chrome blocked camera access. The call continues with audio; allow camera access in site settings, then switch video on.'
          : mediaError.name === 'NotFoundError'
            ? 'No usable camera was found. The call continues with audio; connect a camera to enable video.'
            : mediaError.name === 'NotReadableError'
              ? 'The camera is busy in another app. The call continues with audio; close the other app and retry video.'
              : 'The camera could not start with the requested settings. The call continues with audio; retry video when ready.';
        if (activeRef.current) {
          setCameraOff(true);
          setActiveCallType('audio');
          setMediaNotice(startupMediaNotice);
        }
      }
      localStreamRef.current = stream;
      if (activeRef.current) setLocalStream(stream);

      let iceServers = FALLBACK_ICE_SERVERS;
      let networkNoticeMessage = getIceNetworkNotice(null);
      try {
        const config = await backendFetch('/calls/ice-config');
        if (Array.isArray(config?.iceServers) && config.iceServers.length) iceServers = config.iceServers;
        networkNoticeMessage = getIceNetworkNotice(config);
      } catch (_) {
      }
      if (!activeRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      setNetworkNotice(networkNoticeMessage);

      pc = new window.RTCPeerConnection({ iceServers, iceCandidatePoolSize: 4 });
      pcRef.current = pc;
      stream.getTracks().forEach((track) => {
        const sender = pc.addTrack(track, stream);
        if (track.kind === 'video') cameraSenderRef.current = sender;
      });
      pc.ontrack = (event) => {
        let nextStream = event.streams?.[0];
        if (nextStream) remoteStreamRef.current = nextStream;
        if (event.track?.kind === 'video') {
          event.track.onunmute = () => { if (activeRef.current) setRemoteVideoActive(true); };
          event.track.onmute = () => { if (activeRef.current) setRemoteVideoActive(false); };
          event.track.onended = () => { if (activeRef.current) setRemoteVideoActive(false); };
          if (!remoteStreamRef.current) remoteStreamRef.current = new window.MediaStream();
          if (!remoteStreamRef.current.getTracks().some((track) => track.id === event.track.id)) {
            remoteStreamRef.current.addTrack(event.track);
          }
          nextStream = remoteStreamRef.current;
          if (!event.track.muted && activeRef.current) setRemoteVideoActive(true);
        }
        else if (event.track) {
          if (!remoteStreamRef.current) remoteStreamRef.current = new window.MediaStream();
          if (!remoteStreamRef.current.getTracks().some((track) => track.id === event.track.id)) {
            remoteStreamRef.current.addTrack(event.track);
          }
          nextStream = remoteStreamRef.current;
        }
        if (nextStream && activeRef.current) setRemoteStream(nextStream);
      };
      pc.onicecandidate = (event) => {
        if (event.candidate && activeRef.current && callRef.current) {
          sendCallSignal({ call: callRef.current, type: 'ice-candidate', payload: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate })
            .catch(() => { if (activeRef.current) setErrorText('Network signalling interrupted. Check your connection.'); });
        }
      };
      pc.onconnectionstatechange = () => {
        if (!activeRef.current) return;
        if (pc.connectionState === 'connected') {
          connectedAtRef.current = connectedAtRef.current || Date.now();
          setPhase('Connected');
          setErrorText('');
        } else if (pc.connectionState === 'connecting') setPhase('Connecting…');
        else if (pc.connectionState === 'disconnected') setPhase('Reconnecting…');
        else if (pc.connectionState === 'failed') setErrorText('Connection failed. This network may require a TURN relay.');
      };
      pc.oniceconnectionstatechange = async () => {
        if (!activeRef.current) return;
        const state = pc.iceConnectionState;

        if (state === 'connected' || state === 'completed') {
          if (disconnectTimerRef.current) {
            clearTimeout(disconnectTimerRef.current);
            disconnectTimerRef.current = null;
          }
          iceRestartInProgressRef.current = false;
          setErrorText('');
          return;
        }

        if ((state === 'disconnected' || state === 'failed') && !disconnectTimerRef.current) {
          disconnectTimerRef.current = setTimeout(async () => {
            disconnectTimerRef.current = null;
            if (!activeRef.current || ['connected', 'completed'].includes(pc.iceConnectionState)) return;
            const current = callRef.current;
            if (current?.id && current.status === 'accepted') {
              try {
                const updated = await updateCallStatus(current.id, 'ended');
                callRef.current = { ...current, ...updated };
              } catch (_) {}
            }
            if (activeRef.current) navigation.goBack();
          }, 120_000);
        }

        if (
          (state === 'disconnected' || state === 'failed') &&
          currentStatus === 'accepted' &&
          !iceRestartInProgressRef.current
        ) {
          iceRestartInProgressRef.current = true;
          try {
            pc.restartIce?.();
            const restartOffer = await pc.createOffer({ iceRestart: true });
            await pc.setLocalDescription(restartOffer);
            await sendCallSignal({
              call: callRef.current,
              type: 'offer',
              payload: { type: restartOffer.type, sdp: restartOffer.sdp },
            });
            if (activeRef.current) setPhase('Reconnecting…');
          } catch (_) {
            iceRestartInProgressRef.current = false;
            if (activeRef.current) {
              setErrorText('Unable to restore the call. Check your network and try again.');
            }
          }
        }
      };

      const maybeStartOffer = async () => {
        if (!isCaller || currentStatus !== 'accepted' || !signalingReady || offerStartedRef.current || !pc || !activeRef.current || endingRef.current) return;
        offerStartedRef.current = true;
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await sendCallSignal({ call: callRef.current, type: 'offer', payload: { type: offer.type, sdp: offer.sdp } });
          if (activeRef.current) setPhase('Calling…');
        } catch (_) {
          offerStartedRef.current = false;
          if (activeRef.current) setErrorText('Could not start the call. Please try again.');
        }
      };

      unsubscribeSignals = subscribeToCallSignals(liveCall.id, processSignal, async () => {
        if (!supabase || !activeRef.current) return;
        const { data } = await supabase.from('call_signals')
          .select('id,call_id,sender_id,recipient_id,signal_type,payload,created_at')
          .eq('call_id', liveCall.id).order('created_at', { ascending: true }).limit(250);
        for (const signal of data || []) await processSignal(signal);
        signalingReady = true;
        await maybeStartOffer();
      });

      unsubscribeSession = subscribeToCallSession(liveCall.id, (next) => {
        if (!activeRef.current || endingRef.current || !next) return;
        currentStatus = next.status;
        callRef.current = next;
        setCall(next);
        if (next.group_room_id) {
          navigateToConference({ id: next.group_room_id, conversation_id: next.conversation_id, call_type: next.call_type }).catch(() => {});
          return;
        }
        if (next.status === 'accepted') {
          setPhase('Connecting…');
          (async () => {
            try {
              const liveKitConnection = await backendFetch(`/calls/${next.id}/livekit-token`, { method: 'POST' });
              if (await navigateToDirectLiveKit(next, liveKitConnection)) return;
              if (!activeRef.current || endingRef.current) return;
            } catch (liveKitError) {
              const { data: latestCall, error: stateError } = await supabase.from('call_sessions').select('id,conversation_id,call_type,status,group_room_id').eq('id', next.id).maybeSingle();
              if (!stateError && (!latestCall || latestCall.status !== 'accepted' || latestCall.group_room_id)) {
                if (latestCall?.group_room_id) await navigateToConference({ id: latestCall.group_room_id, conversation_id: latestCall.conversation_id, call_type: latestCall.call_type });
                else { endingRef.current = true; navigation.goBack(); }
                return;
              }
              console.warn('[calls] LiveKit direct transport unavailable; retaining WebRTC fallback:', liveKitError?.message || liveKitError);
            }
            maybeStartOffer();
          })();
        } else if (isTerminalCallStatus(next.status)) {
          endingRef.current = true;
          setPhase(next.status === 'declined' ? 'Call declined' : next.status === 'missed' ? 'No answer' : 'Call ended');
          setTimeout(() => { if (activeRef.current) navigation.goBack(); }, 700);
        }
      }, async () => {
        if (!supabase || !activeRef.current) return;
        const { data } = await supabase.from('call_sessions')
          .select('id,conversation_id,caller_id,callee_id,call_type,status,created_at,accepted_at,ended_at,expires_at,group_room_id')
          .eq('id', liveCall.id).maybeSingle();
        if (data && activeRef.current) {
          currentStatus = data.status;
          callRef.current = data;
          setCall(data);
          if (data.group_room_id) {
            navigateToConference({ id: data.group_room_id, conversation_id: data.conversation_id, call_type: data.call_type }).catch(() => {});
            return;
          }
          if (isTerminalCallStatus(data.status)) {
            setPhase(data.status === 'declined' ? 'Call declined' : 'Call ended');
            navigation.goBack();
          }
        }
      });
      await maybeStartOffer();
    };

    run().catch(async (error) => {
      const current = callRef.current;
      if (current?.id && current.status === 'accepted') await updateCallStatus(current.id, 'ended').catch(() => {});
      if (activeRef.current) {
        setErrorText(error?.message || 'Could not start the call.');
        setPhase('Unavailable');
      }
    });

    return () => {
      activeRef.current = false;
      if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
      unsubscribeSignals();
      unsubscribeSession();
      try { pc?.close(); } catch (_) {}
      try { stream?.getTracks?.().forEach((track) => track.stop()); } catch (_) {}
      pcRef.current = null;
      localStreamRef.current = null;
      remoteStreamRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!call?.id || call.status !== 'accepted' || !supabase) return undefined;
    let stopped = false;
    const renew = async () => {
      const { error } = await supabase.rpc('heartbeat_call_session', { p_call_id: call.id });
      if (error && !stopped && /expired|unauthorized|participant/i.test(error.message || '')) {
        setErrorText('This call session expired. Please start a new call.');
        setPhase('Unavailable');
        updateCallStatus(call.id, 'ended').catch(() => {});
      }
    };
    renew();
    const timer = setInterval(renew, 30000);
    return () => { stopped = true; clearInterval(timer); };
  }, [call?.id, call?.status]);

  useEffect(() => {
    if (phase !== 'Connected') return undefined;
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - (connectedAtRef.current || Date.now())) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const toggleMute = () => {
    const next = !muted;
    localStreamRef.current?.getAudioTracks?.().forEach((track) => { track.enabled = !next; });
    setMuted(next);
  };
  const toggleCamera = async () => {
    if (cameraSwitchInProgressRef.current) return;
    const next = !cameraOff;
    const pc = pcRef.current;
    const stream = localStreamRef.current;
    if (!pc || !stream || !activeRef.current) return;
    if (pc.signalingState !== 'stable') {
      setErrorText('The call is already updating. Please try the camera switch again.');
      return;
    }

    cameraSwitchInProgressRef.current = true;
    const previousRemoteDescriptionReady = remoteDescriptionReady.current;
    const previousTrack = stream.getVideoTracks?.()[0] || null;
    const existingSender = cameraSenderRef.current || pc.getSenders().find((item) => item.track?.kind === 'video') || null;
    let removedTrack = null;
    let addedTrack = null;
    let senderCreated = false;
    let requiresRenegotiation = false;
    try {
      if (next && previousTrack) {
        removedTrack = previousTrack;
        if (existingSender) await existingSender.replaceTrack(null);
        else {
          const sender = pc.getSenders().find((item) => item.track?.id === previousTrack.id);
          if (sender) pc.removeTrack(sender);
          requiresRenegotiation = true;
        }
        stream.removeTrack(previousTrack);
      } else if (!next && !previousTrack) {
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: cameraFacingModeRef.current, width: { ideal: 960 }, height: { ideal: 540 }, frameRate: { ideal: 24 } },
        });
        addedTrack = cameraStream.getVideoTracks?.()[0];
        if (!addedTrack) throw new Error('No camera track was provided by this device.');
        stream.addTrack(addedTrack);
        if (existingSender) {
          await existingSender.replaceTrack(addedTrack);
          cameraSenderRef.current = existingSender;
        } else {
          cameraSenderRef.current = pc.addTrack(addedTrack, stream);
          senderCreated = true;
          requiresRenegotiation = true;
        }
      } else if (!next && previousTrack) {
        previousTrack.enabled = true;
      }

      if (requiresRenegotiation) {
        if (pc.signalingState !== 'stable') throw new Error('The call is already updating. Please try the camera switch again.');
        remoteDescriptionReady.current = false;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendCallSignal({ call: callRef.current, type: 'offer', payload: { type: offer.type, sdp: offer.sdp } });
      }

      if (removedTrack) removedTrack.stop();
      setLocalStream(stream);
      setCameraOff(next);
      setActiveCallType(next ? 'audio' : 'video');
      setErrorText('');
      setMediaNotice('');
    } catch (error) {
      if (pc.signalingState === 'have-local-offer') {
        await pc.setLocalDescription({ type: 'rollback' }).catch(() => {});
      }
      if (addedTrack) {
        if (cameraSenderRef.current) await cameraSenderRef.current.replaceTrack(null).catch(() => {});
        if (senderCreated) {
          const sender = pc.getSenders().find((item) => item.track?.id === addedTrack.id);
          if (sender) pc.removeTrack(sender);
          cameraSenderRef.current = null;
        }
        stream.removeTrack(addedTrack);
        addedTrack.stop();
      }
      if (removedTrack && removedTrack.readyState !== 'ended') {
        stream.addTrack(removedTrack);
        if (existingSender) await existingSender.replaceTrack(removedTrack).catch(() => {});
        else cameraSenderRef.current = pc.addTrack(removedTrack, stream);
      }
      remoteDescriptionReady.current = Boolean(pc.remoteDescription) || previousRemoteDescriptionReady;
      setLocalStream(stream);
      setCameraOff(cameraOff);
      setActiveCallType(activeCallType);
      setErrorText(error?.message || 'Could not switch call video. Your audio call is still active.');
    } finally {
      cameraSwitchInProgressRef.current = false;
    }
  };
  const switchCamera = async () => {
    if (cameraSwitchInProgressRef.current || cameraOff || !activeRef.current) return;
    const stream = localStreamRef.current;
    const pc = pcRef.current;
    const previousTrack = stream?.getVideoTracks?.()[0];
    if (!stream || !pc || !previousTrack) return;
    cameraSwitchInProgressRef.current = true;
    let nextTrack = null;
    let sender = null;
    const nextFacingMode = cameraFacingModeRef.current === 'user' ? 'environment' : 'user';
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: nextFacingMode }, width: { ideal: 960 }, height: { ideal: 540 }, frameRate: { ideal: 24 } },
      });
      nextTrack = cameraStream.getVideoTracks?.()[0];
      if (!nextTrack) throw new Error('The selected camera is unavailable.');
      sender = cameraSenderRef.current || pc.getSenders().find((item) => item.track?.kind === 'video');
      if (!sender) throw new Error('The call camera is not ready yet.');
      await sender.replaceTrack(nextTrack);
      stream.removeTrack(previousTrack);
      stream.addTrack(nextTrack);
      previousTrack.stop();
      cameraSenderRef.current = sender;
      cameraFacingModeRef.current = nextFacingMode;
      localStreamRef.current = stream;
      setLocalStream(stream);
      setErrorText('');
      setMediaNotice('');
    } catch (error) {
      if (nextTrack && sender) await sender.replaceTrack(previousTrack).catch(() => {});
      nextTrack?.stop?.();
      setErrorText(error?.message || 'Could not switch cameras. Your current camera remains active.');
    } finally {
      cameraSwitchInProgressRef.current = false;
    }
  };
  const control = (icon, label, action, active = false, danger = false) => (
    <TouchableOpacity key={label} onPress={action} accessibilityRole="button" accessibilityLabel={label}
      style={[styles.control, { backgroundColor: danger ? colors.danger : active ? colors.primary : immersiveVideo ? 'rgba(255,255,255,0.13)' : colors.surfaceAlt, borderColor: immersiveVideo ? 'transparent' : colors.border, borderWidth: immersiveVideo ? 0 : 1 }]}>
      <Ionicons name={icon} size={23} color={danger ? colors.onDanger : active ? colors.onPrimary : foreground} />
      <Text style={[typography.small, styles.controlLabel, { color: danger ? colors.onDanger : active ? colors.onPrimary : foreground }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={[styles.safe, { backgroundColor: immersiveVideo ? '#11101A' : colors.background }]}>
      <StatusBar barStyle={!immersiveVideo && resolvedMode === 'light' ? 'dark-content' : 'light-content'} />
      {React.createElement('audio', {
        ref: remoteAudioRef, autoPlay: true, playsInline: true,
        style: { display: 'none' },
      })}
      {remoteVideoActive && remoteStream ? React.createElement('video', {
        ref: remoteVideoRef, autoPlay: true, playsInline: true, muted: true,
        style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#11101A' },
      }) : null}
      {activeCallType === 'video' && localStream && !cameraOff ? React.createElement('video', {
        ref: localVideoRef, autoPlay: true, playsInline: true, muted: true,
        style: { position: 'absolute', right: 16, top: 76, width: 112, height: 160, objectFit: 'cover', borderRadius: 18, zIndex: 2, backgroundColor: '#242133' },
      }) : null}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => endCall('ended')} accessibilityRole="button" accessibilityLabel="Close call">
          <Ionicons name="chevron-down" size={26} color={foreground} />
        </TouchableOpacity>
        <View style={[styles.encryption, { backgroundColor: immersiveVideo ? 'rgba(255,255,255,0.08)' : colors.surface, borderColor: colors.border, borderWidth: 1 }]}><Ionicons name="lock-closed" size={12} color={colors.accent} /><Text style={[typography.small, styles.encryptionText, { color: secondaryForeground }]}>Encrypted media transport</Text></View>
        {phase === 'Connected' && call?.status === 'accepted'
          ? <TouchableOpacity onPress={() => setInvitePickerVisible(true)} accessibilityRole="button" accessibilityLabel="Add people to call" style={styles.addPeopleButton}><Ionicons name="person-add" size={21} color={foreground} /></TouchableOpacity>
          : <View style={{ width: 26 }} />}
      </View>
      <View style={styles.identity}>
        {!remoteVideoActive ? <Avatar name={participantName} color={avatarColor || colors.primary} size={108} /> : null}
        <Text numberOfLines={2} style={[typography.display, styles.name, { color: foreground, maxWidth: '100%', paddingHorizontal: 8 }]}>{participantName}</Text>
        <Text style={[typography.body, styles.phase, { color: secondaryForeground }]}>{phase === 'Connected' ? formatCallDuration(seconds) : phase}</Text>
        {networkNotice ? <Text style={[typography.small, styles.networkNotice, { color: immersiveVideo ? '#F2D28B' : colors.warning }]}>{networkNotice}</Text> : null}
        {audioPlaybackBlocked && remoteStream ? <TouchableOpacity onPress={playRemoteMedia} accessibilityRole="button" accessibilityLabel="Enable call audio" style={[styles.retry, { backgroundColor: colors.primary, borderRadius: 12 }]}><Text style={[typography.small, { color: colors.onPrimary, fontWeight: '800' }]}>Tap to hear audio</Text></TouchableOpacity> : null}
        {errorText ? <Text style={[typography.small, styles.error, { color: immersiveVideo ? '#FFB8C0' : colors.danger }]}>{errorText}</Text> : null}
        {mediaNotice ? <Text style={[typography.small, styles.error, { color: immersiveVideo ? '#F2D28B' : colors.warning }]}>{mediaNotice}</Text> : null}
        {phase !== 'Connected' && phase !== 'Unavailable' && !isTerminalCallStatus(call?.status) ? <ActivityIndicator style={{ marginTop: 18 }} color={immersiveVideo ? '#FFFFFF' : colors.primary} /> : null}
      </View>
      <View style={styles.bottom}>
        <View style={[styles.controlsRow, { backgroundColor: immersiveVideo ? 'rgba(12,12,22,0.72)' : colors.surface, borderColor: immersiveVideo ? 'rgba(255,255,255,0.12)' : colors.border }]}>
          {control(muted ? 'mic-off' : 'mic', muted ? 'Unmute' : 'Mute', toggleMute, muted)}
          {control(cameraOff ? 'videocam-off' : 'videocam', cameraOff ? 'Switch to video' : 'Switch to audio', toggleCamera, cameraOff)}
          {activeCallType === 'video' ? control('camera-reverse', 'Flip camera', switchCamera) : null}
        </View>
        <TouchableOpacity onPress={() => endCall('ended')} accessibilityRole="button" accessibilityLabel="End call" style={[styles.endButton, { backgroundColor: colors.danger }]}>
          <Ionicons name="call" size={27} color={colors.onDanger} style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>
      {call?.id ? (
        <CallInvitePicker
          visible={invitePickerVisible}
          onClose={() => setInvitePickerVisible(false)}
          title="Add people to call"
          conversationId={call.conversation_id || conversationId}
          filterToConversationMembers={false}
          excludeIds={[call.caller_id, call.callee_id]}
          onInvite={async (person) => {
            const activeCall = callRef.current || call;
            const result = await backendFetch(`/group-calls/upgrade/${activeCall.id}`, {
              method: 'POST',
              body: JSON.stringify({ userIds: [person.id], callType: activeCallType }),
            });
            if (!result?.room?.id) throw new Error('Could not upgrade this call to a conference.');
            await navigateToConference(result.room, result);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#11101A' },
  topBar: { paddingHorizontal: 22, paddingTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addPeopleButton: { width: 48, height: 48, minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  encryption: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 18, paddingVertical: 7, paddingHorizontal: 11, backgroundColor: 'rgba(255,255,255,0.08)' },
  encryptionText: {},
  identity: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  name: { marginTop: 24, textAlign: 'center' },
  phase: { marginTop: 9 },
  networkNotice: { textAlign: 'center', marginTop: 12, maxWidth: 320 },
  error: { textAlign: 'center', marginTop: 16, maxWidth: 320 },
  bottom: { paddingHorizontal: 22, paddingBottom: 28, alignItems: 'center' },
  controlsRow: { width: '100%', maxWidth: 340, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', columnGap: 8, rowGap: 8, padding: 10, borderRadius: 28, borderWidth: 1, marginBottom: 20 },
  control: { width: 64, minWidth: 64, height: 68, minHeight: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', gap: 4 },
  controlLabel: {},
  endButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#E4475A', alignItems: 'center', justifyContent: 'center' },
});
