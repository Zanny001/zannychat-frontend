import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { backendFetch } from '../services/backendClient';
import { getCurrentUser } from '../services/api';
import { supabase, SUPABASE_ENABLED } from '../services/supabaseClient';
import { useTheme } from '../theme/ThemeContext';
import LivePremiumHeader from '../components/LivePremiumHeader';
import { hexToRgba } from '../utils/color';
import GlassCard from '../components/GlassCard';
import Avatar from '../components/Avatar';
import { confirmAction, showAppAlert } from '../utils/appDialogs';

function Metric({ icon, label, value, colors, typography }) {
  return (
    <GlassCard contentStyle={{ padding: 16, gap: 10, minHeight: 116 }}>
      <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: hexToRgba(colors.primary, 0.16), borderWidth: 1, borderColor: hexToRgba(colors.primary, 0.2), alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={[typography.heading, { color: colors.textPrimary, fontSize: 22 }]}>{Number(value || 0).toLocaleString()}</Text>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
    </GlassCard>
  );
}

export default function LiveCreatorStudioScreen({ navigation }) {
  const { colors, spacing, radii, typography, layout } = useTheme();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const activeUserIdRef = useRef(null);
  const refreshRequestRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++refreshRequestRef.current;
    setLoading(true);
    try {
      const startingUser = await getCurrentUser().catch(() => null);
      // An auth event may have invalidated this refresh while identity was
      // being resolved; do not overwrite the newer owner with a stale result.
      if (requestId !== refreshRequestRef.current) return;
      const expectedUserId = startingUser?.id || null;
      if (activeUserIdRef.current !== expectedUserId) {
        activeUserIdRef.current = expectedUserId;
        setSummary(null);
      }
      if (!expectedUserId) {
        setSummary(null);
        setError('Sign in to open your LIVE Creator Studio.');
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
        setError(e?.message || 'Your LIVE Creator Studio is temporarily unavailable.');
      }
    } finally {
      if (requestId === refreshRequestRef.current) setLoading(false);
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
      setError(nextUserId ? '' : 'Sign in to open your LIVE Creator Studio.');
      setLoading(Boolean(nextUserId));
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
  // The creator-profile API only returns the signed-in creator's own replay rows;
  // older payloads omit creator_id, so fall back to the authenticated profile id.
  const getReplayCreatorId = (item) => item?.creator_id || profile.id;

  const deleteBroadcast = async (item) => {
    const confirmed = await confirmAction({
      title: 'Delete past LIVE broadcast?',
      message: 'This permanently removes the broadcast from your creator history and deletes its saved replay files. This cannot be undone.',
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    const expectedUserId = activeUserIdRef.current;
    try {
      await backendFetch('/live/' + encodeURIComponent(item.id), { method: 'DELETE' });
      const latestUser = await getCurrentUser().catch(() => null);
      if (!expectedUserId || latestUser?.id !== expectedUserId) return;
      setSummary((current) => {
        if (!current) return current;
        const removedReplays = (current.replays?.recent || []).filter((row) => row.stream_id === item.id);
        return {
          ...current,
          streams: { ...current.streams, total: Math.max(0, Number(current.streams?.total || 0) - 1), recent: (current.streams?.recent || []).filter((row) => row.id !== item.id) },
          replays: {
            ...current.replays,
            total: Math.max(0, Number(current.replays?.total || 0) - removedReplays.length),
            ready: Math.max(0, Number(current.replays?.ready || 0) - removedReplays.filter((row) => row.status === 'ready').length),
            recent: (current.replays?.recent || []).filter((row) => row.stream_id !== item.id),
          },
        };
      });
    } catch (e) {
      showAppAlert('Could not delete broadcast', e?.message || 'Please try again.');
    }
  };

  const deleteReplay = async (item) => {
    const expectedUserId = activeUserIdRef.current;
    if (!item?.id || !expectedUserId || getReplayCreatorId(item) !== expectedUserId
      || ['starting', 'recording', 'processing'].includes(item.status)) return;
    const beforeConfirmUser = await getCurrentUser().catch(() => null);
    if (beforeConfirmUser?.id !== expectedUserId || activeUserIdRef.current !== expectedUserId) return;
    const confirmed = await confirmAction({
      title: 'Delete LIVE replay?',
      message: 'The saved video file will be permanently deleted. This cannot be undone.',
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    const latestUser = await getCurrentUser().catch(() => null);
    if (latestUser?.id !== expectedUserId || activeUserIdRef.current !== expectedUserId
      || getReplayCreatorId(item) !== expectedUserId) return;
    try {
      await backendFetch('/live/replays/' + encodeURIComponent(item.id), { method: 'DELETE' });
      const userAfterDelete = await getCurrentUser().catch(() => null);
      if (userAfterDelete?.id !== expectedUserId || activeUserIdRef.current !== expectedUserId) return;
      setSummary((current) => current ? ({
        ...current,
        replays: { ...current.replays, total: Math.max(0, Number(current.replays?.total || 0) - 1), ready: Math.max(0, Number(current.replays?.ready || 0) - (item.status === 'ready' ? 1 : 0)), recent: (current.replays?.recent || []).filter((row) => row.id !== item.id) },
      }) : current);
    } catch (e) {
      showAppAlert('Could not delete replay', e?.message || 'Please try again.');
    }
  };


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl || 32, alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', gap: spacing.md }}>
        <LivePremiumHeader
          navigation={navigation}
          eyebrow="ZANNYCHAT · LIVE · CREATOR STUDIO"
            backLabel="Back to LIVE hub"
          title="Creator Studio"
          subtitle="Your broadcast workspace and community impact"
          icon="sparkles-outline"
          onRefresh={() => refresh()}
          refreshLabel="Refresh Creator Studio"
        />

        {loading && !summary ? <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={colors.primary} /><Text style={[typography.caption, { color: colors.textSecondary, marginTop: 10 }]}>Preparing your creator studio…</Text></View> : null}
        {!!error ? <GlassCard contentStyle={{ padding: spacing.lg, gap: spacing.md }}><Text style={[typography.body, { color: colors.danger }]}>{error}</Text><TouchableOpacity onPress={refresh} accessibilityRole="button" accessibilityLabel="Retry loading Creator Studio"><Text style={[typography.bodyStrong, { color: colors.primary }]}>Try again</Text></TouchableOpacity></GlassCard> : null}

        <GlassCard glow contentStyle={{ padding: spacing.lg, gap: spacing.lg }}>
          <View style={{ position: 'absolute', top: -42, right: -24, width: 150, height: 150, borderRadius: 80, backgroundColor: hexToRgba(colors.primary, 0.12) }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ padding: 4, borderRadius: 28, borderWidth: 1, borderColor: hexToRgba(colors.primary, 0.45) }}>
              <Avatar name={profile.name || 'LIVE Creator'} color={profile.avatar_color || colors.primary} size={76} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={2} style={[typography.heading, { color: colors.textPrimary, fontSize: 23 }]}>{profile.name || 'Your LIVE identity'}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4, lineHeight: 18 }]}>Your dedicated identity for broadcasts and community.</Text>
              <View style={{ alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: hexToRgba(colors.primary, 0.16), borderWidth: 1, borderColor: hexToRgba(colors.primary, 0.25) }}>
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '900', letterSpacing: 0.8 }]}>✦ LIVE CREATOR</Text>
              </View>
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]}>Your broadcasts, community impact, audience growth and replay collection — together in one creator space.</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Main', { screen: 'LIVE' })} accessibilityRole="button" accessibilityLabel="Open LIVE Hub" style={{ minHeight: 50, borderRadius: 16, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Ionicons name="radio" size={18} color={colors.onPrimary} />
            <Text style={[typography.bodyStrong, { color: colors.onPrimary }]}>Open LIVE stage</Text>
          </TouchableOpacity>
        </GlassCard>

        <View style={{ gap: spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 18 }]}>Creator impact</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Your community's reactions and daily support score</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('LiveAnalytics')} accessibilityRole="button" accessibilityLabel="Open Creator Analytics" style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 13, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Ionicons name="analytics-outline" size={16} color={colors.primary} />
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '900' }]}>Insights</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <View style={{ width: '48%', flexGrow: 1 }}><Metric icon="sparkles" label="Impact score" value={impact.impact_score} colors={colors} typography={typography} /></View>
            <View style={{ width: '48%', flexGrow: 1 }}><Metric icon="heart" label="Total reactions" value={impact.total_reactions} colors={colors} typography={typography} /></View>
            <View style={{ width: '48%', flexGrow: 1 }}><Metric icon="people" label="Unique supporters" value={impact.unique_supporters} colors={colors} typography={typography} /></View>
            <View style={{ width: '48%', flexGrow: 1 }}><Metric icon="person-add" label="Followers" value={summary?.followers} colors={colors} typography={typography} /></View>
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 18 }]}>Broadcast collection</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <View style={{ width: '31%', minWidth: 104, flexGrow: 1 }}><Metric icon="radio" label="Broadcasts" value={streams.total} colors={colors} typography={typography} /></View>
            <View style={{ width: '31%', minWidth: 104, flexGrow: 1 }}><Metric icon="radio-outline" label="Live now" value={streams.liveNow} colors={colors} typography={typography} /></View>
            <View style={{ width: '31%', minWidth: 104, flexGrow: 1 }}><Metric icon="film" label="Replays ready" value={replays.ready} colors={colors} typography={typography} /></View>
          </View>
        </View>

        <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Recent broadcasts</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>{streams.total || 0} total</Text>
          </View>
          {(streams.recent || []).length ? streams.recent.map((item) => (
            <View key={item.id} style={{ paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name={item.status === 'live' ? 'radio' : 'videocam-outline'} size={18} color={item.status === 'live' ? colors.danger : colors.primary} />
              <View style={{ flex: 1 }}><Text numberOfLines={1} style={[typography.bodyStrong, { color: colors.textPrimary }]}>{item.title || 'LIVE broadcast'}</Text><Text style={[typography.caption, { color: colors.textSecondary }]}>{item.status === 'live' ? 'Currently live' : item.status}</Text></View>
              {item.status === 'live' ? <TouchableOpacity onPress={() => navigation.navigate('LiveModeration', { streamId: item.id, title: item.title || 'LIVE stage' })} accessibilityRole="button" accessibilityLabel={'Manage LIVE participants for ' + (item.title || 'broadcast')} style={{ minHeight: 44, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={[typography.caption, { color: colors.primary, fontWeight: '900' }]}>Manage</Text></TouchableOpacity> : null}
              {item.status === 'ended' ? <TouchableOpacity onPress={() => deleteBroadcast(item)} accessibilityRole="button" accessibilityLabel={'Delete past broadcast ' + (item.title || '')} style={{ width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.danger + '18' }}><Ionicons name="trash-outline" size={17} color={colors.danger} /></TouchableOpacity> : null}
            </View>
          )) : <Text style={[typography.caption, { color: colors.textSecondary }]}>Your broadcasts will appear here after your first LIVE session.</Text>}
        </GlassCard>

        <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Replay collection</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>{replays.total || 0} total</Text>
              <TouchableOpacity onPress={() => navigation.navigate('LiveReplayLibrary')} accessibilityRole="button" accessibilityLabel="Open full LIVE replay library" style={{ minHeight: 44, paddingHorizontal: spacing.sm, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '900' }]}>View all</Text>
              </TouchableOpacity>
            </View>
          </View>
          {(replays.recent || []).length ? replays.recent.map((item) => (
            <View key={item.id} style={{ paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <TouchableOpacity disabled={item.status !== 'ready'} onPress={() => navigation.navigate('LiveReplay', { replay: { ...item, streamId: item.stream_id, creatorId: profile.id, status: item.status } })} accessibilityRole="button" accessibilityLabel={item.status === 'ready' ? 'Watch LIVE replay' : 'LIVE replay ' + item.status} accessibilityState={{ disabled: item.status !== 'ready' }} style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, opacity: item.status === 'ready' ? 1 : 0.72 }}>
                <Ionicons name={item.status === 'ready' ? 'play-circle' : ['starting', 'recording', 'processing'].includes(item.status) ? 'time-outline' : 'alert-circle-outline'} size={22} color={item.status === 'failed' ? colors.danger : colors.primary} />
                <View style={{ flex: 1 }}><Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>LIVE replay</Text><Text style={[typography.caption, { color: item.status === 'failed' ? colors.danger : colors.textSecondary }]}>{item.status === 'ready' ? 'Ready to watch' : item.status === 'failed' ? 'Recording unavailable' : item.status === 'processing' ? 'Preparing replay…' : item.status === 'starting' ? 'Starting recording…' : item.status === 'recording' ? 'Recording in progress…' : 'Unavailable'}</Text></View>
                {item.status === 'ready' ? <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} /> : null}
              </TouchableOpacity>
              {getReplayCreatorId(item) === activeUserIdRef.current && !['starting', 'recording', 'processing'].includes(item.status) ? <TouchableOpacity onPress={() => deleteReplay(item)} accessibilityRole="button" accessibilityLabel="Delete LIVE replay" style={{ width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.danger + '18' }}><Ionicons name="trash-outline" size={17} color={colors.danger} /></TouchableOpacity> : null}
            </View>
          )) : <Text style={[typography.caption, { color: colors.textSecondary }]}>Your saved replay collection will appear here.</Text>}
        </GlassCard>

        <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
          <View style={{ gap: 3 }}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 17 }]}>Creator tools</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Manage your upcoming broadcasts and community presence</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {[
              { route: 'LiveEvents', icon: 'calendar-outline', title: 'Events', detail: 'Schedule & RSVP' },
              { route: 'LiveSettings', icon: 'options-outline', title: 'Preferences', detail: 'Audience & format' },
              { route: 'LiveLeaderboard', icon: 'trophy-outline', title: 'Rankings', detail: 'Creator community' },
            ].map((item) => (
              <TouchableOpacity
                key={item.route}
                onPress={() => navigation.navigate(item.route)}
                accessibilityRole="button"
                accessibilityLabel={'Open LIVE ' + item.title}
                style={{ flexGrow: 1, flexBasis: '30%', minWidth: 132, minHeight: 88, padding: spacing.sm, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
              >
                <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: hexToRgba(colors.primary, 0.12) }}>
                  <Ionicons name={item.icon} size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <Text numberOfLines={1} style={[typography.caption, { color: colors.textPrimary, fontWeight: '900' }]}>{item.title}</Text>
                  <Text numberOfLines={2} style={[typography.caption, { color: colors.textSecondary, fontSize: 10, lineHeight: 14 }]}>{item.detail}</Text>
                </View>
                <Ionicons name="chevron-forward" size={15} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
