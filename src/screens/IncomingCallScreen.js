import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import { isTerminalCallStatus } from '../utils/callPolicy';
import { subscribeToCallSession, updateCallStatus } from '../services/calls';
import { startCallTone, stopCallTone } from '../services/callAudio';
import { answerNativeCall, endNativeCall } from '../services/nativeCallSystem';

export default function IncomingCallScreen({ route, navigation }) {
  const { call, participantName = 'ZannyChat contact', avatarColor = '#6C5CE7', autoAnswer = false, nativeCallId = null } = route.params || {};
  const [busy, setBusy] = useState(false);
  const closingRef = useRef(false);
  const autoAnswerHandledRef = useRef(false);
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil((new Date(call?.expires_at || Date.now()).getTime() - Date.now()) / 1000)));

  useEffect(() => {
    if (!call?.id || call.status !== 'ringing' || new Date(call.expires_at).getTime() <= Date.now()) return undefined;
    let active = true;
    if (!nativeCallId) {
      startCallTone();
      if (Platform.OS === 'android') Vibration.vibrate([0, 900, 600], true);
      else Vibration.vibrate();
    }
    const unsubscribe = subscribeToCallSession(call.id, (next) => {
      if (active && isTerminalCallStatus(next.status) && !closingRef.current) { stopCallTone(); Vibration.cancel(); closingRef.current = true; navigation.goBack(); }
    });
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((new Date(call.expires_at).getTime() - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0 && !closingRef.current) {
        stopCallTone(); Vibration.cancel();
        closingRef.current = true;
        clearInterval(timer);
        updateCallStatus(call.id, 'missed').catch(() => {}).finally(() => {
          if (nativeCallId) endNativeCall(nativeCallId).catch(() => {});
          if (active) navigation.goBack();
        });
      }
    }, 1000);
    return () => { active = false; clearInterval(timer); unsubscribe(); if (!nativeCallId) stopCallTone(); Vibration.cancel(); };
  }, [call?.id, call?.expires_at, navigation, nativeCallId]);

  const decline = async () => {
    if (busy || closingRef.current) return;
    if (!nativeCallId) stopCallTone();
    Vibration.cancel();
    closingRef.current = true;
    setBusy(true);
    try { await updateCallStatus(call.id, 'declined'); } catch (_) {}
    if (nativeCallId) endNativeCall(nativeCallId).catch(() => {});
    navigation.goBack();
  };

  const answer = async () => {
    if (busy || closingRef.current) return;
    if (!nativeCallId) stopCallTone();
    Vibration.cancel();
    setBusy(true);
    if (nativeCallId) {
      answerNativeCall(nativeCallId).catch((error) => {
        console.warn('[calls] native answer action failed:', error?.message || error);
        setBusy(false);
      });
      return;
    }
    try {
      const accepted = await updateCallStatus(call.id, 'accepted');
      if (accepted.status !== 'accepted') throw new Error('Call expired');
      closingRef.current = true;
      navigation.replace('Call', { call: accepted, callType: call.call_type, isCaller: false, participantName, avatarColor });
    } catch (_) {
      closingRef.current = true;
      setBusy(false);
      navigation.goBack();
    }
  };

  useEffect(() => {
    if (!autoAnswer || !call?.id || autoAnswerHandledRef.current) return;
    autoAnswerHandledRef.current = true;
    answer();
  }, [autoAnswer, call?.id]);

  const isVideo = call?.call_type === 'video';
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <View style={styles.glow} />
      <View style={styles.top}>
        <View style={styles.brandMark}><Ionicons name="chatbubbles" size={19} color="#FFFFFF" /></View>
        <Text style={styles.brand}>ZannyChat</Text>
        <Text style={styles.secure}><Ionicons name="lock-closed" size={12} color="#9FE5C0" />  Private call invitation</Text>
      </View>
      <View style={styles.person}>
        <View style={styles.avatarRing}><Avatar name={participantName} color={avatarColor} size={112} /></View>
        <Text style={styles.name}>{participantName}</Text>
        <Text style={styles.callKind}>{isVideo ? 'Incoming video call' : 'Incoming audio call'}</Text>
        <View style={styles.statusPill}><View style={styles.liveDot} /><Text style={styles.statusText}>{remaining > 0 ? `Ringing · ${remaining}s` : 'Call expired'}</Text></View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={decline} disabled={busy} accessibilityRole="button" accessibilityLabel="Decline call" style={[styles.action, styles.decline]}>
          <Ionicons name="call" size={28} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
          <Text style={styles.actionText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={answer} disabled={busy || remaining <= 0} accessibilityRole="button" accessibilityLabel="Answer call" style={[styles.action, styles.answer, (busy || remaining <= 0) && styles.disabled]}>
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name={isVideo ? 'videocam' : 'call'} size={28} color="#FFFFFF" />}
          <Text style={styles.actionText}>Answer</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.footer}>Your microphone and camera activate only after you answer.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#12101B', paddingHorizontal: 26, overflow: 'hidden' },
  glow: { position: 'absolute', top: 140, left: -90, right: -90, height: 340, borderRadius: 220, backgroundColor: 'rgba(108,92,231,0.13)' },
  top: { alignItems: 'center', paddingTop: 28, gap: 8 },
  brandMark: { width: 42, height: 42, borderRadius: 15, backgroundColor: '#6C5CE7', alignItems: 'center', justifyContent: 'center' },
  brand: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: 0.3 },
  secure: { color: '#A8A6B8', fontSize: 12, marginTop: 8 },
  person: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarRing: { padding: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 72, backgroundColor: 'rgba(255,255,255,0.04)' },
  name: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', marginTop: 28, textAlign: 'center' },
  callKind: { color: '#C8C5D8', fontSize: 15, marginTop: 9 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 19, paddingVertical: 8, paddingHorizontal: 13, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.07)' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#70D9A4' },
  statusText: { color: '#D9D7E4', fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', paddingBottom: 25 },
  action: { width: 84, height: 84, borderRadius: 30, alignItems: 'center', justifyContent: 'center', gap: 6 },
  decline: { backgroundColor: '#E4475A' },
  answer: { backgroundColor: '#24A56A' },
  disabled: { opacity: 0.5 },
  actionText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  footer: { color: '#8F8C9F', textAlign: 'center', fontSize: 11, paddingBottom: 18, lineHeight: 16 },
});
