import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '../components/GlassCard';
import { backendFetch } from '../services/backendClient';
import { getCurrentUser } from '../services/api';
import { supabase, SUPABASE_ENABLED } from '../services/supabaseClient';
import { useTheme } from '../theme/ThemeContext';
import LivePremiumHeader from '../components/LivePremiumHeader';

function Metric({ icon, label, value, colors, typography, note }) {
  return (
    <GlassCard contentStyle={{ padding: 15, gap: 9, minHeight: 116 }}>
      <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={[typography.heading, { color: colors.textPrimary, fontSize: 23 }]}>{Number(value || 0).toLocaleString()}</Text>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
      {note ? <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 12 }]}>{note}</Text> : null}
    </GlassCard>
  );
}

function formatDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatDuration(value) {
  const seconds = Math.max(0, Number(value || 0));
  if (!seconds) return 'Duration unavailable';
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes ? minutes + 'm ' + remainder + 's' : remainder + 's';
}

function titleCase(value) {
  return String(value || 'unknown').replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function LiveAnalyticsScreen({ navigation }) {
  const { colors, spacing, typography } = useTheme();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const activeUserIdRef = useRef(null);
  const refreshRequestRef = useRef(0);

  const refresh = useCallback(async (pull = false) => {
    const requestId = ++refreshRequestRef.current;
    if (pull) setRefreshing(true); else setLoading(true);
    try {
      const startingUser = await getCurrentUser().catch(() => null);
      if (requestId !== refreshRequestRef.current) return;
      const expectedUserId = startingUser?.id || null;
      if (activeUserIdRef.current !== expectedUserId) {
        activeUserIdRef.current = expectedUserId;
        setSummary(null);
      }
      if (!expectedUserId) {
        setSummary(null);
        setError('Sign in to view your LIVE analytics.');
        return;
      }
      const result = await backendFetch('/live/creators/me/profile');
      const latestUser = await getCurrentUser().catch(() => null);
      if (requestId !== refreshRequestRef.current || latestUser?.id !== expectedUserId) return;
      setSummary(result || null);
      setError('');
    } catch (e) {
      if (requestId === refreshRequestRef.current) {
        setSummary(null);
        setError(e?.message || 'LIVE analytics are temporarily unavailable.');
      }
    } finally {
      if (requestId === refreshRequestRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!SUPABASE_ENABLED || !supabase?.auth?.onAuthStateChange) return undefined;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user?.id || null;
      if (activeUserIdRef.current === nextUserId) return;
      activeUserIdRef.current = nextUserId;
      refreshRequestRef.current += 1;
      setSummary(null);
      setError(nextUserId ? '' : 'Sign in to view your LIVE analytics.');
      setLoading(Boolean(nextUserId));
      setRefreshing(false);
      if (nextUserId) Promise.resolve().then(() => refresh());
    });
    return () => data?.subscription?.unsubscribe?.();
  }, [refresh]);

  useFocusEffect(useCallback(() => {
    refresh();
    return () => { refreshRequestRef.current += 1; };
  }, [refresh]));

  const profile = summary?.profile || {};
  const impact = summary?.impact || {};
  const streams = summary?.streams || {};
  const replays = summary?.replays || {};
  const lastUpdated = impact.updated_at ? formatDate(impact.updated_at) : null;
  const recentStreams = Array.isArray(streams.recent) ? streams.recent : [];
  const recentReplays = Array.isArray(replays.recent) ? replays.recent : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refresh(true)} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl || 32, alignItems: 'center' }}
      >
        <View style={{ width: '100%', maxWidth: 760, gap: spacing.md }}>
          <LivePremiumHeader
            navigation={navigation}
            eyebrow="ZANNYCHAT · LIVE INSIGHTS"
            backLabel="Back to Creator Studio"
            title="Creator analytics"
            subtitle="Verified creator impact and broadcast history"
            icon="analytics-outline"
            onRefresh={() => refresh(true)}
            refreshLabel="Refresh LIVE analytics"
          />

          {loading && !summary ? <View style={{ padding: spacing.xl, alignItems: 'center', gap: spacing.sm }}><ActivityIndicator color={colors.primary} /><Text style={[typography.caption, { color: colors.textSecondary }]}>Preparing your LIVE insights…</Text></View> : null}
          {!!error ? <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}><Text accessibilityRole="alert" style={[typography.body, { color: colors.danger }]}>{error}</Text><TouchableOpacity onPress={() => refresh()} accessibilityRole="button" accessibilityLabel="Retry loading LIVE analytics" style={{ minHeight: 48, justifyContent: 'center' }}><Text style={[typography.bodyStrong, { color: colors.primary }]}>Try again</Text></TouchableOpacity></GlassCard> : null}
          {!loading && !error && !summary ? <GlassCard contentStyle={{ padding: spacing.xl, alignItems: 'center', gap: spacing.sm }}><Ionicons name="analytics-outline" size={30} color={colors.textSecondary} /><Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Your analytics will appear here</Text><Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }]}>Start a LIVE broadcast to begin building your creator impact and replay history.</Text></GlassCard> : null}

          {summary ? <>
            <GlassCard glow contentStyle={{ padding: spacing.lg, gap: spacing.sm }}>
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '900', letterSpacing: 1.2 }]}>YOUR CREATOR SNAPSHOT</Text>
              <Text style={[typography.heading, { color: colors.textPrimary, fontSize: 21 }]}>{profile.name || 'LIVE Creator'}</Text>
              <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]}>A clear view of your audience, community response, broadcasts and saved replays.</Text>
              {lastUpdated ? <Text style={[typography.caption, { color: colors.textSecondary }]}>Impact data updated {lastUpdated}</Text> : null}
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <TouchableOpacity onPress={() => navigation.navigate('LiveReplayLibrary')} accessibilityRole="button" accessibilityLabel="Open LIVE replay library" style={{ flex: 1, minHeight: 48, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 }}>
                  <Ionicons name="film-outline" size={17} color={colors.onPrimary} />
                  <Text style={[typography.caption, { color: colors.onPrimary, fontWeight: '900' }]}>Replay library</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('Main', { screen: 'LIVE' })} accessibilityRole="button" accessibilityLabel="Open LIVE Hub" style={{ flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 }}>
                  <Ionicons name="radio-outline" size={17} color={colors.primary} />
                  <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '900' }]}>LIVE Hub</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>

            <View style={{ gap: spacing.xs }}>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 18 }]}>Community impact</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Lifetime impact totals from your LIVE creator record</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                <View style={{ width: '48%', flexGrow: 1 }}><Metric icon="sparkles" label="Impact score" value={impact.impact_score} colors={colors} typography={typography} /></View>
                <View style={{ width: '48%', flexGrow: 1 }}><Metric icon="heart" label="Total reactions" value={impact.total_reactions} colors={colors} typography={typography} /></View>
                <View style={{ width: '48%', flexGrow: 1 }}><Metric icon="people" label="Unique supporters" value={impact.unique_supporters} colors={colors} typography={typography} /></View>
                <View style={{ width: '48%', flexGrow: 1 }}><Metric icon="person-add" label="Current followers" value={summary.followers} colors={colors} typography={typography} /></View>
              </View>
            </View>

            <View style={{ gap: spacing.xs }}>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 18 }]}>Broadcast performance</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Verified counts from your creator profile summary</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                <View style={{ width: '31%', minWidth: 104, flexGrow: 1 }}><Metric icon="radio" label="Total broadcasts" value={streams.total} colors={colors} typography={typography} /></View>
                <View style={{ width: '31%', minWidth: 104, flexGrow: 1 }}><Metric icon="radio-outline" label="Live now" value={streams.liveNow} colors={colors} typography={typography} /></View>
                <View style={{ width: '31%', minWidth: 104, flexGrow: 1 }}><Metric icon="film" label="Total replays" value={replays.total} colors={colors} typography={typography} /></View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                <View style={{ width: '48%', flexGrow: 1 }}><Metric icon="checkmark-circle-outline" label="Ready replays" value={replays.ready} note="Latest 100 records" colors={colors} typography={typography} /></View>
                <View style={{ width: '48%', flexGrow: 1 }}><Metric icon="time-outline" label="Replays processing" value={replays.processing} note="Latest 100 records" colors={colors} typography={typography} /></View>
              </View>
            </View>

            <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
                <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Recent broadcasts</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>{recentStreams.length} shown</Text>
              </View>
              {recentStreams.length ? recentStreams.slice(0, 20).map((item) => (
                <View key={item.id} style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Ionicons name={item.status === 'live' ? 'radio' : 'videocam-outline'} size={18} color={item.status === 'live' ? colors.danger : colors.primary} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={[typography.bodyStrong, { color: colors.textPrimary }]}>{item.title || 'LIVE broadcast'}</Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>{titleCase(item.status)} · {formatDate(item.started_at)}</Text>
                  </View>
                  {item.status === 'live' ? <View style={{ paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: colors.danger }}><Text style={[typography.caption, { color: colors.danger, fontWeight: '900' }]}>LIVE</Text></View> : null}
                </View>
              )) : <Text style={[typography.caption, { color: colors.textSecondary }]}>No broadcasts have been recorded yet.</Text>}
            </GlassCard>

            <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
                <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Replay health</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>{recentReplays.length} recent records</Text>
              </View>
              {recentReplays.length ? recentReplays.slice(0, 20).map((item) => (
                <View key={item.id} style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Ionicons name={item.status === 'ready' ? 'checkmark-circle-outline' : 'time-outline'} size={18} color={item.status === 'ready' ? colors.success : colors.warning} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{titleCase(item.status)} replay</Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>{formatDuration(item.duration_seconds)} · {formatDate(item.completed_at)}</Text>
                  </View>
                </View>
              )) : <Text style={[typography.caption, { color: colors.textSecondary }]}>Your replay records will appear here after a broadcast is saved.</Text>}
            </GlassCard>

            <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>About these insights</Text>
              </View>
              <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 20 }]}>These figures come directly from your LIVE creator profile. Ready and processing replay counts cover the latest 100 replay records. Daily trend charts, watch-time attribution and exportable reports are not available from the current analytics API, so no estimated values are shown.</Text>
            </GlassCard>
          </> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
