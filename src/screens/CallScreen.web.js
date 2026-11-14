import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
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
  const [seconds, setSeconds] = useState(0);
  const [errorText, setErrorText] = useState('');
  const [networkNotice, setNetworkNotice] = useState('');
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const callRef = useRef(initial);
  const activeRef = useRef(true);
  const remoteDescriptionReady = useRef(false);
  const queuedIce = useRef([]);
  const seenSignals = useRef(new Set());
  const connectedAtRef = useRef(null);
  const offerStartedRef = useRef(false);
  const iceRestartInProgressRef = useRef(false);

  const activeCallType = call?.call_type || callType;
  const immersiveVideo = activeCallType === 'video';
  const foreground = immersiveVideo ? '#FFFFFF' : colors.textPrimary;
  const secondaryForeground = immersiveVideo ? '#C4C2D2' : colors.textSecondary;

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play?.().catch(() => {});
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play?.().catch(() => {});
    }
  }, [localStream, cameraOff]);

  const endCall = useCallback(async (reason = 'ended') => {
    const current = callRef.current;
    if (current?.id && ['ringing', 'accepted'].includes(current.status)) {
      const nextStatus = getCallEndStatus({ reason, isCaller, status: current.status });
      await updateCallStatus(current.id, nextStatus).catch(() => {});
    }
    navigation.goBack();
  }, [isCaller, navigation]);

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
        if (signal.signal_type === 'offer' && !isCaller) {
          await pc.setRemoteDescription(new window.RTCSessionDescription(signal.payload));
          remoteDescriptionReady.current = true;
          for (const candidate of queuedIce.current.splice(0)) await pc.addIceCandidate(new window.RTCIceCandidate(candidate));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendCallSignal({ call: callRef.current, type: 'answer', payload: { type: answer.type, sdp: answer.sdp } });
          setPhase('Connecting…');
        } else if (signal.signal_type === 'answer' && isCaller) {
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
        .select('id,conversation_id,caller_id,callee_id,call_type,status,created_at,accepted_at,ended_at,expires_at')
        .eq('id', callRef.current.id).maybeSingle();
      if (liveCallError || !liveCall || (isCaller ? !['ringing', 'accepted'].includes(liveCall.status) : liveCall.status !== 'accepted')) {
        throw new Error('This call is no longer available. Please start or answer the call again.');
      }
      callRef.current = liveCall;
      if (activeRef.current) setCall(liveCall);

      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: liveCall.call_type === 'video' ? { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 540 }, frameRate: { ideal: 24 } } : false,
      });
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
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      pc.ontrack = (event) => {
        const nextStream = event.streams?.[0];
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
          iceRestartInProgressRef.current = false;
          setErrorText('');
          return;
        }

        if (
          (state === 'disconnected' || state === 'failed') &&
          isCaller &&
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
        if (!isCaller || currentStatus !== 'accepted' || !signalingReady || offerStartedRef.current || !pc || !activeRef.current) return;
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
        if (!activeRef.current || !next) return;
        currentStatus = next.status;
        callRef.current = next;
        setCall(next);
        if (next.status === 'accepted') {
          setPhase('Connecting…');
          maybeStartOffer();
        } else if (isTerminalCallStatus(next.status)) {
          setPhase(next.status === 'declined' ? 'Call declined' : next.status === 'missed' ? 'No answer' : 'Call ended');
          setTimeout(() => { if (activeRef.current) navigation.goBack(); }, 700);
        }
      }, async () => {
        if (!supabase || !activeRef.current) return;
        const { data } = await supabase.from('call_sessions')
          .select('id,conversation_id,caller_id,callee_id,call_type,status,created_at,accepted_at,ended_at,expires_at')
          .eq('id', liveCall.id).maybeSingle();
        if (data && activeRef.current) {
          currentStatus = data.status;
          callRef.current = data;
          setCall(data);
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
      unsubscribeSignals();
      unsubscribeSession();
      try { pc?.close(); } catch (_) {}
      try { stream?.getTracks?.().forEach((track) => track.stop()); } catch (_) {}
      pcRef.current = null;
      localStreamRef.current = null;
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
  const toggleCamera = () => {
    const next = !cameraOff;
    localStreamRef.current?.getVideoTracks?.().forEach((track) => { track.enabled = !next; });
    setCameraOff(next);
  };
  const control = (icon, label, action, active = false, danger = false) => (
    <TouchableOpacity key={label} onPress={action} accessibilityRole="button" accessibilityLabel={label}
      style={[styles.control, { backgroundColor: danger ? colors.danger : active ? colors.primary : immersiveVideo ? 'rgba(255,255,255,0.13)' : colors.surfaceAlt, borderColor: immersiveVideo ? 'transparent' : colors.border, borderWidth: immersiveVideo ? 0 : 1 }]}>
      <Ionicons name={icon} size={23} color={danger ? colors.onDanger : active ? colors.onPrimary : foreground} />
      <Text style={[typography.small, styles.controlLabel, { color: danger ? colors.onDanger : active ? colors.onPrimary : foreground }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: immersiveVideo ? '#11101A' : colors.background }]}>
      <StatusBar barStyle={!immersiveVideo && resolvedMode === 'light' ? 'dark-content' : 'light-content'} />
      {activeCallType === 'video' && remoteStream ? React.createElement('video', {
        ref: remoteVideoRef, autoPlay: true, playsInline: true,
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
        <View style={{ width: 26 }} />
      </View>
      <View style={styles.identity}>
        {!(activeCallType === 'video' && remoteStream) ? <Avatar name={participantName} color={avatarColor || colors.primary} size={108} /> : null}
        <Text style={[typography.display, styles.name, { color: foreground }]}>{participantName}</Text>
        <Text style={[typography.body, styles.phase, { color: secondaryForeground }]}>{phase === 'Connected' ? formatCallDuration(seconds) : phase}</Text>
        {networkNotice ? <Text style={[typography.small, styles.networkNotice, { color: immersiveVideo ? '#F2D28B' : colors.warning }]}>{networkNotice}</Text> : null}
        {errorText ? <Text style={[typography.small, styles.error, { color: immersiveVideo ? '#FFB8C0' : colors.danger }]}>{errorText}</Text> : null}
        {phase !== 'Connected' && phase !== 'Unavailable' && !isTerminalCallStatus(call?.status) ? <ActivityIndicator style={{ marginTop: 18 }} color={immersiveVideo ? '#FFFFFF' : colors.primary} /> : null}
      </View>
      <View style={styles.bottom}>
        <View style={styles.controlsRow}>
          {control(muted ? 'mic-off' : 'mic', muted ? 'Unmute' : 'Mute', toggleMute, muted)}
          {activeCallType === 'video' ? control(cameraOff ? 'videocam-off' : 'videocam', cameraOff ? 'Camera on' : 'Camera off', toggleCamera, cameraOff) : null}
        </View>
        <TouchableOpacity onPress={() => endCall('ended')} accessibilityRole="button" accessibilityLabel="End call" style={[styles.endButton, { backgroundColor: colors.danger }]}>
          <Ionicons name="call" size={27} color={colors.onDanger} style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#11101A' },
  topBar: { paddingHorizontal: 22, paddingTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  encryption: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 18, paddingVertical: 7, paddingHorizontal: 11, backgroundColor: 'rgba(255,255,255,0.08)' },
  encryptionText: {},
  identity: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  name: { marginTop: 24, textAlign: 'center' },
  phase: { marginTop: 9 },
  networkNotice: { textAlign: 'center', marginTop: 12, maxWidth: 320 },
  error: { textAlign: 'center', marginTop: 16, maxWidth: 340 },
  bottom: { paddingHorizontal: 22, paddingBottom: 28, alignItems: 'center' },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 28 },
  control: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center', gap: 4 },
  controlLabel: {},
  endButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#E4475A', alignItems: 'center', justifyContent: 'center' },
});
