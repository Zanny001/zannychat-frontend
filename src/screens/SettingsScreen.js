import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import MoodSwatch from '../components/MoodSwatch';
import GlassCard from '../components/GlassCard';
import { hexToRgba } from '../utils/color';
import { signOut } from '../services/api';
import { SUPABASE_ENABLED } from '../services/supabaseClient';
import { BACKEND_ENABLED, checkBackendHealth } from '../services/backendClient';

export default function SettingsScreen({ navigation }) {
  const { colors, spacing, typography, radii, paletteKey, palettes, setPalette } = useTheme();
  const [vaultEnabled, setVaultEnabled] = React.useState(false);

  async function handleLogout() {
    try {
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

        <GlassCard style={{ marginBottom: spacing.md }}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Zero-Knowledge Vault</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Extra-encrypted storage for voice notes & files (preview)
              </Text>
            </View>
            <Switch
              value={vaultEnabled}
              onValueChange={(val) => {
                setVaultEnabled(val);
                if (val) Alert.alert('Preview feature', 'The vault backend lands with Phase 4 of the roadmap.');
              }}
              trackColor={{ true: colors.primary }}
            />
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
          <TouchableOpacity onPress={runCheck} hitSlop={10} disabled={checking}>
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
  dot: { width: 8, height: 8, borderRadius: 4 },
  logoutBtn: { borderWidth: 1.5, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
});
