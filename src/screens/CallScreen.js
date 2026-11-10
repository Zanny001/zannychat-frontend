import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter, ActivityIndicator, Alert, Platform, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RTCView, mediaDevices, RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } from '@livekit/react-native-webrtc';
import { useTheme } from '../theme/ThemeContext';
import Avatar from '../components/Avatar';
import { sendCallSignal, subscribeToCallSession, subscribeToCallSignals, updateCallStatus } from '../services/calls';
import { backendFetch } from '../services/backendClient';
import { endNativeCall, failNativeIncomingConnected, fulfillNativeIncomingConnected, reportNativeCallEnded, reportNativeOutgoingConnected, setAudioSessionPortOverride, setNativeMuted, setRTCAudioSessionConfiguration } from '../services/nativeCallSystem';
import { supabase } from '../services/supabaseClient';
import { formatCallDuration, getCallEndStatus, isTerminalCallStatus } from '../utils/callPolicy';
import { getIceNetworkNotice } from '../utils/callNetworkStatus';

const FALLBACK_ICE_SERVERS = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

export default function CallScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { call: initialCall, callId, conversationId, callType = 'audio', isCaller = false, participantName = 'ZannyChat contact', avatarColor, nativeCallId = null, nativeRequestId = null } = route.params || {};
  const [call, setCall] = useState(initialCall || { id: callId, conversation_id: conversationId, call_type: callType, status: isCaller ? 'ringing' : 'accepted' });
  const [phase, setPhase] = useState(isCaller ? 'Calling…' : 'Connecting…');
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(callType !== 'video');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const connectedAtRef = useRef(null);
  const [errorText, setErrorText] = useState('');
  const [networkNotice, setNetworkNotice] = useState('');
  const pcRef = useRef(null);
  const localRef = useRef(null);
  const remoteDescriptionReady = useRef(false);
  const queuedIce = useRef([]);
  const seenSignals = useRef(new Set());
  const offerStarted = useRef(false);
  const iceRestartInProgress = useRef(false);
  const activeRef = useRef(true);
  const nativeConnectedRef = useRef(false);
  const nativeEndedRef = useRef(false);
  const callIdRef = useRef(initialCall?.id || callId);
  const callRef = useRef(initialCall || { id: callId, conversation_id: conversationId, call_type: callType, status: isCaller ? 'ringing' : 'accepted' });
  const callTypeRef = useRef(initialCall?.call_type || callType);

  const endCall = useCallback(async (reason = 'ended') => {
    try {
      const current = call;
      if (current?.id && ['ringing', 'accepted'].includes(current.status)) {
        const status = getCallEndStatus({ reason, isCaller, status: current.status });
        if (nativeCallId) endNativeCall(nativeCallId).catch(() => {});
        await updateCallStatus(current.id, status).catch(() => {});
      }
    } finally {
      navigation.goBack();
    }
  }, [call, isCaller, navigation, nativeCallId]);

  useEffect(() => {
    activeRef.current = true;
    let unsubscribeSignals = () => {};
    let unsubscribeSession = () => {};
    let mountedStream;
    let pc;
    let signalingReady = false;
    let currentStatus = call?.status;
    let maybeStartOffer = async () => {};

    const run = async () => {
      if (Platform.OS === 'web') throw new Error('Calling is currently supported in the native Android/iOS app build, not the web preview.');
      if (!callIdRef.current) throw new Error('Call session is missing. Please start the call again.');
      if (!supabase) throw new Error('Sign in to ZannyChat before starting a call.');
      const { data: liveCall, error: liveCallError } = await supabase.from('call_sessions').select('id,conversation_id,caller_id,callee_id,call_type,status,created_at,accepted_at,ended_at,expires_at').eq('id', callIdRef.current).maybeSingle();
      if (liveCallError || !liveCall || (isCaller ? !['ringing', 'accepted'].includes(liveCall.status) : liveCall.status !== 'accepted')) throw new Error('This call is no longer available. Please start or answer the call again.');
      callRef.current = liveCall;
      if (activeRef.current) setCall(liveCall);
      setRTCAudioSessionConfiguration(callTypeRef.current === 'video');
      const stream = await mediaDevices.getUserMedia({ audio: true, video: callTypeRef.current === 'video' ? { facingMode: 'user', width: 960, height: 540, frameRate: 24 } : false });
      mountedStream = stream;
      localRef.current = stream;
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
      pc = new RTCPeerConnection({ iceServers, iceCandidatePoolSize: 4 });
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      pc.ontrack = (event) => {
        const next = event.streams?.[0];
        if (next && activeRef.current) setRemoteStream(next);
      };
      pc.onicecandidate = (event) => {
        if (event.candidate && activeRef.current && callRef.current) {
          sendCallSignal({ call: callRef.current, type: 'ice-candidate', payload: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate })
            .catch(() => { if (activeRef.current) setErrorText('Network signaling interrupted. Check your connection.'); });
        }
      };
      pc.onconnectionstatechange = () => {
        if (!activeRef.current) return;
        const state = pc.connectionState;
        if (state === 'connected') {
          connectedAtRef.current = connectedAtRef.current || Date.now();
          setPhase('Connected');
          if (nativeCallId && !nativeConnectedRef.current) {
            nativeConnectedRef.current = true;
            if (isCaller) reportNativeOutgoingConnected(nativeCallId).catch(() => {});
            else if (nativeRequestId) fulfillNativeIncomingConnected(nativeRequestId).catch(() => {});
          }
        }
        else if (state === 'connecting') setPhase('Connecting…');
        else if (state === 'disconnected') setPhase('Reconnecting…');
        else if (state === 'failed') setErrorText('Connection failed. Trying to restore the media route…');
      };
      pc.oniceconnectionstatechange = async () => {
        if (!activeRef.current) return;
        const state = pc.iceConnectionState;
        if (state === 'connected' || state === 'completed') {
          iceRestartInProgress.current = false;
          setErrorText('');
          return;
        }
        if ((state === 'disconnected' || state === 'failed') && isCaller && currentStatus === 'accepted' && !iceRestartInProgress.current) {
          iceRestartInProgress.current = true;
          try {
            pc.restartIce?.();
            const restartOffer = await pc.createOffer({ iceRestart: true });
            await pc.setLocalDescription(restartOffer);
            await sendCallSignal({ call: callRef.current, type: 'offer', payload: { type: restartOffer.type, sdp: restartOffer.sdp } });
            if (activeRef.current) setPhase('Reconnecting…');
          } catch (_) {
            iceRestartInProgress.current = false;
            if (activeRef.current) setErrorText('Unable to restore the call. Check your network and try again.');
          }
        }
      };

      const processSignal = async (signal) => {
        if (!activeRef.current || !signal?.id || seenSignals.current.has(signal.id)) return;
        seenSignals.current.add(signal.id);
        if (signal.sender_id === (isCaller ? call?.caller_id : call?.callee_id)) return;
        try {
          if (signal.signal_type === 'offer' && !isCaller) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
            remoteDescriptionReady.current = true;
            for (const candidate of queuedIce.current.splice(0)) await pc.addIceCandidate(new RTCIceCandidate(candidate));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendCallSignal({ call: callRef.current, type: 'answer', payload: { type: answer.type, sdp: answer.sdp } });
            if (activeRef.current) setPhase('Connecting…');
          } else if (signal.signal_type === 'answer' && isCaller) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
            remoteDescriptionReady.current = true;
            for (const candidate of queuedIce.current.splice(0)) await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } else if (signal.signal_type === 'ice-candidate') {
            if (remoteDescriptionReady.current && pc.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(signal.payload));
            else queuedIce.current.push(signal.payload);
          }
        } catch (_) {
          if (activeRef.current) setErrorText('Could not establish a secure media connection. Please try again.');
        }
      };

      maybeStartOffer = async () => {
        if (!isCaller || currentStatus !== 'accepted' || !signalingReady || offerStarted.current || !pc || !activeRef.current) return;
        offerStarted.current = true;
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await sendCallSignal({ call: callRef.current, type: 'offer', payload: { type: offer.type, sdp: offer.sdp } });
          if (activeRef.current) setPhase('Calling…');
        } catch (_) {
          offerStarted.current = false;
          if (activeRef.current) setErrorText('Could not start the call. Please try again.');
        }
      };
      unsubscribeSignals = subscribeToCallSignals(callIdRef.current, processSignal, async () => {
        // Subscribe first, then backfill to close the offer/ICE race.
        if (!supabase || !activeRef.current) return;
        const { data } = await supabase.from('call_signals').select('id,call_id,sender_id,recipient_id,signal_type,payload,created_at').eq('call_id', callIdRef.current).order('created_at', { ascending: true }).limit(250);
        for (const signal of data || []) await processSignal(signal);
        signalingReady = true;
        await maybeStartOffer();
      });
      const handleSessionUpdate = (next) => {
        if (!activeRef.current || !next) return;
        currentStatus = next.status;
        callRef.current = next;
        setCall(next);
        if (next.status === 'accepted') {
          setPhase('Connecting…');
          maybeStartOffer();
        } else if (isTerminalCallStatus(next.status)) {
          setPhase(next.status === 'declined' ? 'Call declined' : next.status === 'missed' ? 'No answer' : 'Call ended');
          if (nativeCallId && !nativeEndedRef.current) {
            nativeEndedRef.current = true;
            reportNativeCallEnded(nativeCallId, 'remoteEnded').catch(() => {});
          }
          setTimeout(() => { if (activeRef.current) navigation.goBack(); }, 700);
        }
      };
      unsubscribeSession = subscribeToCallSession(callIdRef.current, handleSessionUpdate, async () => {
        // Backfill after subscribing so a very fast answer cannot be missed.
        if (!supabase || !activeRef.current) return;
        const { data } = await supabase.from('call_sessions').select('id,conversation_id,caller_id,callee_id,call_type,status,created_at,accepted_at,ended_at,expires_at').eq('id', callIdRef.current).maybeSingle();
        if (data) handleSessionUpdate(data);
      });
      if (call?.status === 'accepted') setPhase('Connecting…');
    };

    run().catch(async (error) => {
      // If the call was already accepted, a media permission/device/setup error
      // must not strand an accepted session and block future calls for both users.
      const current = callRef.current || call;
      if (current?.id && current.status === 'accepted') {
        if (nativeRequestId) await failNativeIncomingConnected(nativeRequestId).catch(() => {});
        if (nativeCallId) await reportNativeCallEnded(nativeCallId, 'failed').catch(() => {});
        await updateCallStatus(current.id, 'ended').catch(() => {});
      }
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
      try { mountedStream?.getTracks?.().forEach((track) => track.stop()); } catch (_) {}
      pcRef.current = null;
      localRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isCaller || call?.status !== 'ringing' || !call?.id) return undefined;
    const timeout = setTimeout(() => {
      updateCallStatus(call.id, 'missed').catch(() => {});
      if (activeRef.current) setPhase('No answer');
    }, 60000);
    return () => clearTimeout(timeout);
  }, [isCaller, call?.id, call?.status]);

  useEffect(() => {
    if (phase !== 'Connected') return undefined;
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - (connectedAtRef.current || Date.now())) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [phase]);

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

  const toggleMute = () => {
    const next = !muted;
    localRef.current?.getAudioTracks?.().forEach((track) => { track.enabled = !next; });
    if (nativeCallId) setNativeMuted(nativeCallId, next).catch(() => {});
    setMuted(next);
  };
  const toggleSpeaker = () => {
    const next = !speakerOn;
    setAudioSessionPortOverride(next);
    setSpeakerOn(next);
  };
  useEffect(() => {
    if (!nativeCallId) return undefined;
    const subscription = DeviceEventEmitter.addListener('zannychat:native-call-muted', ({ id, isMuted }) => {
      if (id !== nativeCallId) return;
      localRef.current?.getAudioTracks?.().forEach((track) => { track.enabled = !isMuted; });
      setMuted(Boolean(isMuted));
    });
    return () => subscription.remove();
  }, [nativeCallId]);

  const toggleCamera = () => {
    const next = !cameraOff;
    localRef.current?.getVideoTracks?.().forEach((track) => { track.enabled = !next; });
    setCameraOff(next);
  };
  const switchCamera = () => {
    const track = localRef.current?.getVideoTracks?.()[0];
    if (track?._switchCamera) track._switchCamera();
  };
  const formatTime = formatCallDuration;
  const iconButton = (name, label, onPress, active = false, danger = false) => (
    <TouchableOpacity key={label} onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={[styles.control, { backgroundColor: danger ? '#E4475A' : active ? colors.primary : 'rgba(255,255,255,0.13)' }]}>
      <Ionicons name={name} size={23} color="#FFFFFF" />
      <Text style={styles.controlLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: '#11101A' }]}>
      <StatusBar barStyle="light-content" />
      {callType === 'video' && remoteStream ? <RTCView streamURL={remoteStream.toURL()} objectFit="cover" style={StyleSheet.absoluteFill} /> : null}
      {callType === 'video' && localStream && !cameraOff ? <RTCView streamURL={localStream.toURL()} mirror objectFit="cover" style={styles.localVideo} /> : null}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => endCall(isCaller && call?.status === 'ringing' ? 'cancelled' : 'ended')} accessibilityRole="button" accessibilityLabel="Close call"><Ionicons name="chevron-down" size={26} color="#FFFFFF" /></TouchableOpacity>
        <View style={styles.encryption}><Ionicons name="lock-closed" size={12} color="#A8E6C1" /><Text style={styles.encryptionText}>Encrypted media transport</Text></View>
        <View style={{ width: 26 }} />
      </View>
      <View style={styles.identity}>
        {!(callType === 'video' && remoteStream) ? <Avatar name={participantName} color={avatarColor || '#6C5CE7'} size={108} /> : null}
        <Text style={styles.name}>{participantName}</Text>
        <Text style={styles.phase}>{phase === 'Connected' ? formatTime(seconds) : phase}</Text>
        {networkNotice ? <Text style={styles.networkNotice}>{networkNotice}</Text> : null}
        {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
        {phase === 'Unavailable' ? <TouchableOpacity onPress={() => Alert.alert('Call unavailable', errorText || 'Please try again.')} style={styles.retry}><Text style={styles.retryText}>Call details</Text></TouchableOpacity> : null}
        {phase !== 'Connected' && phase !== 'Unavailable' ? <ActivityIndicator style={{ marginTop: 18 }} color="#FFFFFF" /> : null}
      </View>
      <View style={styles.bottom}>
        <View style={styles.controlsRow}>
          {iconButton(speakerOn ? 'volume-high' : 'volume-low', speakerOn ? 'Speaker' : 'Earpiece', toggleSpeaker, speakerOn)}
          {iconButton(muted ? 'mic-off' : 'mic', muted ? 'Unmute' : 'Mute', toggleMute, muted)}
          {callType === 'video' ? iconButton(cameraOff ? 'videocam-off' : 'videocam', cameraOff ? 'Camera on' : 'Camera off', toggleCamera, cameraOff) : null}
          {callType === 'video' ? iconButton('camera-reverse', 'Flip', switchCamera) : null}
        </View>
        <TouchableOpacity onPress={() => endCall(isCaller && call?.status === 'ringing' ? 'cancelled' : 'ended')} accessibilityRole="button" accessibilityLabel="End call" style={styles.endButton}>
          <Ionicons name="call" size={27} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: { paddingHorizontal: 22, paddingTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  encryption: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 18, paddingVertical: 7, paddingHorizontal: 11, backgroundColor: 'rgba(255,255,255,0.08)' },
  encryptionText: { color: '#C5C5D1', fontSize: 11, fontWeight: '600' },
  identity: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  name: { color: '#FFFFFF', fontSize: 27, fontWeight: '700', marginTop: 24, textAlign: 'center' },
  phase: { color: '#C4C2D2', fontSize: 15, marginTop: 9 },
  networkNotice: { color: '#F2D28B', fontSize: 12, textAlign: 'center', marginTop: 12, maxWidth: 320, lineHeight: 17 },
  error: { color: '#FFB8C0', fontSize: 13, textAlign: 'center', marginTop: 16, maxWidth: 290 },
  retry: { padding: 10, marginTop: 8 },
  retryText: { color: '#FFFFFF', fontWeight: '600' },
  localVideo: { position: 'absolute', right: 16, top: 76, width: 112, height: 160, borderRadius: 18, overflow: 'hidden', zIndex: 2 },
  bottom: { paddingHorizontal: 22, paddingBottom: 28, alignItems: 'center' },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 28 },
  control: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center', gap: 4 },
  controlLabel: { color: '#FFFFFF', fontSize: 10, fontWeight: '600' },
  endButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#E4475A', alignItems: 'center', justifyContent: 'center' },
});
