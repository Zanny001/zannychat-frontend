import React, { useEffect } from 'react';
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '../components/GlassCard';
import { getCurrentUser } from '../services/api';
import { supabase, SUPABASE_ENABLED } from '../services/supabaseClient';
import { useTheme } from '../theme/ThemeContext';

function formatDate(value) {
  if (!value) return 'Time unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Time unavailable' : date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatDuration(startedAt, endedAt) {
  const start = new Date(startedAt || '').getTime();
  const end = new Date(endedAt || '').getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 'Duration unavailable';
  const seconds = Math.floor((end - start) / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  if (hours) return hours + 'h ' + minutes + 'm';
  if (minutes) return minutes + 'm ' + remainder + 's';
  return remainder + 's';
}

function replayMessage(status, enabled) {
  if (!enabled) return 'Replay recording was not enabled for this broadcast. You can turn it on before your next LIVE.';
  if (status === 'ready') return 'Your replay is ready in the private LIVE replay library.';
  if (['starting', 'recording', 'processing'].includes(status)) return 'Your replay is still being prepared. Check the replay library again shortly.';
  if (status === 'failed') return 'The replay recording did not complete. Your broadcast has still ended successfully.';
  return 'The replay status is not available yet. Check the replay library for the latest recording state.';
}

export default function LivePostStreamSummaryScreen({ route, navigation }) {
  const { colors, spacing, radii, typography } = useTheme();
  const creatorId = route.params?.creatorId || null;
  const title = route.params?.title || 'Your LIVE broadcast';
  const startedAt = route.params?.startedAt || null;
  const endedAt = route.params?.endedAt || null;
  const replayStatus = route.params?.replayStatus || null;
  const replayEnabled = route.params?.replayEnabled === true;

  useEffect(() => {
    let active = true;
    getCurrentUser().then((user) => {
      if (active && (!creatorId || user?.id !== creatorId)) navigation.replace('LiveHub');
    }).catch(() => {
      if (active) navigation.replace('LiveHub');
    });
    if (!SUPABASE_ENABLED || !supabase?.auth?.onAuthStateChange) {
      return () => { active = false; };
    }
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id !== creatorId) navigation.replace('LiveHub');
    });
    return () => {
      active = false;
      data?.subscription?.unsubscribe?.();
    };
  }, [creatorId, navigation]);

  const ready = replayStatus === 'ready';
  const processing = ['starting', 'recording', 'processing'].includes(replayStatus);
  const statusColor = ready ? colors.success : replayStatus === 'failed' ? colors.danger : colors.warning;
  const statusIcon = ready ? 'checkmark-circle' : replayStatus === 'failed' ? 'alert-circle' : 'time-outline';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl || 32, alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: 680, gap: spacing.md }}>
          <View style={{ alignItems: 'center', paddingTop: spacing.xl, paddingBottom: spacing.md, gap: spacing.sm }}>
            <View style={{ width: 78, height: 78, borderRadius: 26, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="checkmark-done-circle" size={42} color={colors.success} />
            </View>
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '900', letterSpacing: 1.5 }]}>ZANNYCHAT · LIVE COMPLETE</Text>
            <Text style={[typography.heading, { color: colors.textPrimary, fontSize: 26, textAlign: 'center' }]}>Your LIVE has ended</Text>
            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }]}>Your broadcast is closed. Here is the session summary and recording status.</Text>
          </View>

          <GlassCard glow contentStyle={{ padding: spacing.lg, gap: spacing.md }}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>SESSION SUMMARY</Text>
            <Text style={[typography.heading, { color: colors.textPrimary, fontSize: 21 }]}>{title}</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1, minWidth: 0, padding: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
                <Ionicons name="time-outline" size={18} color={colors.primary} />
                <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginTop: 8 }]}>{formatDuration(startedAt, endedAt)}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Session duration</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0, padding: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginTop: 8 }]}>{formatDate(endedAt)}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Ended at</Text>
              </View>
            </View>
          </GlassCard>

          <GlassCard contentStyle={{ padding: spacing.lg, gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name={statusIcon} size={22} color={statusColor} />
              <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 17 }]}>Replay status</Text>
              <View style={{ flex: 1 }} />
              <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: statusColor }}>
                <Text style={[typography.caption, { color: statusColor, fontWeight: '900' }]}>{ready ? 'READY' : processing ? 'PROCESSING' : replayStatus ? replayStatus.toUpperCase() : replayEnabled ? 'PENDING' : 'OFF'}</Text>
              </View>
            </View>
            <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]}>{replayMessage(replayStatus, replayEnabled)}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('LiveReplayLibrary')} accessibilityRole="button" accessibilityLabel="Open your LIVE replay library" style={{ minHeight: 48, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
              <Ionicons name="film-outline" size={18} color={colors.onPrimary} />
              <Text style={[typography.bodyStrong, { color: colors.onPrimary }]}>Open replay library</Text>
            </TouchableOpacity>
          </GlassCard>

          <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
              <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Your session is closed</Text>
            </View>
            <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 20 }]}>This summary shows the confirmed session timing and replay state. Viewer reach, watch time and earnings are not displayed because those metrics are not currently returned by the LIVE summary API.</Text>
          </GlassCard>

          <TouchableOpacity onPress={() => navigation.replace('LiveCreatorStudio')} accessibilityRole="button" accessibilityLabel="Return to Creator Studio" style={{ minHeight: 52, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
            <Ionicons name="settings-outline" size={18} color={colors.primary} />
            <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Return to Creator Studio</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.replace('LiveHub')} accessibilityRole="button" accessibilityLabel="Return to LIVE Hub" style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[typography.bodyStrong, { color: colors.primary }]}>Back to LIVE Hub</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
