import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { backendFetch } from '../services/backendClient';
import { getCurrentUser } from '../services/api';
import { supabase, SUPABASE_ENABLED } from '../services/supabaseClient';
import { useTheme } from '../theme/ThemeContext';
import LivePremiumHeader from '../components/LivePremiumHeader';
import GlassCard from '../components/GlassCard';
import { hexToRgba } from '../utils/color';
import { confirmAction, showAppAlert } from '../utils/appDialogs';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'mine', label: 'My recordings' },
  { value: 'ready', label: 'Ready' },
  { value: 'processing', label: 'Processing' },
  { value: 'failed', label: 'Unavailable' },
];
const PENDING = new Set(['starting', 'recording', 'processing']);

function replayDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function replayStatus(status) {
  if (status === 'ready') return { label: 'Ready to watch', icon: 'checkmark-circle', color: 'success' };
  if (status === 'processing') return { label: 'Preparing replay', icon: 'time-outline', color: 'primary' };
  if (status === 'recording') return { label: 'Recording in progress', icon: 'radio-button-on', color: 'danger' };
  if (status === 'starting') return { label: 'Starting recording', icon: 'hourglass-outline', color: 'primary' };
  return { label: 'Unavailable', icon: 'alert-circle-outline', color: 'danger' };
}

