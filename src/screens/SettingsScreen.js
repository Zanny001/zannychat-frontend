import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import MoodSwatch from '../components/MoodSwatch';
import GlassCard from '../components/GlassCard';
import { hexToRgba } from '../utils/color';
import { signOut } from '../services/api';
import { stopPresence } from '../services/presence';
import { SUPABASE_ENABLED } from '../services/supabaseClient';
import { BACKEND_ENABLED, checkBackendHealth } from '../services/backendClient';

export default function SettingsScreen({ navigation }) {
  const { colors, spacing, typography, radii, paletteKey, palettes, setPalette } = useTheme();

  async function handleLogout() {
    try {
      stopPresence();
      await signOut();
    } finally {
      navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Appearance & theme" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <ConnectionsPanel />

        <TouchableOpacity
          onPress={() => navigation.navigate('ChatAppearance')}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel="Chat appearance"
          style={{ marginBottom: spacing.md }}
        >
          <GlassCard contentStyle={styles.row}>
            <View style={[styles.appearanceIcon, { backgroundColor: hexToRgba(colors.primary, 0.14) }]}>
              <Ionicons name="color-wand-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Chat appearance</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Personalize the conversation canvas</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </GlassCard>
        </TouchableOpacity>

        <GlassCard style={{ marginBottom: spacing.md }}>
          <Text style={[typography.heading, { color: colors.textPrimary, marginBottom: spacing.sm }]}>Mood</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>
            Each mood is two colors — one for you, one for them. Pick one and it applies everywhere.
          </Text>

          <View style={styles.swatchRow}>
            {palettes.map((mood) => {
              const selected = paletteKey === mood.key;
              return (
                <TouchableOpacity key={mood.key} onPress={() => setPalette(mood.key)} style={styles.swatchWrap}>
                  <View
                    style={[
                      styles.swatchRing,
                      { borderColor: selected ? colors.textPrimary : 'transparent' },
                    ]}
                  >
                    <MoodSwatch mood={mood} size={44} />
                  </View>
                  <Text
                    style={[
                      typography.small,
                      { color: selected ? colors.textPrimary : colors.textSecondary, marginTop: 6 },
                    ]}
                  >
                    {mood.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </GlassCard>

        {/* The audit called the old version of this row out by name: a
            Switch that visibly flipped but persisted nothing is a worse
            pattern than an honest "coming soon" row. This is that row —
            disabled, labelled, no fake state. */}
        <GlassCard style={{ marginBottom: spacing.md, opacity: 0.6 }}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Zero-Knowledge Vault</Text>
                <View
                  style={[
                    styles.comingSoonPill,
                    { borderColor: hexToRgba(colors.gold, 0.5), backgroundColor: hexToRgba(colors.gold, 0.12) },
                  ]}
                >
                  <Text style={[typography.small, { color: colors.gold }]}>COMING SOON</Text>
                </View>
              </View>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Extra-encrypted storage for voice notes & files. Not built yet — this row will become a switch when it is.
              </Text>
            </View>
          </View>
        </GlassCard>

        <TouchableOpacity
          style={[
            styles.logoutBtn,
            { borderColor: colors.danger, borderRadius: radii.pill, backgroundColor: hexToRgba(colors.danger, 0.1) },
          ]}
          onPress={handleLogout}
        >
          <Text style={[typography.bodyStrong, { color: colors.danger }]}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// A real diagnostics panel, not a decoration: Supabase's status comes
// from whether env vars are set (that's all a client can ever know —
// it never holds credentials that could prove more). The backend's
// status comes from actually calling its /health route, which itself
// runs a real Supabase query server-side — so "Backend: live" here
// means the deployed service, not just this app, can reach the
// database.
function ConnectionsPanel() {
  const { colors, spacing, typography, radii } = useTheme();
  const [health, setHealth] = useState(null); // null = not checked yet
  const [checking, setChecking] = useState(false);

  const runCheck = useCallback(async () => {
    if (!BACKEND_ENABLED) return;
    setChecking(true);
    const result = await checkBackendHealth();
    setHealth(result);
    setChecking(false);
  }, []);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  const backendLive = health?.reachable && health?.supabaseReachable;
  const backendReachableOnly = health?.reachable && !health?.supabaseReachable;

  return (
    <GlassCard style={{ marginBottom: spacing.md }}>
      <View style={[styles.row, { marginBottom: spacing.sm }]}>
        <Text style={[typography.heading, { color: colors.textPrimary, flex: 1 }]}>Connections</Text>
        {BACKEND_ENABLED && (
          <TouchableOpacity
            onPress={runCheck}
            hitSlop={10}
            disabled={checking}
            accessibilityLabel="Re-check connections"
            accessibilityRole="button"
          >
            {checking ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <Ionicons name="refresh" size={18} color={colors.textSecondary} />
            )}
          </TouchableOpacity>
        )}
      </View>

      <ConnectionRow
        label="Supabase"
        detail={SUPABASE_ENABLED ? 'Auth, chat & profiles' : 'Not configured — using mock data'}
        status={SUPABASE_ENABLED ? 'ok' : 'off'}
      />
      <ConnectionRow
        label="Backend"
        detail={
          !BACKEND_ENABLED
            ? 'Not configured — using mock data'
            : checking && !health
            ? 'Checking…'
            : backendLive
            ? 'Live — reached its own Supabase too'
            : backendReachableOnly
            ? 'Reachable, but its Supabase check failed'
            : "Couldn't reach it"
        }
        status={!BACKEND_ENABLED ? 'off' : backendLive ? 'ok' : health ? 'error' : 'pending'}
        last
      />

      {backendReachableOnly && (
        <Text style={[typography.small, { color: colors.danger, marginTop: spacing.sm }]}>
          The backend answered but couldn't query Supabase — double check SUPABASE_URL and
          SUPABASE_SERVICE_ROLE_KEY on the Render service.
        </Text>
      )}
    </GlassCard>
  );
}

function ConnectionRow({ label, detail, status, last }) {
  const { colors, spacing, typography } = useTheme();
  const dotColor =
    status === 'ok' ? colors.online : status === 'error' ? colors.danger : status === 'pending' ? colors.gold : colors.textSecondary;

  return (
    <View style={[styles.row, { marginBottom: last ? 0 : spacing.sm }]}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <View style={{ flex: 1, marginLeft: spacing.sm }}>
        <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{label}</Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  swatchWrap: { alignItems: 'center', width: 68 },
  swatchRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  appearanceIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  comingSoonPill: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  logoutBtn: { borderWidth: 1.5, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
});
