import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../utils/color';
import { SUPABASE_ENABLED, supabase } from '../services/supabaseClient';
import { getSessionSecurityInfo, signOutThisDevice, signOutEverywhere } from '../services/api';


function sessionDeviceLabel(userAgent) {
  const value = String(userAgent || '');
  const os = /Android/i.test(value) ? 'Android' : /iPhone|iPad|iPod/i.test(value) ? 'iOS' : /Windows/i.test(value) ? 'Windows' : /Mac OS X|Macintosh/i.test(value) ? 'macOS' : /Linux/i.test(value) ? 'Linux' : '';
  const browser = /Edg\//i.test(value) ? 'Edge' : /Firefox\//i.test(value) ? 'Firefox' : /Chrome\//i.test(value) ? 'Chrome' : /Safari\//i.test(value) ? 'Safari' : /ZannyChat/i.test(value) ? 'ZannyChat' : '';
  return [os, browser].filter(Boolean).join(' · ') || 'Other device';
}

function isMobileSession(userAgent) {
  return /Android|iPhone|iPad|iPod/i.test(String(userAgent || ''));
}

function isDesktopSession(userAgent) {
  const value = String(userAgent || '');
  return !isMobileSession(value) && /Windows|Mac OS X|Macintosh|Linux/i.test(value);
}

function formatSessionDate(value) {
  if (!value) return 'Activity time unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Activity time unavailable' : date.toLocaleString();
}