export default function LiveReplayLibraryScreen({ navigation }) {
  const { colors, spacing, radii, typography } = useTheme();
  const [replays, setReplays] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const activeUserIdRef = useRef(null);
  const requestRef = useRef(0);

  const refresh = useCallback(async (isRefresh = false) => {
    const requestId = ++requestRef.current;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const owner = await getCurrentUser().catch(() => null);
      if (requestId !== requestRef.current) return;
      const expectedUserId = owner?.id || null;
      if (activeUserIdRef.current !== expectedUserId) {
        activeUserIdRef.current = expectedUserId;
        setCurrentUserId(expectedUserId);
        setReplays([]);
      }
      if (!expectedUserId) {
        setReplays([]);
        setError('Sign in to view your replay library.');
        return;
      }
      const result = await backendFetch('/live/replays');
      const latest = await getCurrentUser().catch(() => null);
      if (requestId !== requestRef.current || latest?.id !== expectedUserId) return;
      setCurrentUserId(expectedUserId);
      setReplays(Array.isArray(result?.replays) ? result.replays : []);
    } catch (e) {
      if (requestId === requestRef.current) {
        setError(e?.message || 'Your LIVE replay library is temporarily unavailable.');
      }
    } finally {
      if (requestId === requestRef.current) {
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
      requestRef.current += 1;
      setCurrentUserId(nextUserId);
      setReplays([]);
      setError(nextUserId ? '' : 'Sign in to view your replay library.');
      setLoading(Boolean(nextUserId));
      setRefreshing(false);
      if (nextUserId) Promise.resolve().then(() => refresh());
    });
    return () => data?.subscription?.unsubscribe?.();
  }, [refresh]);

  useFocusEffect(useCallback(() => {
    refresh();
    return () => { requestRef.current += 1; };
  }, [refresh]));

  const visibleReplays = useMemo(() => {
    if (filter === 'all') return replays;
    if (filter === 'mine') return replays.filter((item) => item.creatorId === currentUserId);
    if (filter === 'processing') return replays.filter((item) => PENDING.has(item.status));
    if (filter === 'failed') return replays.filter((item) => !PENDING.has(item.status) && item.status !== 'ready');
    return replays.filter((item) => item.status === filter);
  }, [currentUserId, filter, replays]);

  const readyCount = replays.filter((item) => item.status === 'ready').length;
  const processingCount = replays.filter((item) => PENDING.has(item.status)).length;

  const deleteReplay = async (item) => {
    if (!item?.id || item.creatorId !== activeUserIdRef.current || PENDING.has(item.status)) return;
    const confirmed = await confirmAction({
      title: 'Delete LIVE replay?',
      message: 'This permanently deletes the saved recording. This cannot be undone.',
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    const expectedUserId = activeUserIdRef.current;
    try {
      await backendFetch('/live/replays/' + encodeURIComponent(item.id), { method: 'DELETE' });
      const latest = await getCurrentUser().catch(() => null);
      if (!expectedUserId || latest?.id !== expectedUserId) return;
      setReplays((current) => current.filter((row) => row.id !== item.id));
    } catch (e) {
      showAppAlert('Could not delete replay', e?.message || 'Please try again.');
    }
  };

  const renderReplay = ({ item }) => {
    const state = replayStatus(item.status);
    const stateColor = colors[state.color] || colors.primary;
    const canWatch = item.status === 'ready';
    const canDelete = item.creatorId === currentUserId && !PENDING.has(item.status);
    return (
      <GlassCard style={{ width: '94%', maxWidth: 760, alignSelf: 'center', marginBottom: spacing.md }} contentStyle={{ padding: spacing.md, gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
          <View style={{ width: 76, height: 76, borderRadius: 19, overflow: 'hidden', backgroundColor: hexToRgba(colors.primary, 0.14), borderWidth: 1, borderColor: hexToRgba(colors.primary, 0.28), alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ position: 'absolute', width: 54, height: 54, borderRadius: 27, backgroundColor: hexToRgba(colors.accent, 0.12), top: -20, right: -15 }} />
            <Ionicons name="play-circle" size={34} color={colors.primary} />
            <Text style={{ color: colors.textSecondary, fontSize: 8, fontWeight: '900', letterSpacing: 1.1, marginTop: 2 }}>REPLAY</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={2} style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 16, lineHeight: 22 }]}>{item.streamTitle || item.title || 'LIVE broadcast'}</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>{replayDate(item.completedAt || item.completed_at || item.createdAt || item.created_at)}</Text>
            <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, backgroundColor: hexToRgba(stateColor, 0.12), borderWidth: 1, borderColor: hexToRgba(stateColor, 0.22) }}>
              <Ionicons name={state.icon} size={14} color={stateColor} />
              <Text style={[typography.caption, { color: stateColor, fontWeight: '900' }]}>{state.label}</Text>
            </View>
          </View>
          {canDelete ? (
            <TouchableOpacity onPress={() => deleteReplay(item)} accessibilityRole="button" accessibilityLabel="Delete LIVE replay" style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: hexToRgba(colors.danger, 0.10), alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>{item.durationSeconds ? Math.round(item.durationSeconds / 60) + ' min' : 'Duration pending'}{item.fileSizeBytes ? ' · ' + (item.fileSizeBytes / 1048576).toFixed(1) + ' MB' : ''}</Text>
          {canWatch ? (
            <TouchableOpacity onPress={() => navigation.navigate('LiveReplay', { replay: item })} accessibilityRole="button" accessibilityLabel={'Watch replay: ' + (item.streamTitle || 'LIVE replay')} style={{ minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radii.md, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <Ionicons name="play" size={16} color={colors.onPrimary} />
              <Text style={[typography.small, { color: colors.onPrimary, fontWeight: '900' }]}>Watch replay</Text>
            </TouchableOpacity>
          ) : (
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Replay access is not ready</Text>
          )}
        </View>
      </GlassCard>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={visibleReplays}
        keyExtractor={(item) => item.id}
        renderItem={renderReplay}
        refreshing={refreshing}
        onRefresh={() => refresh(true)}
        contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: spacing.xxl || 32, flexGrow: 1, alignItems: 'center' }}
        ListHeaderComponent={
          <View style={{ width: '94%', maxWidth: 760, alignSelf: 'center', paddingBottom: spacing.lg || 24, gap: spacing.md }}>
            <LivePremiumHeader
              navigation={navigation}
              eyebrow="ZANNYCHAT · LIVE ARCHIVE"
              title="Replay library"
              subtitle="Your best LIVE moments, kept close."
              icon="albums-outline"
              onRefresh={() => refresh(true)}
              refreshLabel="Refresh replay library"
            />
            <GlassCard glow contentStyle={{ padding: spacing.lg || 20, gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: hexToRgba(colors.primary, 0.12), alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="albums-outline" size={21} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Recent LIVE recordings</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>Recent recordings you are allowed to watch. Ready replays expire after seven days.</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1, padding: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surface }}>
                  <Text style={[typography.heading, { color: colors.textPrimary, fontSize: 22 }]}>{replays.length}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>Total replays</Text>
                </View>
                <View style={{ flex: 1, padding: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surface }}>
                  <Text style={[typography.heading, { color: colors.success, fontSize: 22 }]}>{readyCount}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>Ready</Text>
                </View>
                <View style={{ flex: 1, padding: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surface }}>
                  <Text style={[typography.heading, { color: colors.primary, fontSize: 22 }]}>{processingCount}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>Processing</Text>
                </View>
              </View>
            </GlassCard>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {FILTERS.map((option) => {
                const selected = filter === option.value;
                return (
                  <TouchableOpacity key={option.value} onPress={() => setFilter(option.value)} accessibilityRole="radio" accessibilityLabel={'Show ' + option.label + ' replays'} accessibilityState={{ checked: selected }} style={{ minHeight: 44, paddingHorizontal: spacing.md, borderRadius: 16, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={[typography.caption, { color: selected ? colors.onPrimary : colors.textSecondary, fontWeight: '800' }]}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {loading && <View style={{ alignItems: 'center', paddingVertical: spacing.md }}><ActivityIndicator color={colors.primary} /><Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>Loading your replay library…</Text></View>}
            {!!error && <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}><Text accessibilityRole="alert" style={[typography.caption, { color: colors.danger }]}>{error}</Text><TouchableOpacity onPress={() => refresh()} accessibilityRole="button" accessibilityLabel="Retry loading replay library" style={{ minHeight: 44, justifyContent: 'center' }}><Text style={[typography.bodyStrong, { color: colors.primary }]}>Try again</Text></TouchableOpacity></GlassCard>}
          </View>
        }
        ListEmptyComponent={!loading && !error ? (
          <GlassCard style={{ width: '94%', maxWidth: 760, alignSelf: 'center' }} contentStyle={{ padding: spacing.lg, alignItems: 'center', gap: spacing.sm }}>
            <View style={{ width: 62, height: 62, borderRadius: 21, backgroundColor: hexToRgba(colors.primary, 0.10), alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="film-outline" size={29} color={colors.primary} />
            </View>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>No replays in this view</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }]}>{filter === 'all' ? 'When a LIVE recording is ready, it will appear here.' : 'Try another filter to see more of your recordings.'}</Text>
          </GlassCard>
        ) : null}
      />
    </SafeAreaView>
  );
}
