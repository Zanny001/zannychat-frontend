import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '../components/GlassCard';
import { backendFetch } from '../services/backendClient';
import { supabase, SUPABASE_ENABLED } from '../services/supabaseClient';
import { useTheme } from '../theme/ThemeContext';
import LivePremiumHeader from '../components/LivePremiumHeader';
import { showAppAlert } from '../utils/appDialogs';

function formatRequestDate(value) {
  if (!value) return 'Recently';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Recently' : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function LiveGuestQueueScreen({ route, navigation }) {
  const { colors, spacing, radii, typography, layout } = useTheme();
  const streamId = route.params?.streamId || null;
  const streamTitle = route.params?.title || 'LIVE stage';
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyUserId, setBusyUserId] = useState(null);
  const [error, setError] = useState('');
  const requestGeneration = useRef(0);
  const actionLock = useRef(false);
  const actionGeneration = useRef(0);

  const refresh = useCallback(async (pull = false) => {
    const generation = ++requestGeneration.current;
    if (pull) setRefreshing(true); else setLoading(true);
    setError('');
    if (!streamId) {
      setRequests([]);
      setParticipants([]);
      setError('This guest queue has no active LIVE stream.');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const [queueResult, participantResult] = await Promise.all([
        backendFetch(`/live/${streamId}/guest-requests`),
        backendFetch(`/live/${streamId}/participants`),
      ]);
      if (generation !== requestGeneration.current) return;
      setRequests(Array.isArray(queueResult?.requests) ? queueResult.requests : []);
      setParticipants(Array.isArray(participantResult?.participants) ? participantResult.participants : []);
    } catch (e) {
      if (generation === requestGeneration.current) {
        setError(e?.message || 'Guest requests are temporarily unavailable.');
        setRequests([]);
        setParticipants([]);
      }
    } finally {
      if (generation === requestGeneration.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [streamId]);

  useFocusEffect(useCallback(() => {
    refresh();
    return () => { requestGeneration.current += 1; };
  }, [refresh]));

  useEffect(() => {
    if (!SUPABASE_ENABLED || !supabase?.auth?.onAuthStateChange) return undefined;
    const { data } = supabase.auth.onAuthStateChange(() => {
      requestGeneration.current += 1;
      setRequests([]);
      setParticipants([]);
      setBusyUserId(null);
      actionGeneration.current += 1;
      actionLock.current = false;
      Promise.resolve().then(() => refresh());
    });
    return () => data?.subscription?.unsubscribe?.();
  }, [refresh]);

  const guestCount = participants.filter((item) => item.joined && item.role === 'guest').length;
  const guestSlots = Math.max(0, 5 - guestCount);
  const visibleRequests = requests.filter((item) => {
    const query = searchQuery.trim().toLowerCase();
    return !query || String(item.name || 'ZannyChat viewer').toLowerCase().includes(query);
  });

  const decide = async (userId, status) => {
    if (!streamId || !userId || actionLock.current || (status === 'accepted' && guestSlots <= 0)) return;
    const actionId = ++actionGeneration.current;
    actionLock.current = true;
    setBusyUserId(userId);
    try {
      await backendFetch(`/live/${streamId}/guest-requests/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (actionId !== actionGeneration.current) return;
      setRequests((current) => current.filter((item) => item.user_id !== userId));
      await refresh(true);
    } catch (e) {
      if (actionId !== actionGeneration.current) return;
      showAppAlert(status === 'accepted' ? 'Could not approve guest' : 'Could not decline request', e?.message || 'Refresh the queue and try again.');
      await refresh(true);
    } finally {
      if (actionId === actionGeneration.current) {
        actionLock.current = false;
        setBusyUserId(null);
      }
    }
  };

  const openModeration = () => navigation.navigate('LiveModeration', { streamId, title: streamTitle });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={visibleRequests}
        keyExtractor={(item) => String(item.user_id)}
        renderItem={({ item }) => {
          const busy = busyUserId === item.user_id;
          return <GlassCard style={{ width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', marginBottom: spacing.md }} contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: item.avatarColor || colors.primary, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                <Text accessibilityLabel={(item.name || 'Guest').trim() + ' avatar'} style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '900' }}>{(item.name || 'G').trim().charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={[typography.bodyStrong, { color: colors.textPrimary }]}>{item.name || 'ZannyChat viewer'}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>{formatRequestDate(item.created_at)}</Text>
              </View>
              <View style={{ paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '800' }]}>PENDING</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity disabled={busy} onPress={() => decide(item.user_id, 'declined')} accessibilityRole="button" accessibilityLabel={'Decline guest request from ' + (item.name || 'viewer')} style={{ flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.6 : 1 }}>
                <Text style={[typography.bodyStrong, { color: colors.textSecondary }]}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={busy || guestSlots <= 0} onPress={() => decide(item.user_id, 'accepted')} accessibilityRole="button" accessibilityLabel={'Approve guest request from ' + (item.name || 'viewer')} accessibilityState={{ disabled: busy || guestSlots <= 0 }} style={{ flex: 1, minHeight: 48, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: busy || guestSlots <= 0 ? 0.55 : 1 }}>
                <Text style={[typography.bodyStrong, { color: colors.onPrimary }]}>{busy ? 'Updating…' : guestSlots <= 0 ? 'Stage full' : 'Approve guest'}</Text>
              </TouchableOpacity>
            </View>
            {guestSlots <= 0 ? <Text style={[typography.caption, { color: colors.warning }]}>All five guest seats are occupied. Remove a guest before approving another request.</Text> : null}
          </GlassCard>;
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refresh(true)} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl || 32, flexGrow: 1, alignItems: 'center' }}
        ListHeaderComponent={        <View style={{ width: '100%', maxWidth: layout.contentMaxWidth, gap: spacing.md }}>
          <LivePremiumHeader
            navigation={navigation}
            eyebrow="ZANNYCHAT · LIVE OPERATIONS"
            backLabel="Back to LIVE management"
            title="Guest queue"
            subtitle={"Review stage requests · " + streamTitle}
            icon="people-outline"
            onRefresh={() => refresh()}
            refreshLabel="Refresh guest queue"
          />

          <GlassCard glow contentStyle={{ padding: spacing.lg, gap: spacing.sm }}>
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '900', letterSpacing: 1.1 }]}>CURRENT STAGE</Text>
            <Text style={[typography.heading, { color: colors.textPrimary, fontSize: 19 }]}>{streamTitle}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
              <View>
                <Text style={[typography.heading, { color: colors.textPrimary, fontSize: 27 }]}>{guestCount}/5</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Guest seats occupied</Text>
              </View>
              <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: guestSlots ? colors.border : colors.warning, backgroundColor: colors.surface }}>
                <Text style={[typography.caption, { color: guestSlots ? colors.success : colors.warning, fontWeight: '800' }]}>{guestSlots} seats available</Text>
              </View>
            </View>
            <TouchableOpacity onPress={openModeration} accessibilityRole="button" accessibilityLabel="Manage LIVE participants" style={{ minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Ionicons name="people-outline" size={18} color={colors.primary} />
              <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Manage participants</Text>
            </TouchableOpacity>
          </GlassCard>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 18 }]}>Requests to join</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Approve only people you want on stage</Text>
            </View>
            <Text style={[typography.bodyStrong, { color: colors.primary }]}>{requests.length}</Text>
          </View>

          {loading && !requests.length ? <View style={{ padding: spacing.xl, alignItems: 'center', gap: spacing.sm }}><ActivityIndicator color={colors.primary} /><Text style={[typography.caption, { color: colors.textSecondary }]}>Loading guest requests…</Text></View> : null}
          {!!error ? <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}><Text accessibilityRole="alert" style={[typography.body, { color: colors.danger }]}>{error}</Text><TouchableOpacity onPress={() => refresh()} accessibilityRole="button" accessibilityLabel="Retry loading guest queue" style={{ minHeight: 48, justifyContent: 'center' }}><Text style={[typography.bodyStrong, { color: colors.primary }]}>Try again</Text></TouchableOpacity></GlassCard> : null}



        </View>}
        ListEmptyComponent={!loading && !error ? <View style={{ width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}>
          <GlassCard contentStyle={{ padding: spacing.xl, alignItems: 'center', gap: spacing.sm }}>
            <Ionicons name="people-outline" size={30} color={colors.textSecondary} />
            <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Your queue is clear</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }]}>New viewer requests will appear here while your LIVE allows guests.</Text>
          </GlassCard>
        </View> : null}
      />
    </SafeAreaView>
  );
}