export default function SessionsScreen({ navigation }) {
  const { colors, spacing, typography, mood, layout } = useTheme();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState('');
  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionFilter, setSessionFilter] = useState('all');

  const loadSessions = useCallback(async (isActive = () => true) => {
    if (!SUPABASE_ENABLED || !supabase) {
      if (isActive()) { setSessions([]); setSessionsError('Connect a live account to view active sessions.'); setSessionsLoading(false); }
      return;
    }
    setSessionsLoading(true);
    try {
      const { data, error } = await supabase.rpc('list_my_auth_sessions');
      if (error) throw error;
      if (!isActive()) return;
      setSessions(Array.isArray(data) ? data : []);
      setSessionsError('');
    } catch (error) {
      if (!isActive()) return;
      setSessions([]);
      setSessionsError('Active sessions could not be loaded. Check your connection and retry. You can still use Sign out everywhere.');
    } finally {
      if (isActive()) setSessionsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    if (!SUPABASE_ENABLED || !supabase) {
      setSession(null);
      setLoading(false);
      setSessions([]);
      setSessionsError('Connect a live account to view active sessions.');
      setSessionsLoading(false);
      return () => { active = false; };
    }
    getSessionSecurityInfo()
      .then((value) => { if (active) setSession(value); })
      .catch((error) => { if (active) Alert.alert('Could not load session', error?.message || 'Please try again.'); })
      .finally(() => { if (active) setLoading(false); });
    loadSessions(() => active);
    return () => { active = false; };
  }, [loadSessions]));

  async function endSession(scope) {
    const global = scope === 'global';
    Alert.alert(
      global ? 'Sign out on all devices?' : 'Sign out on this device?',
      global
        ? 'ZannyChat will ask your account to revoke its other sessions too. Devices may remain usable until their existing access tokens expire, depending on token validation and refresh behavior.'
        : 'This removes the saved sign-in from this device. You can sign in again later.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: global ? 'Sign out everywhere' : 'Sign out here', style: 'destructive', onPress: async () => {
          setBusy(true);
          try {
            if (global) await signOutEverywhere(); else await signOutThisDevice();
            // The auth-state listener switches to the guest route group after sign-out.
          } catch (error) {
            Alert.alert('Could not sign out', error?.message || 'Please retry when your connection is available.');
          } finally { setBusy(false); }
        } },
      ]
    );
  }

  const otherSessions = sessions.filter((item) => !item.is_current);
  const sessionCounts = { all: otherSessions.length, mobile: otherSessions.filter((item) => isMobileSession(item.user_agent)).length, desktop: otherSessions.filter((item) => isDesktopSession(item.user_agent)).length };
  const visibleSessions = otherSessions.filter((item) => {
    const userAgent = String(item.user_agent || '');
    const label = sessionDeviceLabel(userAgent);
    const query = sessionSearch.trim().toLowerCase();
    if (query && !(label + ' ' + userAgent).toLowerCase().includes(query)) return false;
    if (sessionFilter === 'mobile') return isMobileSession(userAgent);
    if (sessionFilter === 'desktop') return isDesktopSession(userAgent);
    return true;
  });
  const deviceName = Device.modelName || Device.deviceName || 'This device';
  const platform = [Device.osName, Device.osVersion].filter(Boolean).join(' ');

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Devices & sessions" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}>
        <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: hexToRgba(colors.textPrimary, 0.1) }]}>
          <View style={[styles.orb, { backgroundColor: hexToRgba(mood.signal, 0.2), top: -65, right: -50 }]} />
          <View style={[styles.iconTile, { backgroundColor: hexToRgba(mood.thread, 0.13), borderColor: hexToRgba(mood.thread, 0.25) }]}>
            <Ionicons name="phone-portrait-outline" size={26} color={mood.thread} />
          </View>
          <Text style={[typography.display, { color: colors.textPrimary, marginTop: 20 }]}>Your account, under control.</Text>
          <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22, marginTop: 8 }]}>Review signed-in devices and protect your account when something looks unfamiliar.</Text>
        </View>

        <Text style={[typography.heading, { color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm }]}>Current device</Text>
        <GlassCard style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.deviceIcon, { backgroundColor: hexToRgba(mood.thread, 0.12) }]}><Ionicons name="phone-portrait" size={23} color={mood.thread} /></View>
            <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{deviceName}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>{platform || 'Mobile device'}{Constants.expoConfig?.version ? ` · ZannyChat ${Constants.expoConfig.version}` : ''}</Text>
            </View>
            <View style={[styles.activePill, { backgroundColor: hexToRgba(mood.thread, 0.1), borderColor: hexToRgba(mood.thread, 0.22) }]}>
              <View style={[styles.dot, { backgroundColor: colors.online }]} /><Text style={[typography.small, { color: colors.textPrimary, marginLeft: 5 }]}>This device</Text>
            </View>
          </View>
          <View style={[styles.rule, { backgroundColor: colors.border }]} />
          {loading ? <ActivityIndicator color={mood.signal} /> : !SUPABASE_ENABLED ? (
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Connect a live account to view session information.</Text>
          ) : !session ? (
            <Text style={[typography.caption, { color: colors.textSecondary }]}>No active session found. Please sign in again.</Text>
          ) : (
            <>
              <Text style={[typography.small, { color: colors.textSecondary }]}>SIGNED-IN ACCOUNT</Text>
              <Text style={[typography.body, { color: colors.textPrimary, marginTop: 4 }]}>{session.email || 'Authenticated account'}</Text>
              {session.expiresAt ? <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 7 }]}>Access token expires: {new Date(session.expiresAt).toLocaleString()}</Text> : null}
            </>
          )}
        </GlassCard>

        <Text style={[typography.heading, { color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm }]}>Other active sessions</Text>
        <GlassCard style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{otherSessions.length} other {otherSessions.length === 1 ? 'device' : 'devices'}</Text>
            <TouchableOpacity onPress={() => loadSessions()} disabled={sessionsLoading} accessibilityRole="button" accessibilityLabel="Refresh active sessions" accessibilityState={{ disabled: sessionsLoading, busy: sessionsLoading }} style={{ minHeight: 48, minWidth: 72, paddingHorizontal: 10, justifyContent: 'center', alignItems: 'center', opacity: sessionsLoading ? 0.55 : 1 }}>
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>{sessionsLoading ? 'Refreshing…' : 'Refresh'}</Text>
            </TouchableOpacity>
          </View>
          {sessionsLoading ? <ActivityIndicator color={mood.signal} /> : sessionsError ? (
            <View accessibilityRole="alert">
              <Text style={[typography.caption, { color: colors.danger, lineHeight: 20 }]}>{sessionsError}</Text>
              <TouchableOpacity onPress={() => loadSessions()} accessibilityRole="button" accessibilityLabel="Retry loading active sessions" style={{ minHeight: 48, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 8 }}>
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>Retry loading sessions</Text>
              </TouchableOpacity>
            </View>
          ) : otherSessions.length === 0 ? (
            <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 21 }]}>No other active sessions were found for this account.</Text>
          ) : (
            <>
              <View style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.sm, marginBottom: spacing.sm }}>
                <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
                <TextInput value={sessionSearch} onChangeText={setSessionSearch} placeholder="Search device or browser" placeholderTextColor={colors.textSecondary} accessibilityLabel="Search active sessions by device or browser" returnKeyType="search" style={[typography.body, { color: colors.textPrimary, flex: 1, minWidth: 0, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }]} />
                {sessionSearch ? <TouchableOpacity onPress={() => setSessionSearch('')} accessibilityRole="button" accessibilityLabel="Clear session search" style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="close-circle" size={18} color={colors.textSecondary} /></TouchableOpacity> : null}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm }}>
                {[{ key: 'all', label: 'All devices' }, { key: 'mobile', label: 'Mobile' }, { key: 'desktop', label: 'Desktop' }].map((option) => {
                  const selected = sessionFilter === option.key;
                  return <TouchableOpacity key={option.key} onPress={() => setSessionFilter(option.key)} accessibilityRole="radio" accessibilityLabel={'Show ' + option.label.toLowerCase() + ' sessions'} accessibilityState={{ checked: selected }} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, borderRadius: 13, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? hexToRgba(colors.primary, 0.14) : colors.surface }}>
                    <Text style={[typography.caption, { color: selected ? colors.primary : colors.textSecondary, fontWeight: selected ? '900' : '700' }]}>{option.label}</Text>
                    <Text style={[typography.small, { color: selected ? colors.primary : colors.textSecondary }]}>{sessionCounts[option.key]}</Text>
                  </TouchableOpacity>;
                })}
              </View>
              {visibleSessions.length === 0 ? <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 21, paddingVertical: spacing.md }]}>No devices match this search and filter. Try another device type or clear your search.</Text> : visibleSessions.map((item) => (
            <View key={item.session_id} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}>
              <View style={[styles.deviceIcon, { backgroundColor: hexToRgba(mood.thread, 0.12) }]}>
                <Ionicons name="laptop-outline" size={22} color={mood.thread} />
              </View>
              <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{sessionDeviceLabel(item.user_agent)}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>Last active: {formatSessionDate(item.last_active_at)}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>Signed in: {formatSessionDate(item.created_at)}</Text>
                {item.not_after ? <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>Session expiry: {formatSessionDate(item.not_after)}</Text> : null}
              </View>
              <View style={[styles.activePill, { backgroundColor: hexToRgba(colors.success, 0.08), borderColor: hexToRgba(colors.success, 0.2) }]}>
                <View style={[styles.dot, { backgroundColor: colors.online }]} /><Text style={[typography.small, { color: colors.textPrimary, marginLeft: 5 }]}>Active</Text>
              </View>
            </View>
          ))}
            </>
          )}
        </GlassCard>

        <GlassCard style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Ionicons name="information-circle-outline" size={20} color={mood.signal} style={{ marginTop: 1 }} />
            <View style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>About other devices</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 21, marginTop: 5 }]}>These entries show active Supabase Auth sessions. Use “Sign out everywhere” to revoke all sessions. Existing access tokens may remain valid until their expiry, so access may not stop immediately.</Text>
            </View>
          </View>
        </GlassCard>

        <TouchableOpacity onPress={() => endSession('local')} disabled={busy || loading || !session} accessibilityRole="button" accessibilityLabel="Sign out on this device" accessibilityState={{ disabled: busy || loading || !session, busy }} style={[styles.secondaryButton, { borderColor: colors.border, opacity: busy || loading || !session ? 0.5 : 1 }]}>
          <Ionicons name="log-out-outline" size={19} color={colors.textPrimary} /><Text style={[typography.bodyStrong, { color: colors.textPrimary, marginLeft: 9 }]}>{busy ? 'Signing out…' : 'Sign out on this device'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => endSession('global')} disabled={busy || loading || !session} accessibilityRole="button" accessibilityLabel="Sign out everywhere" accessibilityState={{ disabled: busy || loading || !session, busy }} style={[styles.dangerButton, { backgroundColor: colors.danger, opacity: busy || loading || !session ? 0.5 : 1 }]}>
          <Ionicons name="shield-checkmark-outline" size={19} color={colors.onDanger} /><Text style={[typography.bodyStrong, { color: colors.onDanger, marginLeft: 9 }]}>Sign out everywhere</Text>
        </TouchableOpacity>
        {!SUPABASE_ENABLED ? <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: 12 }]}>Session controls are disabled in demo mode.</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 28, borderWidth: 1, padding: 22, overflow: 'hidden', minHeight: 260 },
  orb: { position: 'absolute', width: 190, height: 190, borderRadius: 100 },
  iconTile: { width: 52, height: 52, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  deviceIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  activePill: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, borderWidth: 1, paddingVertical: 6, paddingHorizontal: 9 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  rule: { height: StyleSheet.hairlineWidth, marginVertical: 16 },
  secondaryButton: { minHeight: 52, borderWidth: 1, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  dangerButton: { minHeight: 52, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
