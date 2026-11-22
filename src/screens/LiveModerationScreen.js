import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '../components/GlassCard';
import { backendFetch } from '../services/backendClient';
import { supabase, SUPABASE_ENABLED } from '../services/supabaseClient';
import { useTheme } from '../theme/ThemeContext';
import LivePremiumHeader from '../components/LivePremiumHeader';
import { confirmAction, showAppAlert } from '../utils/appDialogs';
import { hexToRgba } from '../utils/color';

export default function LiveModerationScreen({ route, navigation }) {
  const { colors, spacing, radii, typography, layout } = useTheme();
  const streamId = route.params?.streamId || null;
  const streamTitle = route.params?.title || 'LIVE stage';
  const [participants, setParticipants] = useState([]);
  const [participantFilter, setParticipantFilter] = useState('all');
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
      setParticipants([]);
      setError('Participant management requires an active LIVE stream.');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const result = await backendFetch(`/live/${streamId}/participants`);
      if (generation !== requestGeneration.current) return;
      setParticipants(Array.isArray(result?.participants) ? result.participants : []);
    } catch (e) {
      if (generation === requestGeneration.current) {
        setParticipants([]);
        setError(e?.message || 'LIVE participants are temporarily unavailable.');
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
      setParticipants([]);
      setBusyUserId(null);
      actionGeneration.current += 1;
      actionLock.current = false;
      Promise.resolve().then(() => refresh());
    });
    return () => data?.subscription?.unsubscribe?.();
  }, [refresh]);

  const visibleParticipants = useMemo(() => {
    if (participantFilter === 'viewers') return participants.filter((item) => item.joined && item.role === 'viewer');
    if (participantFilter === 'guests') return participants.filter((item) => item.joined && item.role === 'guest');
    if (participantFilter === 'moderators') return participants.filter((item) => item.moderator);
    return participants;
  }, [participantFilter, participants]);

  const counts = useMemo(() => ({
    viewers: participants.filter((item) => item.joined && item.role === 'viewer').length,
    guests: participants.filter((item) => item.joined && item.role === 'guest').length,
    moderators: participants.filter((item) => item.moderator).length,
  }), [participants]);

  const perform = async (userId, action, operation, successMessage) => {
    if (!streamId || !userId || actionLock.current) return;
    const actionId = ++actionGeneration.current;
    actionLock.current = true;
    setBusyUserId(userId);
    try {
      const result = await operation();
      if (actionId !== actionGeneration.current) return;
      if (action === 'remove') {
        const returned = result?.returnedToAudience;
        const message = returned === true
          ? 'The guest has returned to the audience and can keep watching.'
          : result?.returnedToAudience === false
            ? 'The guest connection had already ended. Guest access has been revoked.'
            : successMessage;
        showAppAlert('Participant updated', message);
      } else if (successMessage) {
        showAppAlert('LIVE moderation updated', successMessage);
      }
      await refresh(true);
    } catch (e) {
      if (actionId !== actionGeneration.current) return;
      showAppAlert('Could not update LIVE participant', e?.message || 'Refresh the participant list and try again.');
      await refresh(true);
    } finally {
      if (actionId === actionGeneration.current) {
        actionLock.current = false;
        setBusyUserId(null);
      }
    }
  };

  const setModerator = async (item) => {
    const makeModerator = !item.moderator;
    await perform(item.userId, 'moderator', () => backendFetch(
      makeModerator ? `/live/${streamId}/moderators` : `/live/${streamId}/moderators/${item.userId}`,
      { method: makeModerator ? 'POST' : 'DELETE', ...(makeModerator ? { body: JSON.stringify({ userId: item.userId }) } : {}) },
    ), makeModerator ? 'Moderator access granted.' : 'Moderator access removed.');
  };

  const toggleMute = async (item) => {
    const nextMuted = !item.microphoneMuted;
    await perform(item.userId, 'mute', () => backendFetch(`/live/${streamId}/guests/${item.userId}/mute`, {
      method: 'PATCH', body: JSON.stringify({ muted: nextMuted }),
    }), nextMuted ? 'Guest microphone muted.' : 'Guest microphone unmuted.');
  };

  const toggleSpotlight = async (item) => {
    const nextSpotlight = !item.spotlighted;
    await perform(item.userId, 'spotlight', () => backendFetch(`/live/${streamId}/guests/${item.userId}/spotlight`, {
      method: 'PATCH', body: JSON.stringify({ spotlighted: nextSpotlight }),
    }), nextSpotlight ? 'Guest spotlight enabled.' : 'Guest spotlight cleared.');
  };

  const remove = async (item) => {
    const isGuest = item.role === 'guest';
    const confirmed = await confirmAction({
      title: isGuest ? 'Move guest to audience?' : 'Remove viewer from LIVE?',
      message: isGuest
        ? 'Their publishing permission will be revoked. They can continue watching this LIVE as a viewer.'
        : 'This viewer will be blocked from rejoining this LIVE. This does not block their ZannyChat account.',
      confirmText: isGuest ? 'Move to audience' : 'Remove viewer',
    });
    if (!confirmed) return;
    await perform(item.userId, 'remove', () => backendFetch(
      isGuest ? `/live/${streamId}/guests/${item.userId}` : `/live/${streamId}/participants/${item.userId}`,
      { method: 'DELETE' },
    ), isGuest ? 'Guest moved to audience.' : 'Viewer removed from this LIVE.');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={visibleParticipants}
        keyExtractor={(item) => String(item.userId)}
        renderItem={({ item }) => {
          const busy = busyUserId === item.userId;
          const guest = item.role === 'guest';
          const viewer = item.role === 'viewer' && item.joined;
          const label = item.role === 'creator' ? 'HOST' : guest ? 'STAGE GUEST' : viewer ? 'VIEWER' : item.moderator ? 'MODERATOR' : 'PARTICIPANT';
          return <GlassCard style={{ width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', marginBottom: spacing.md }} contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: item.avatarColor || colors.primary, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                <Text accessibilityLabel={(item.name || 'Participant').trim() + ' avatar'} style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '900' }}>{(item.name || 'P').trim().charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={[typography.bodyStrong, { color: colors.textPrimary }]}>{item.name || 'ZannyChat participant'}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}{item.spotlighted ? ' · SPOTLIGHT' : ''}{item.microphoneMuted === true ? ' · MIC MUTED' : item.microphoneMuted === false ? ' · MIC ON' : ''}{item.cameraEnabled === true ? ' · CAMERA ON' : item.cameraEnabled === false ? ' · CAMERA OFF' : ''}{item.connectionStatus === 'connected' ? ' · CONNECTED' : ' · RECONNECTING'}</Text>
              </View>
              {item.moderator ? <View style={{ paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9, borderWidth: 1, borderColor: colors.primary }}><Text style={[typography.caption, { color: colors.primary, fontWeight: '800' }]}>MOD</Text></View> : null}
            </View>
            {guest ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              <TouchableOpacity disabled={busy || item.microphoneMuted === null} onPress={() => toggleMute(item)} accessibilityRole="button" accessibilityLabel={item.microphoneMuted ? 'Unmute guest microphone' : 'Mute guest microphone'} style={{ flex: 1, minWidth: 108, minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', opacity: busy || item.microphoneMuted === null ? 0.5 : 1 }}>
                <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '800' }]}>{item.microphoneMuted === null ? 'Mic state unavailable' : item.microphoneMuted ? 'Unmute mic' : 'Mute mic'}</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={busy} onPress={() => toggleSpotlight(item)} accessibilityRole="button" accessibilityLabel={item.spotlighted ? 'Remove guest spotlight' : 'Spotlight guest'} style={{ flex: 1, minWidth: 108, minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : 1 }}>
                <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '800' }]}>{item.spotlighted ? 'Remove spotlight' : 'Spotlight'}</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={busy} onPress={() => remove(item)} accessibilityRole="button" accessibilityLabel="Move guest to audience" style={{ flex: 1, minWidth: 108, minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: colors.warning, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : 1 }}>
                <Text style={[typography.caption, { color: colors.warning, fontWeight: '800' }]}>Move to audience</Text>
              </TouchableOpacity>
            </View> : null}
            {viewer ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              <TouchableOpacity disabled={busy} onPress={() => setModerator(item)} accessibilityRole="button" accessibilityLabel={item.moderator ? 'Remove moderator access' : 'Make participant a moderator'} style={{ flex: 1, minWidth: 120, minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : 1 }}>
                <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '800' }]}>{item.moderator ? 'Remove moderator' : 'Make moderator'}</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={busy} onPress={() => remove(item)} accessibilityRole="button" accessibilityLabel="Remove viewer from LIVE" style={{ flex: 1, minWidth: 120, minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: colors.danger, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : 1 }}>
                <Text style={[typography.caption, { color: colors.danger, fontWeight: '800' }]}>Remove from LIVE</Text>
              </TouchableOpacity>
            </View> : null}
            {!guest && !viewer && item.moderator ? <TouchableOpacity disabled={busy} onPress={() => setModerator(item)} accessibilityRole="button" accessibilityLabel="Remove moderator access" style={{ minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : 1 }}>
              <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '800' }]}>Remove moderator access</Text>
            </TouchableOpacity> : null}
            {busy ? <Text style={[typography.caption, { color: colors.primary }]}>Updating participant…</Text> : null}
          </GlassCard>;
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refresh(true)} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl || 32, alignItems: 'center', flexGrow: 1 }}
        ListHeaderComponent={        <View style={{ width: '100%', maxWidth: layout.contentMaxWidth, gap: spacing.md }}>
          <LivePremiumHeader
            navigation={navigation}
            eyebrow="ZANNYCHAT · LIVE CONTROL"
            backLabel="Back to LIVE stage"
            title="Moderation"
            subtitle={"Roles and stage access · " + streamTitle}
            icon="shield-checkmark-outline"
            onRefresh={() => refresh(true)}
            refreshLabel="Refresh LIVE participants"
          />

          <GlassCard glow contentStyle={{ padding: spacing.lg, gap: spacing.md }}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>ACTIVE SESSION</Text>
            <Text style={[typography.heading, { color: colors.textPrimary, fontSize: 19 }]}>{streamTitle}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {[[counts.viewers, 'Viewers'], [counts.guests, 'Guests'], [counts.moderators, 'Moderators']].map(([value, label]) => (
                <View key={label} style={{ flex: 1, minWidth: 90, padding: spacing.sm, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
                  <Text style={[typography.heading, { color: colors.textPrimary, fontSize: 22 }]}>{value}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity onPress={() => navigation.navigate('LiveGuestQueue', { streamId, title: streamTitle })} accessibilityRole="button" accessibilityLabel="Open LIVE guest queue" style={{ flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Ionicons name="person-add-outline" size={18} color={colors.primary} />
                <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '800' }]}>Guest queue</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('LiveReports', { streamId, title: streamTitle })} accessibilityRole="button" accessibilityLabel="Open LIVE safety reports" style={{ flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '800' }]}>Safety reports</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>

          <View style={{ gap: spacing.sm }}>
            <View style={{ gap: 3 }}>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 18 }]}>People in this LIVE</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Controls are limited by your creator permissions and each participant's current role.</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {[
                { value: 'all', label: 'Everyone', count: participants.length },
                { value: 'viewers', label: 'Viewers', count: counts.viewers },
                { value: 'guests', label: 'Stage guests', count: counts.guests },
                { value: 'moderators', label: 'Moderators', count: counts.moderators },
              ].map((option) => {
                const selected = participantFilter === option.value;
                return <TouchableOpacity key={option.value} onPress={() => setParticipantFilter(option.value)} accessibilityRole="radio" accessibilityLabel={`Show ${option.label.toLowerCase()}`} accessibilityState={{ checked: selected }} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: spacing.md, borderRadius: 14, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? hexToRgba(colors.primary, 0.16) : colors.surface }}>
                  <Text style={[typography.caption, { color: selected ? colors.primary : colors.textSecondary, fontWeight: selected ? '900' : '700' }]}>{option.label}</Text>
                  <Text style={[typography.small, { color: selected ? colors.primary : colors.textSecondary }]}>{option.count}</Text>
                </TouchableOpacity>;
              })}
            </View>
          </View>

          {loading && !participants.length ? <View style={{ padding: spacing.xl, alignItems: 'center', gap: spacing.sm }}><ActivityIndicator color={colors.primary} /><Text style={[typography.caption, { color: colors.textSecondary }]}>Loading participants…</Text></View> : null}
          {!!error ? <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}><Text accessibilityRole="alert" style={[typography.body, { color: colors.danger }]}>{error}</Text><TouchableOpacity onPress={() => refresh()} accessibilityRole="button" accessibilityLabel="Retry loading LIVE participants" style={{ minHeight: 48, justifyContent: 'center' }}><Text style={[typography.bodyStrong, { color: colors.primary }]}>Try again</Text></TouchableOpacity></GlassCard> : null}



        </View>}
        ListEmptyComponent={!loading && !error ? <View style={{ width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}>
          <GlassCard contentStyle={{ padding: spacing.xl, alignItems: 'center', gap: spacing.sm }}>
            <Ionicons name="people-outline" size={30} color={colors.textSecondary} />
            <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{participants.length ? 'No participants in this view' : 'No participants to manage'}</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>{participants.length ? 'Choose another role filter to see more people.' : 'Joined viewers, stage guests and appointed moderators will appear here.'}</Text>
          </GlassCard>
        </View> : null}
      />
    </SafeAreaView>
  );
}
