import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '../components/GlassCard';
import { backendFetch } from '../services/backendClient';
import { getCurrentUser } from '../services/api';
import { supabase, SUPABASE_ENABLED } from '../services/supabaseClient';
import { useTheme } from '../theme/ThemeContext';
import LivePremiumHeader from '../components/LivePremiumHeader';

function formatDate(value) {
  if (!value) return 'Recently updated';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Recently updated' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

export default function LiveLeaderboardScreen({ navigation }) {
  const { colors, spacing, typography, layout } = useTheme();
  const [entries, setEntries] = useState([]);
  const [followingIds, setFollowingIds] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const activeUserIdRef = useRef(null);
  const refreshRequestRef = useRef(0);

  const visibleEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return query ? entries.filter((entry) => String(entry.name || '').toLowerCase().includes(query)) : entries;
  }, [entries, searchQuery]);

  const refresh = useCallback(async (pull = false) => {
    const requestId = ++refreshRequestRef.current;
    if (pull) setRefreshing(true); else setLoading(true);
    try {
      const startingUser = await getCurrentUser().catch(() => null);
      if (requestId !== refreshRequestRef.current) return;
      const expectedUserId = startingUser?.id || null;
      if (activeUserIdRef.current !== expectedUserId) {
        activeUserIdRef.current = expectedUserId;
        setEntries([]);
        setFollowingIds([]);
      }
      if (!expectedUserId) {
        setEntries([]);
        setFollowingIds([]);
        setError('Sign in to view the LIVE leaderboard.');
        return;
      }
      setCurrentUserId(expectedUserId);
      const [leaderboardResult, followingResult] = await Promise.all([
        backendFetch('/live/leaderboard?period=all_time&limit=50'),
        backendFetch('/live/following').catch(() => ({ following: [] })),
      ]);
      const latestUser = await getCurrentUser().catch(() => null);
      if (requestId !== refreshRequestRef.current || latestUser?.id !== expectedUserId) return;
      setEntries(Array.isArray(leaderboardResult?.entries) ? leaderboardResult.entries : []);
      setFollowingIds((followingResult?.following || []).map((item) => item.creator_id).filter(Boolean));
      setGeneratedAt(leaderboardResult?.generatedAt || null);
      setError('');
    } catch (e) {
      if (requestId === refreshRequestRef.current) {
        setEntries([]);
        setError(e?.message || 'The LIVE leaderboard is temporarily unavailable.');
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
      setEntries([]);
      setFollowingIds([]);
      setCurrentUserId(nextUserId);
      setGeneratedAt(null);
      setError(nextUserId ? '' : 'Sign in to view the LIVE leaderboard.');
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

  const openCreatorProfile = (entry) => {
    if (!entry?.creatorId) return;
    navigation.navigate('LiveCreatorProfile', {
      participant: {
        id: entry.creatorId,
        name: entry.name || 'ZannyChat creator',
        avatarColor: entry.avatarColor || undefined,
      },
      fromLive: true,
      isFollowing: followingIds.includes(entry.creatorId),
      isCurrentUser: entry.creatorId === currentUserId,
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={visibleEntries}
        keyExtractor={(entry) => String(entry.creatorId)}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refresh(true)} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl || 32, flexGrow: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}
        ListHeaderComponent={<View style={{ width: '100%', gap: spacing.md }}>
          <LivePremiumHeader navigation={navigation} eyebrow="ZANNYCHAT · LIVE COMMUNITY" backLabel="Back to LIVE Hub" title="Creator leaderboard" subtitle="Community impact, ranked fairly" icon="trophy-outline" onRefresh={() => refresh()} refreshLabel="Refresh leaderboard" />
          <GlassCard glow contentStyle={{ padding: spacing.lg, gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="trophy" size={24} color={colors.primary} /></View>
              <View style={{ flex: 1, minWidth: 0 }}><Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 18 }]}>All-time creator impact</Text><Text style={[typography.caption, { color: colors.textSecondary }]}>Public creators ranked by verified LIVE impact score</Text></View>
            </View>
            {generatedAt ? <Text style={[typography.caption, { color: colors.textSecondary }]}>Updated {formatDate(generatedAt)}</Text> : null}
          </GlassCard>
          {loading && !entries.length ? <View style={{ padding: spacing.xl, alignItems: 'center', gap: spacing.sm }}><ActivityIndicator color={colors.primary} /><Text style={[typography.caption, { color: colors.textSecondary }]}>Loading creator rankings…</Text></View> : null}
          {!!error ? <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}><Text accessibilityRole="alert" style={[typography.body, { color: colors.danger }]}>{error}</Text><TouchableOpacity onPress={() => refresh()} accessibilityRole="button" accessibilityLabel="Retry loading LIVE leaderboard" style={{ minHeight: 48, justifyContent: 'center' }}><Text style={[typography.bodyStrong, { color: colors.primary }]}>Try again</Text></TouchableOpacity></GlassCard> : null}
          {entries.length ? <View style={{ minHeight: 50, flexDirection: 'row', alignItems: 'center', borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.md }}>
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
            <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Find a creator by name" placeholderTextColor={colors.textSecondary} accessibilityLabel="Search LIVE creators by name" returnKeyType="search" style={[typography.body, { color: colors.textPrimary, flex: 1, minWidth: 0, paddingVertical: spacing.sm, paddingLeft: spacing.sm }]} />
            {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityRole="button" accessibilityLabel="Clear creator search" style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="close-circle" size={18} color={colors.textSecondary} /></TouchableOpacity> : null}
          </View> : null}
        </View>}
        renderItem={({ item: entry }) => (
          <TouchableOpacity onPress={() => openCreatorProfile(entry)} accessibilityRole="button" accessibilityLabel={'Open ' + entry.name + ' creator profile, rank ' + entry.rank} style={{ width: '100%', marginTop: spacing.sm }}>
            <GlassCard contentStyle={{ padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={[typography.bodyStrong, { color: colors.primary, fontSize: 16 }]}>{entry.rank}</Text></View>
              <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: entry.avatarColor || colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}><Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 17 }]}>{String(entry.name || 'C').slice(0, 1).toUpperCase()}</Text></View>
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <Text numberOfLines={1} style={[typography.bodyStrong, { color: colors.textPrimary }]}>{entry.name || 'LIVE Creator'}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Impact {formatNumber(entry.impactScore)} · {formatNumber(entry.totalReactions)} reactions</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>{formatNumber(entry.uniqueSupporters)} unique supporters</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </GlassCard>
          </TouchableOpacity>
        )}
        ListEmptyComponent={entries.length > 0 ? <GlassCard contentStyle={{ padding: spacing.lg, alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }}>
          <Ionicons name="search-outline" size={26} color={colors.textSecondary} />
          <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>No creator matches that name</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>Try another name or clear your search to see the full ranking.</Text>
          <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityRole="button" accessibilityLabel="Clear creator search" style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md }}><Text style={[typography.bodyStrong, { color: colors.primary }]}>Clear search</Text></TouchableOpacity>
        </GlassCard> : !loading && !error ? <GlassCard contentStyle={{ padding: spacing.xl, alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }}>
          <Ionicons name="trophy-outline" size={30} color={colors.textSecondary} />
          <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>The leaderboard is waiting for creators</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }]}>Public creator rankings will appear as LIVE communities build verified impact.</Text>
        </GlassCard> : null}
        ListFooterComponent={<View style={{ width: '100%', marginTop: spacing.md }}>
          <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}><Ionicons name="shield-checkmark-outline" size={19} color={colors.primary} /><Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Fair and privacy-aware rankings</Text></View>
            <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 20 }]}>Only profiles visible to everyone are ranked. Private, contacts-only and blocked creators are excluded. All-time rankings are shown because weekly and monthly score history is not yet available.</Text>
          </GlassCard>
        </View>}
      />
    </SafeAreaView>
  );
}
}
