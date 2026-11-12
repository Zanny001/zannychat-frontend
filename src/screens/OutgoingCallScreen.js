import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../utils/color';
import { isTerminalCallStatus } from '../utils/callPolicy';
import { subscribeToCallSession, updateCallStatus } from '../services/calls';
import { supabase } from '../services/supabaseClient';
import { startCallTone, stopCallTone } from '../services/callAudio';
import { endNativeCall } from '../services/nativeCallSystem';

export default function OutgoingCallScreen({ route, navigation }) {
  const { call: initialCall, callType = 'audio', participantName = 'ZannyChat contact', avatarColor = '#6C5CE7' } = route.params || {};
  const { colors, resolvedMode } = useTheme();
  const [call, setCall] = useState(initialCall);
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil((new Date(initialCall?.expires_at || Date.now()).getTime() - Date.now()) / 1000)));
  const [statusText, setStatusText] = useState(callType === 'video' ? 'Calling with video…' : 'Calling…');
  const [busy, setBusy] = useState(false);
  const activeRef = useRef(true);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!initialCall?.id || initialCall.status !== 'ringing' || new Date(initialCall.expires_at).getTime() <= Date.now()) return undefined;
    activeRef.current = true;
    startCallTone('outgoing');
    let unsubscribe = () => {};
    let timeout;
    const finish = (next) => {
      if (!activeRef.current || completedRef.current || !next) return;
      setCall(next);
      if (next.status === 'accepted') {
        stopCallTone();
        completedRef.current = true;
        navigation.replace('Call', { call: next, callType: next.call_type, isCaller: true, participantName, avatarColor, nativeCallId: initialCall.nativeCallId });
      } else if (isTerminalCallStatus(next.status)) {
        stopCallTone();
        if (initialCall.nativeCallId) endNativeCall(initialCall.nativeCallId).catch(() => {});
        completedRef.current = true;
        setStatusText(next.status === 'declined' ? 'Call declined' : next.status === 'missed' ? 'No answer' : 'Call ended');
        timeout = setTimeout(() => { if (activeRef.current) navigation.goBack(); }, 800);
      }
    };
    unsubscribe = subscribeToCallSession(initialCall.id, finish, async () => {
      if (!supabase || !activeRef.current) return;
      const { data } = await supabase.from('call_sessions').select('id,conversation_id,caller_id,callee_id,call_type,status,created_at,accepted_at,ended_at,expires_at').eq('id', initialCall.id).maybeSingle();
      if (data) finish(data);
    });
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((new Date(initialCall.expires_at).getTime() - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0 && !completedRef.current) {
        completedRef.current = true;
        stopCallTone();
        setStatusText('No answer');
        updateCallStatus(initialCall.id, 'missed').catch(() => {}).finally(() => {
          if (initialCall.nativeCallId) endNativeCall(initialCall.nativeCallId).catch(() => {});
          if (activeRef.current) navigation.goBack();
        });
      }
    }, 1000);
    return () => { activeRef.current = false; clearInterval(timer); if (timeout) clearTimeout(timeout); unsubscribe(); stopCallTone(); };
  }, [initialCall?.id, initialCall?.expires_at, navigation, participantName, avatarColor]);

  const cancel = async () => {
    if (busy || completedRef.current) return;
    stopCallTone();
    setBusy(true);
    completedRef.current = true;
    try { await updateCallStatus(initialCall.id, 'cancelled'); } catch (_) {}
    if (initialCall.nativeCallId) endNativeCall(initialCall.nativeCallId).catch(() => {});
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={resolvedMode === 'light' ? 'dark-content' : 'light-content'} />
      <View style={[styles.glow, { backgroundColor: hexToRgba(colors.primary, 0.14) }]} />
      <View style={styles.top}>
        <View style={[styles.brandMark, { backgroundColor: colors.primary, shadowColor: colors.primary }]}><Ionicons name="chatbubbles" size={19} color={colors.onPrimary} /></View>
        <Text style={[styles.brand, { color: colors.textPrimary }]}>ZannyChat</Text>
        <View style={styles.secure}><Ionicons name="lock-closed" size={12} color={colors.accent} /><Text style={[styles.secureText, { color: colors.textSecondary }]}>Encrypted media transport</Text></View>
      </View>
      <View style={styles.person}>
        <View style={[styles.avatarRing, { borderColor: hexToRgba(colors.primary, 0.42), backgroundColor: hexToRgba(colors.surface, 0.55), shadowColor: colors.primary }]}><Avatar name={participantName} color={avatarColor} size={112} /></View>
        <Text style={[styles.name, { color: colors.textPrimary }]}>{participantName}</Text>
        <Text style={[styles.kind, { color: colors.textSecondary }]}>{callType === 'video' ? 'Video call' : 'Audio call'}</Text>
        <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 18 }} />
        <Text style={[styles.status, { color: colors.textPrimary }]}>{statusText}</Text>
        <Text style={[styles.countdown, { color: colors.textSecondary }]}>{remaining > 0 ? `Invitation expires in ${remaining}s` : 'Invitation expired'}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={cancel} disabled={busy} accessibilityRole="button" accessibilityLabel="Cancel outgoing call" style={[styles.cancelButton, { backgroundColor: colors.danger, shadowColor: colors.danger }]}>
          {busy ? <ActivityIndicator color={colors.onDanger} /> : <Ionicons name="call" size={27} color={colors.onDanger} style={{ transform: [{ rotate: '135deg' }] }} />}
        </TouchableOpacity>
        <Text style={[styles.cancelLabel, { color: colors.textSecondary }]}>Cancel call</Text>
      </View>
      <Text style={[styles.footer, { color: colors.textSecondary }]}>Your microphone and camera stay off until the other person answers.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 26, overflow: 'hidden' },
  glow: { position: 'absolute', top: 140, left: -90, right: -90, height: 340, borderRadius: 220 },
  top: { alignItems: 'center', paddingTop: 28, gap: 8 },
  brandMark: { width: 42, height: 42, borderRadius: 15, backgroundColor: '#6C5CE7', alignItems: 'center', justifyContent: 'center' },
  brand: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: 0.3 },
  secure: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  secureText: { color: '#A8A6B8', fontSize: 12 },
  person: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarRing: { padding: 8, borderWidth: 1, borderRadius: 72, shadowOpacity: 0.28, shadowRadius: 22, shadowOffset: { width: 0, height: 7 }, elevation: 6 },
  name: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', marginTop: 28, textAlign: 'center' },
  kind: { color: '#C8C5D8', fontSize: 15, marginTop: 9 },
  status: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', marginTop: 13 },
  countdown: { color: '#8F8C9F', fontSize: 12, marginTop: 10 },
  actions: { alignItems: 'center', paddingBottom: 18 },
  cancelButton: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  cancelLabel: { color: '#D9D7E4', fontSize: 12, fontWeight: '600', marginTop: 10 },
  footer: { color: '#8F8C9F', textAlign: 'center', fontSize: 11, paddingBottom: 18, lineHeight: 16 },
});
