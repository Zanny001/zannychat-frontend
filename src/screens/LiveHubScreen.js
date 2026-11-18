import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, FlatList, Platform, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { backendFetch } from '../services/backendClient';
import { getCurrentUser } from '../services/api';
import { supabase, SUPABASE_ENABLED } from '../services/supabaseClient';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../utils/color';
import { confirmAction, showAppAlert } from '../utils/appDialogs';
import GlassCard from '../components/GlassCard';
import { filterLiveStreams } from '../utils/liveDiscovery';

const VISIBILITIES = [
  { value: 'public', label: 'Public' },
  { value: 'followers', label: 'Followers' },
  { value: 'private', label: 'Private' },
];
const VISIBILITY_DETAILS = {
  public: 'Anyone can discover your LIVE',
  followers: 'Only people following you',
  private: 'Invite people from your chats',
};
const STREAM_FILTERS = [
  { value: 'all', label: 'All LIVE' },
  { value: 'following', label: 'Following' },
  { value: 'public', label: 'Public' },
];

export default function LiveHubScreen({ navigation, route }) {
  const { colors, spacing, radii, typography } = useTheme();
  const [streams, setStreams] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [replays, setReplays] = useState([]);
  const [replayError, setReplayError] = useState('');
  const [replayLoaded, setReplayLoaded] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const pendingReplayPollStartedAt = useRef(0);
  const refreshRequestRef = useRef(0);
  const activeUserIdRef = useRef(null);
  const [followingIds, setFollowingIds] = useState([]);
  const [followingCreators, setFollowingCreators] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [allowGuests, setAllowGuests] = useState(false);
  const [inviteCandidates, setInviteCandidates] = useState([]);
  const [selectedInvitees, setSelectedInvitees] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startStage, setStartStage] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const handledLiveNotificationRef = useRef(null);

  const refreshPendingReplays = useCallback(async () => {
    const expectedUserId = currentUserId;
    const pending = replays.filter((item) => ['starting', 'recording', 'processing'].includes(item.status));
    if (!expectedUserId || !pending.length) return;
    const results = await Promise.all(pending.map(async (item) => {
      try {
        const result = await backendFetch(`/live/${item.streamId}/replays`);
        const updated = (result?.replays || []).find((row) => row.id === item.id);
        return updated ? [item.id, updated] : null;
      } catch (_) {
        return null;
      }
    }));
    const latestUser = await getCurrentUser().catch(() => null);
    if (latestUser?.id !== expectedUserId) return;
    const updates = new Map(results.filter(Boolean));
    if (updates.size) {
      setReplays((current) => {
        let changed = false;
        const next = current.map((item) => {
          const update = updates.get(item.id);
          if (!update || (item.status === update.status && item.durationSeconds === update.duration_seconds)) return item;
          changed = true;
          return { ...item, status: update.status, durationSeconds: update.duration_seconds, fileSizeBytes: update.file_size_bytes, completedAt: update.completed_at };
        });
        return changed ? next : current;
      });
    }
  }, [currentUserId, replays]);

  const visibleStreams = filterLiveStreams(streams, {
    filter: activeFilter,
    followingIds,
    query: searchQuery,
  });

  const refresh = useCallback(async () => {
    const requestId = ++refreshRequestRef.current;
    setLoading(true);
    try {
      // Capture the identity before issuing account-scoped LIVE requests.
      // If auth changes while they are in flight, discard the old response.
      const startingUser = await getCurrentUser().catch(() => null);
      // An auth event may have invalidated this refresh while identity was
      // being resolved; never let that stale lookup overwrite the new owner.
      if (requestId !== refreshRequestRef.current) return;
      const expectedUserId = startingUser?.id || null;
      if (activeUserIdRef.current !== expectedUserId) {
        activeUserIdRef.current = expectedUserId;
        setStreams([]);
        setInvitations([]);
        setReplays([]);
        setReplayLoaded(false);
        setReplayError('');
        setFollowingCreators([]);
        setFollowingIds([]);
        setInviteCandidates([]);
        setSelectedInvitees([]);
        setCurrentUserId(expectedUserId);
      }

      const [publicResult, followedResult, followResult, inviteResult, replayResult] = await Promise.all([
        backendFetch('/live').then((result) => ({ result, error: null })).catch((error) => ({ result: { streams: [] }, error })),
        backendFetch('/live/following/streams').catch(() => ({ streams: [] })),
        backendFetch('/live/following').catch(() => ({ following: [] })),
        backendFetch('/live/invitations').catch(() => ({ invitations: [] })),
        backendFetch('/live/replays').then((result) => ({ result, error: null })).catch((error) => ({ result: { replays: [] }, error })),
      ]);
      const latestUser = await getCurrentUser().catch(() => null);
      if (requestId !== refreshRequestRef.current || latestUser?.id !== expectedUserId) return;

      const allStreams = [...(publicResult?.result?.streams || []), ...(followedResult?.streams || [])];
      setStreams([...new Map(allStreams.map((item) => [item.id, item])).values()]);
      setFollowingCreators(followResult?.following || []);
      setFollowingIds((followResult?.following || []).map((item) => item.creator_id));
      setInvitations((inviteResult?.invitations || []).filter((item) => item.stream));
      setReplays(Array.isArray(replayResult?.result?.replays) ? replayResult.result.replays : []);
      setReplayLoaded(!replayResult?.error);
      setReplayError(replayResult?.error ? 'LIVE replays are temporarily unavailable. Please try again.' : '');
      setCurrentUserId(expectedUserId);
      setError(publicResult?.error?.message || '');
    } catch (e) {
      if (requestId !== refreshRequestRef.current) return;
      setError(e?.message || 'LIVE discovery is unavailable.');
      setReplayLoaded(false);
      setReplayError('LIVE replays could not be refreshed. Please try again.');
    } finally {
      if (requestId === refreshRequestRef.current) setLoading(false);
    }
  }, []);

  // Auth can change while this tab remains mounted. Clear account-owned LIVE
  // state immediately, invalidate in-flight requests, and refresh only after
  // Supabase has published the new session.
  useEffect(() => {
    if (!SUPABASE_ENABLED || !supabase?.auth?.onAuthStateChange) return undefined;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user?.id || null;
      if (activeUserIdRef.current === nextUserId) return;
      activeUserIdRef.current = nextUserId;
      refreshRequestRef.current += 1;
      setCurrentUserId(nextUserId);
      setStreams([]);
      setInvitations([]);
      setReplays([]);
      setReplayLoaded(false);
      setReplayError('');
      setFollowingCreators([]);
      setFollowingIds([]);
      setInviteCandidates([]);
      setSelectedInvitees([]);
      setTitle('');
      setDescription('');
      setVisibility('public');
      setAllowGuests(false);
      setSearchQuery('');
      setActiveFilter('all');
      setShowComposer(false);
      setLoading(Boolean(nextUserId));
      setError('');
      if (nextUserId) Promise.resolve().then(() => refresh());
    });
    return () => data?.subscription?.unsubscribe?.();
  }, [refresh]);

  useFocusEffect(useCallback(() => {
    pendingReplayPollStartedAt.current = Date.now();
    refresh();
  }, [refresh]));

  const hasPendingReplays = replays.some((item) => ['starting', 'recording', 'processing'].includes(item.status));
  useFocusEffect(useCallback(() => {
    if (!hasPendingReplays) {
      pendingReplayPollStartedAt.current = 0;
      return undefined;
    }
    if (!pendingReplayPollStartedAt.current) pendingReplayPollStartedAt.current = Date.now();
    const interval = setInterval(() => {
      if (AppState.currentState && AppState.currentState !== 'active') return;
      if (Date.now() - pendingReplayPollStartedAt.current >= 5 * 60 * 1000) {
        clearInterval(interval);
        return;
      }
      refreshPendingReplays();
    }, 15000);
    return () => clearInterval(interval);
  }, [hasPendingReplays, refreshPendingReplays]));

  const openReplay = (item) => navigation.navigate('LiveReplay', { replay: item });

  const deleteReplay = async (item) => {
    const confirmed = await confirmAction({
      title: 'Delete LIVE replay?',
      message: 'The saved video file will be permanently deleted. This cannot be undone.',
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    try {
      await backendFetch('/live/replays/' + encodeURIComponent(item.id), { method: 'DELETE' });
      setReplays((current) => current.filter((replay) => replay.id !== item.id));
    } catch (e) {
      showAppAlert('Could not delete replay', e?.message || 'Please try again.');
    }
  };

  const loadInviteCandidates = async () => {
    setLoadingCandidates(true);
    try {
      const result = await backendFetch('/live/invite-candidates');
      setInviteCandidates(Array.isArray(result?.candidates) ? result.candidates : []);
    } catch (e) {
      Alert.alert('Contacts unavailable', e?.message || 'Could not load people from your chats.');
    } finally {
      setLoadingCandidates(false);
    }
  };

  const toggleInvitee = (userId) => {
    setSelectedInvitees((current) => current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId]);
  };

  const startLive = async () => {
    if (!title.trim()) return Alert.alert('Add a title', 'Give your LIVE stream a short title first.');
    const invitees = [...new Set(selectedInvitees)];
    if (visibility === 'private' && invitees.length === 0) {
      return Alert.alert('Add invitees', 'Choose at least one person from your existing chats.');
    }
    setBusy(true);
    setError('');
    setStartStage(Platform.OS === 'web' ? 'Requesting camera and microphone access…' : 'Preparing your LIVE room…');
    try {
      // Acquire browser media permission directly from the Go LIVE click.
      // This avoids waiting for the authenticated API round-trip before the
      // browser is asked to grant camera and microphone access.
      if (Platform.OS === 'web') {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('LIVE requires a secure HTTPS browser with camera and microphone support.');
        }
        const permissionStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        permissionStream.getTracks().forEach((track) => track.stop());
      }
      setStartStage('Creating your LIVE room…');
      const connection = await backendFetch('/live', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(), description: description.trim(), visibility, allowGuests,
          inviteeIds: visibility === 'private' ? invitees : [],
        }),
      });
      if (!connection?.stream?.id || !connection?.livekitUrl || !connection?.token) {
        throw new Error(connection?.message || 'The server did not return a complete LIVE room connection. Please try again.');
      }
      setStartStage('Opening your LIVE studio…');
      navigation.navigate('LiveStream', { streamId: connection.stream.id, creatorMode: true });
      setTitle('');
      setDescription('');
      setSelectedInvitees([]);
    } catch (e) {
      const message = e?.message || 'The media service may not be configured yet.';
      setError(`Could not start LIVE: ${message}`);
      if (Platform.OS !== 'web') Alert.alert('Could not start LIVE', message);
    } finally {
      setBusy(false);
      setStartStage('');
    }
  };

  const joinLive = async (stream) => {
    if (!stream?.id) return;
    // Pass only the stable stream ID. LiveStreamScreen obtains a fresh,
    // viewer-authorized LiveKit token after navigation; tokens and objects
    // must never be serialized into browser URLs.
    navigation.navigate('LiveStream', { streamId: stream.id, creatorMode: false });
  };

  const toggleFollow = async (creatorId) => {
    const isFollowing = followingIds.includes(creatorId);
    setBusy(true);
    try {
      await backendFetch(`/live/creators/${creatorId}/follow`, { method: isFollowing ? 'DELETE' : 'POST' });
      setFollowingIds((current) => isFollowing ? current.filter((id) => id !== creatorId) : [...current, creatorId]);
      if (isFollowing) {
        setFollowingCreators((current) => current.filter((item) => item.creator_id !== creatorId));
        setStreams((current) => current.filter((item) => item.creator_id !== creatorId || item.visibility === 'public'));
      } else {
        await refresh();
      }
    } catch (e) {
      Alert.alert('Could not update follow', e?.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const acceptInvitation = (item) => joinLive(item.stream);

  useEffect(() => {
    const notification = route?.params?.liveNotification;
    const type = notification?.type;
    if (!type || !type.startsWith('live_')) return;
    const streamId = typeof notification.streamId === 'string' ? notification.streamId : null;
    const key = type + ':' + (notification.replayId || streamId || notification.creatorId || notification.followerId || 'hub');
    if (handledLiveNotificationRef.current === key) return;
    handledLiveNotificationRef.current = key;
    navigation.setParams?.({ liveNotification: undefined });

    if (type === 'live_replay_ready' && typeof notification.replayId === 'string') {
      refresh();
      navigation.navigate('LiveReplay', { replay: { id: notification.replayId, streamTitle: 'LIVE replay' } });
      return;
    }

    const shouldJoin = streamId && (
      ['live_stream_started', 'live_invitation', 'live_guest_request', 'live_guest_invitation'].includes(type)
      || (type === 'live_guest_decision' && notification.status === 'accepted')
    );
    if (shouldJoin) {
      joinLive({ id: streamId });
    } else {
      refresh();
    }
  }, [route?.params?.liveNotification, navigation, refresh]);
  const fieldStyle = {
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    minWidth: 0,
    width: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList keyboardShouldPersistTaps="handled"
        data={visibleStreams}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: spacing.xxl || spacing.xl }}
        ListHeaderComponent={
          <View>
            <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="radio" size={19} color={colors.primary} />
                </View>
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '900', letterSpacing: 1.5 }]}>ZANNYCHAT LIVE</Text>
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={() => navigation.navigate('LiveCreatorProfile')} accessibilityRole="button" accessibilityLabel="Open LIVE creator profile" style={{ minHeight: 48, paddingHorizontal: 10, borderRadius: 13, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="person-circle-outline" size={18} color={colors.primary} />
                  <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '800' }]}>Creator profile</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={refresh} accessibilityRole="button" accessibilityLabel="Refresh LIVE streams" style={{ width: 48, height: 48, borderRadius: 15, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="refresh" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={[typography.heading, { color: colors.textPrimary, fontSize: 29, marginTop: spacing.md }]}>Your stage. Your people.</Text>
              <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 22 }]}>Go live, bring your community together, and invite trusted guests on stage.</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, minHeight: 50, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.md }}>
                <Ionicons name="search" size={19} color={colors.textSecondary} />
                <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search LIVE titles or creators" placeholderTextColor={colors.textSecondary} accessibilityLabel="Search LIVE titles or creators" returnKeyType="search" style={{ flex: 1, minWidth: 0, color: colors.textPrimary, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm }} />
                {!!searchQuery && <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityRole="button" accessibilityLabel="Clear LIVE search" style={{ width: 36, height: 40, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="close-circle" size={19} color={colors.textSecondary} /></TouchableOpacity>}
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                <View style={{ flex: 1, borderRadius: radii.md, padding: spacing.sm, backgroundColor: colors.surface }}>
                  <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{streams.length}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>Live now</Text>
                </View>
                <View style={{ flex: 1, borderRadius: radii.md, padding: spacing.sm, backgroundColor: colors.surface }}>
                  <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{followingCreators.length}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>Creators followed</Text>
                </View>
                <View style={{ flex: 1, borderRadius: radii.md, padding: spacing.sm, backgroundColor: colors.surface }}>
                  <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{invitations.length}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>Invitations</Text>
                </View>
              </View>
            </View>

            <GlassCard glow style={{ marginHorizontal: spacing.md, marginBottom: spacing.md }} contentStyle={{ padding: spacing.md, gap: spacing.md }}>
              <TouchableOpacity onPress={() => setShowComposer((value) => !value)} accessibilityRole="button" accessibilityLabel="Toggle LIVE broadcast setup" accessibilityState={{ expanded: showComposer }} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: hexToRgba(colors.danger, 0.12), alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="videocam" size={22} color={colors.danger} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={[typography.bodyStrong, { color: colors.textPrimary }]}>Start a broadcast</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>Set the mood before you go live</Text>
                </View>
                <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: hexToRgba(colors.danger, 0.1) }}>
                  <Text style={[typography.caption, { color: colors.danger, fontWeight: '800' }]}>{showComposer ? 'CLOSE' : 'SET UP'}</Text>
                </View>
                <Ionicons name={showComposer ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
              </TouchableOpacity>

              {showComposer && <>
              <TextInput value={title} onChangeText={(v) => setTitle(v.slice(0, 80))} maxLength={80} placeholder="What are you going live about?" placeholderTextColor={colors.textSecondary} accessibilityLabel="LIVE stream title" style={fieldStyle} />
              <TextInput value={description} onChangeText={(v) => setDescription(v.slice(0, 500))} maxLength={500} multiline placeholder="Add a description so people know what to expect…" placeholderTextColor={colors.textSecondary} accessibilityLabel="LIVE stream description" style={[fieldStyle, { minHeight: 76, textAlignVertical: 'top' }]} />

              <View style={{ gap: spacing.xs }}>
                <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '800', letterSpacing: 0.8 }]}>WHO CAN WATCH?</Text>
                <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                  {VISIBILITIES.map((item) => {
                    const selected = visibility === item.value;
                    return (
                      <TouchableOpacity key={item.value} onPress={() => setVisibility(item.value)} accessibilityRole="radio" accessibilityLabel={item.label} accessibilityState={{ checked: selected }} style={{ flex: 1, minHeight: 48, paddingVertical: spacing.xs, paddingHorizontal: 4, borderRadius: radii.md, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary + '18' : colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={[typography.small, { color: selected ? colors.primary : colors.textPrimary, fontWeight: '800' }]}>{item.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>{VISIBILITY_DETAILS[visibility]}</Text>
              </View>

              {visibility === 'private' && (
                <View style={{ gap: spacing.sm }}>
                  <TouchableOpacity onPress={loadInviteCandidates} disabled={loadingCandidates} accessibilityRole="button" accessibilityLabel="Load contacts to invite to private LIVE" accessibilityState={{ disabled: loadingCandidates, busy: loadingCandidates }} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.sm, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs }}>
                    {loadingCandidates ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="people-outline" size={18} color={colors.primary} />}
                    <Text style={[typography.small, { color: colors.primary, fontWeight: '800' }]}>{loadingCandidates ? 'Loading chat contacts…' : 'Choose people from your chats'}</Text>
                  </TouchableOpacity>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }} contentContainerStyle={{ gap: 5 }}>
                    {inviteCandidates.map((person) => {
                      const selected = selectedInvitees.includes(person.id);
                      return (
                        <TouchableOpacity key={person.id} onPress={() => toggleInvitee(person.id)} accessibilityRole="checkbox" accessibilityLabel={`Invite ${person.name} to this LIVE stream`} accessibilityState={{ checked: selected }} style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderRadius: radii.md, backgroundColor: selected ? colors.primary + '18' : colors.surface }}>
                          <Ionicons name={selected ? 'checkbox' : 'square-outline'} size={19} color={colors.primary} />
                          <Text numberOfLines={1} style={[typography.body, { color: colors.textPrimary, marginLeft: spacing.sm, flex: 1 }]}>{person.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                    {inviteCandidates.length === 0 && <Text style={[typography.caption, { color: colors.textSecondary }]}>Load people from your existing chats to invite them.</Text>}
                  </ScrollView>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>{selectedInvitees.length} invitee(s) selected</Text>
                </View>
              )}

              <TouchableOpacity onPress={() => setAllowGuests((value) => !value)} accessibilityRole="checkbox" accessibilityLabel="Allow approved viewers to join the LIVE stage" accessibilityState={{ checked: allowGuests }} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs }}>
                <Ionicons name={allowGuests ? 'checkbox' : 'square-outline'} size={21} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.small, { color: colors.textPrimary, fontWeight: '700' }]}>Allow approved viewers on stage</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>You decide who gets publishing access.</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity disabled={busy} onPress={startLive} accessibilityRole="button" accessibilityLabel="Go LIVE" accessibilityState={{ disabled: busy, busy }} style={{ backgroundColor: busy ? colors.border : colors.primary, borderRadius: radii.md, minHeight: 52, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm }}>
                {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Ionicons name="radio" size={20} color={colors.onPrimary} />}
                <Text style={[typography.bodyStrong, { color: colors.onPrimary }]}>{busy ? 'Connecting…' : 'Go LIVE'}</Text>
              </TouchableOpacity>
              {!!startStage && <Text accessibilityRole="status" style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>{startStage}</Text>}
              </>}
            </GlassCard>

            {invitations.length > 0 && (
              <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.md, gap: spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Ionicons name="mail-unread-outline" size={18} color={colors.primary} />
                  <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Private LIVE invitations</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>{invitations.length}</Text>
                </View>
                {invitations.map((item) => (
                  <GlassCard key={item.stream_id} contentStyle={{ padding: spacing.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name={item.invitation_type === 'guest' ? 'mic' : 'lock-closed'} size={17} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{item.stream.title}</Text>
                        <Text style={[typography.caption, { color: colors.textSecondary }]}>{item.invitation_type === 'guest' ? 'Invited to join the LIVE stage' : 'Private invitation'}</Text>
                      </View>
                      <TouchableOpacity disabled={busy} onPress={() => acceptInvitation(item)} accessibilityRole="button" accessibilityLabel={item.invitation_type === 'guest' ? `Join the LIVE stage in ${item.stream.title}` : `Accept invitation to ${item.stream.title}`} accessibilityState={{ disabled: busy, busy }} style={{ backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md }}>
                        <Text style={[typography.small, { color: colors.background, fontWeight: '800' }]}>{item.invitation_type === 'guest' ? 'Join stage' : 'Join'}</Text>
                      </TouchableOpacity>
                    </View>
                  </GlassCard>
                ))}
              </View>
            )}

            {(replays.length > 0 || !!replayError || (replayLoaded && !loading)) && (
              <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.md, gap: spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Ionicons name="play-circle" size={19} color={colors.primary} />
                  <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>LIVE replays</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>{replays.length}</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('LiveReplayLibrary')} accessibilityRole="button" accessibilityLabel="Open full LIVE replay library" style={{ minHeight: 40, paddingHorizontal: spacing.sm, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={[typography.caption, { color: colors.primary, fontWeight: '900' }]}>View library</Text>
                  </TouchableOpacity>
                </View>
                {replayError ? (
                  <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
                    <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Replays could not load</Text>
                    <Text accessibilityRole="alert" style={[typography.caption, { color: colors.textSecondary }]}>{replayError}</Text>
                    <TouchableOpacity onPress={refresh} accessibilityRole="button" accessibilityLabel="Retry loading LIVE replays" style={{ minHeight: 48, paddingHorizontal: spacing.md, borderRadius: radii.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={[typography.small, { color: colors.onPrimary, fontWeight: '900' }]}>Retry</Text>
                    </TouchableOpacity>
                  </GlassCard>
                ) : replays.length === 0 ? (
                  <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.xs }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <Ionicons name="film-outline" size={22} color={colors.primary} />
                      <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>No saved LIVE replays yet</Text>
                    </View>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>Completed recordings will appear here and remain available for seven days.</Text>
                  </GlassCard>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                    {replays.map((item) => (
                      <GlassCard key={item.id} style={{ width: 232 }} contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                          <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: hexToRgba(colors.primary, 0.12), alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="film-outline" size={20} color={colors.primary} />
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text numberOfLines={2} style={[typography.bodyStrong, { color: colors.textPrimary }]}>{item.streamTitle || 'LIVE replay'}</Text>
                            <Text numberOfLines={1} style={[typography.caption, { color: colors.textSecondary }]}>{item.visibility === 'private' ? 'Private' : item.visibility === 'followers' ? 'Followers' : 'Public'} replay</Text>
                          </View>
                        </View>
                        {item.status === 'ready' ? (
                          <TouchableOpacity onPress={() => openReplay(item)} accessibilityRole="button" accessibilityLabel={'Watch replay: ' + (item.streamTitle || 'LIVE replay')} style={{ minHeight: 48, borderRadius: radii.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.xs }}>
                            <Ionicons name="play" size={16} color={colors.onPrimary} />
                            <Text style={[typography.small, { color: colors.onPrimary, fontWeight: '900' }]}>Watch replay</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={{ minHeight: 42, borderRadius: radii.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.xs }}>
                            {item.status === 'processing' || item.status === 'starting' ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name={item.status === 'recording' ? 'radio-button-on' : 'alert-circle-outline'} size={16} color={item.status === 'recording' ? colors.danger : colors.textSecondary} />}
                            <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '800' }]}>{item.status === 'processing' ? 'Preparing replay…' : item.status === 'starting' ? 'Starting recording…' : item.status === 'recording' ? 'Recording · auto-stops' : 'Replay unavailable'}</Text>
                          </View>
                        )}
                        {item.creatorId === currentUserId && !['starting', 'recording', 'processing'].includes(item.status) ? (
                          <TouchableOpacity onPress={() => deleteReplay(item)} accessibilityRole="button" accessibilityLabel={'Delete replay: ' + (item.streamTitle || 'LIVE replay')} style={{ minHeight: 48, borderRadius: radii.md, borderWidth: 1, borderColor: hexToRgba(colors.danger, 0.32), alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.xs }}>
                            <Ionicons name="trash-outline" size={15} color={colors.danger} />
                            <Text style={[typography.caption, { color: colors.danger, fontWeight: '800' }]}>Delete replay</Text>
                          </TouchableOpacity>
                        ) : null}
                      </GlassCard>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}

            {followingCreators.length > 0 && (
              <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.md, gap: spacing.sm }}>
                <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Creators you follow</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                  {followingCreators.map((creator) => (
                    <View key={creator.creator_id} style={{ minWidth: 150, padding: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                      <Text numberOfLines={1} style={[typography.small, { color: colors.textPrimary, fontWeight: '800' }]}>{creator.name}</Text>
                      <TouchableOpacity disabled={busy} onPress={() => toggleFollow(creator.creator_id)} accessibilityRole="button" accessibilityLabel={`Unfollow ${creator.name}`} accessibilityState={{ disabled: busy, busy }} style={{ marginTop: spacing.xs }}>
                        <Text style={[typography.caption, { color: colors.primary, fontWeight: '800' }]}>Unfollow</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={[typography.bodyStrong, { color: colors.textPrimary }]}>Live now</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Join a conversation happening right now</Text>
              </View>
              <TouchableOpacity onPress={refresh} accessibilityRole="button" accessibilityLabel="Refresh LIVE streams" style={{ padding: spacing.sm }}>
                <Ionicons name="refresh" size={19} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.xs, paddingBottom: spacing.sm }}>
              {STREAM_FILTERS.map((filter) => {
                const selected = activeFilter === filter.value;
                return (
                  <TouchableOpacity key={filter.value} onPress={() => setActiveFilter(filter.value)} accessibilityRole="radio" accessibilityLabel={`Show ${filter.label} LIVE streams`} accessibilityState={{ checked: selected }} style={{ minHeight: 48, paddingHorizontal: spacing.md, borderRadius: 18, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={[typography.small, { color: selected ? colors.background : colors.textSecondary, fontWeight: '800' }]}>{filter.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {loading && <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />}
            {!!error && <Text accessibilityRole="alert" style={[typography.caption, { color: colors.danger, paddingHorizontal: spacing.md, paddingBottom: spacing.sm }]}>{error}</Text>}
          </View>
        }
        renderItem={({ item }) => (
          <GlassCard style={{ marginHorizontal: spacing.md, marginBottom: spacing.sm }} contentStyle={{ padding: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <TouchableOpacity disabled={busy} onPress={() => joinLive(item)} accessibilityRole="button" accessibilityLabel={'Join LIVE: ' + item.title} style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: hexToRgba(colors.danger, 0.1), alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="videocam" size={23} color={colors.danger} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs }}>
                    <Text numberOfLines={2} style={[typography.bodyStrong, { color: colors.textPrimary, flexShrink: 1 }]}>{item.title}</Text>
                    <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, backgroundColor: hexToRgba(colors.danger, 0.1) }}>
                      <Text style={[typography.caption, { color: colors.danger, fontWeight: '900' }]}>● LIVE</Text>
                    </View>
                  </View>
                  {!!item.description && <Text numberOfLines={2} style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>{item.description}</Text>}
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 5 }]}>{item.visibility === 'followers' ? 'Followers only' : item.visibility === 'private' ? 'Private invitation' : 'Public broadcast'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              {item.creator_id && !item.is_creator && (
                <TouchableOpacity disabled={busy} onPress={() => toggleFollow(item.creator_id)} accessibilityRole="button" accessibilityLabel={followingIds.includes(item.creator_id) ? `Unfollow ${item.creator_name || item.title || 'LIVE creator'}` : `Follow ${item.creator_name || item.title || 'LIVE creator'}`} accessibilityState={{ disabled: busy, busy }} style={{ paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderRadius: radii.md, backgroundColor: followingIds.includes(item.creator_id) ? colors.surface : colors.primary + '18', borderWidth: 1, borderColor: colors.border }}>
                  <Text style={[typography.caption, { color: colors.primary, fontWeight: '800' }]}>{followingIds.includes(item.creator_id) ? 'Following' : 'Follow'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </GlassCard>
        )}
        ListEmptyComponent={!loading && !error ? (
          <GlassCard glow style={{ marginHorizontal: spacing.md, marginTop: spacing.sm }} contentStyle={{ padding: spacing.lg, alignItems: 'center', gap: spacing.sm }}>
            <View style={{ width: 58, height: 58, borderRadius: 20, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="videocam-outline" size={28} color={colors.primary} />
            </View>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>No LIVE streams in this view</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', lineHeight: 19 }]}>
              {searchQuery.trim() ? 'Try a different title or creator name, or clear your search.' : activeFilter === 'following' ? 'Follow creators to see their broadcasts here.' : 'Start a broadcast or check back when your community is live.'}
            </Text>
          </GlassCard>
        ) : null}
      />
    </SafeAreaView>
  );
}
