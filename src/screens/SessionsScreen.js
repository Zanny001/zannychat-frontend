import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../utils/color';
import { SUPABASE_ENABLED } from '../services/supabaseClient';
import { getSessionSecurityInfo, signOutThisDevice, signOutEverywhere } from '../services/api';

export default function SessionsScreen({ navigation }) {
  const { colors, spacing, typography, mood } = useTheme();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    if (!SUPABASE_ENABLED) {
      setSession(null);
      setLoading(false);
      return () => { active = false; };
    }
    getSessionSecurityInfo()
      .then((value) => { if (active) setSession(value); })
      .catch((error) => { if (active) Alert.alert('Could not load session', error?.message || 'Please try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []));

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
            navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
          } catch (error) {
            Alert.alert('Could not sign out', error?.message || 'Please retry when your connection is available.');
          } finally { setBusy(false); }
        } },
      ]
    );
  }

  const deviceName = Device.modelName || Device.deviceName || 'This device';
  const platform = [Device.osName, Device.osVersion].filter(Boolean).join(' ');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Devices & sessions" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
        <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: hexToRgba(colors.textPrimary, 0.1) }]}>
          <View style={[styles.orb, { backgroundColor: hexToRgba(mood.signal, 0.2), top: -65, right: -50 }]} />
          <View style={[styles.iconTile, { backgroundColor: hexToRgba(mood.thread, 0.13), borderColor: hexToRgba(mood.thread, 0.25) }]}>
            <Ionicons name="phone-portrait-outline" size={26} color={mood.thread} />
          </View>
          <Text style={[typography.display, { color: colors.textPrimary, marginTop: 20 }]}>Your account, under control.</Text>
          <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22, marginTop: 8 }]}>Review this device's sign-in and revoke access when you need to protect your account.</Text>
        </View>

        <Text style={[typography.heading, { color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm }]}>Current device</Text>
        <GlassCard style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.deviceIcon, { backgroundColor: hexToRgba(mood.thread, 0.12) }]}><Ionicons name="phone-portrait" size={23} color={mood.thread} /></View>
            <View style={{ flex: 1, marginLeft: 12 }}>
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

        <GlassCard style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Ionicons name="information-circle-outline" size={20} color={mood.signal} style={{ marginTop: 1 }} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>About other devices</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 21, marginTop: 5 }]}>This app's current authentication integration cannot safely enumerate a list of every signed-in device. Rather than show a fake device list, use “Sign out everywhere” to request revocation of other sessions too. Token expiry and server validation affect how quickly access is cut off.</Text>
            </View>
          </View>
        </GlassCard>

        <TouchableOpacity onPress={() => endSession('local')} disabled={busy || loading || !session} accessibilityRole="button" accessibilityLabel="Sign out on this device" accessibilityState={{ disabled: busy || loading || !session, busy }} style={[styles.secondaryButton, { borderColor: colors.border, opacity: busy || loading || !session ? 0.5 : 1 }]}>
          <Ionicons name="log-out-outline" size={19} color={colors.textPrimary} /><Text style={[typography.bodyStrong, { color: colors.textPrimary, marginLeft: 9 }]}>{busy ? 'Signing out…' : 'Sign out on this device'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => endSession('global')} disabled={busy || loading || !session} accessibilityRole="button" accessibilityLabel="Sign out everywhere" accessibilityState={{ disabled: busy || loading || !session, busy }} style={[styles.dangerButton, { backgroundColor: '#B4232C', opacity: busy || loading || !session ? 0.5 : 1 }]}>
          <Ionicons name="shield-checkmark-outline" size={19} color="#FFFFFF" /><Text style={[typography.bodyStrong, { color: '#FFFFFF', marginLeft: 9 }]}>Sign out everywhere</Text>
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
