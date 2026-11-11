import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { backendFetch } from '../services/backendClient';
import { useTheme } from '../theme/ThemeContext';
import GlassCard from '../components/GlassCard';

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

export default function LiveHubScreen({ navigation }) {
  const { colors, spacing, radii, typography } = useTheme();
  const [streams, setStreams] = useState([]);
  const [invitations, setInvitations] = useState([]);
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
  const [activeFilter, setActiveFilter] = useState('all');

  const visibleStreams = streams.filter((item) => {
    if (activeFilter === 'following') return followingIds.includes(item.creator_id);
    if (activeFilter === 'public') return item.visibility === 'public';
    return true;
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [publicResult, followedResult, followResult, inviteResult] = await Promise.all([
        backendFetch('/live'),
        backendFetch('/live/following/streams').catch(() => ({ streams: [] })),
        backendFetch('/live/following').catch(() => ({ following: [] })),
        backendFetch('/live/invitations').catch(() => ({ invitations: [] })),
      ]);
      const allStreams = [...(publicResult?.streams || []), ...(followedResult?.streams || [])];
      setStreams([...new Map(allStreams.map((item) => [item.id, item])).values()]);
      setFollowingCreators(followResult?.following || []);
      setFollowingIds((followResult?.following || []).map((item) => item.creator_id));
      setInvitations((inviteResult?.invitations || []).filter((item) => item.stream));
      setError('');
    } catch (e) {
      setError(e?.message || 'LIVE discovery is unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

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
    if (!title.trim()) {
      setError('Add a title before starting your LIVE stream.');
      return;
    }
    const invitees = [...new Set(selectedInvitees)];
    if (visibility === 'private' && invitees.length === 0) {
      setError('Choose at least one person from your existing chats for a private LIVE stream.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const connection = await backendFetch('/live', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(), description: description.trim(), visibility, allowGuests,
          inviteeIds: visibility === 'private' ? invitees : [],
        }),
      });
      if (!connection?.stream?.id || !connection?.livekitUrl || !connection?.token) {
        throw new Error('The LIVE service did not return a secure media connection. Check the backend LiveKit configuration.');
      }
      setTitle('');
      setDescription('');
      setSelectedInvitees([]);
      navigation.navigate('LiveStream', { connection, creatorMode: true });
    } catch (e) {
      const rawMessage = e?.message || 'Could not start LIVE. Check the server connection and browser permissions, then try again.';
      const message = /not enabled|not configured|livekit/i.test(rawMessage)
        ? `${rawMessage} Required backend settings: LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET.`
        : rawMessage;
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const joinLive = async (stream) => {
    setBusy(true);
    try {
      const connection = await backendFetch('/live/' + stream.id + '/join', { method: 'POST' });
      navigation.navigate('LiveStream', { connection, creatorMode: connection.role === 'creator' });
    } catch (e) {
      Alert.alert('Could not join LIVE', e?.message || 'This stream may have ended or requires an invitation.');
    } finally {
      setBusy(false);
    }
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
  const fieldStyle = {
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
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
                <TouchableOpacity onPress={refresh} accessibilityRole="button" accessibilityLabel="Refresh LIVE streams" style={{ width: 38, height: 38, borderRadius: 13, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="refresh" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={[typography.heading, { color: colors.textPrimary, fontSize: 29, marginTop: spacing.md }]}>Your stage. Your people.</Text>
              <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 22 }]}>Go live, bring your community together, and invite trusted guests on stage.</Text>
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

            <GlassCard style={{ marginHorizontal: spacing.md, marginBottom: spacing.md }} contentStyle={{ padding: spacing.md, gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: '#E34D68' + '20', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="videocam" size={22} color="#E34D68" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Start a broadcast</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>Set the mood before you go live</Text>
                </View>
                <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: '#E34D68' + '18' }}>
                  <Text style={[typography.caption, { color: '#E34D68', fontWeight: '800' }]}>LIVE</Text>
                </View>
              </View>

              <TextInput value={title} onChangeText={(v) => setTitle(v.slice(0, 80))} maxLength={80} placeholder="What are you going live about?" placeholderTextColor={colors.textSecondary} accessibilityLabel="LIVE stream title" style={fieldStyle} />
              <TextInput value={description} onChangeText={(v) => setDescription(v.slice(0, 500))} maxLength={500} multiline placeholder="Add a description so people know what to expect…" placeholderTextColor={colors.textSecondary} accessibilityLabel="LIVE stream description" style={[fieldStyle, { minHeight: 76, textAlignVertical: 'top' }]} />

              <View style={{ gap: spacing.xs }}>
                <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '800', letterSpacing: 0.8 }]}>WHO CAN WATCH?</Text>
                <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                  {VISIBILITIES.map((item) => {
                    const selected = visibility === item.value;
                    return (
                      <TouchableOpacity key={item.value} onPress={() => setVisibility(item.value)} accessibilityRole="radio" accessibilityState={{ checked: selected }} style={{ flex: 1, minHeight: 48, paddingVertical: spacing.xs, paddingHorizontal: 4, borderRadius: radii.md, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary + '18' : colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={[typography.small, { color: selected ? colors.primary : colors.textPrimary, fontWeight: '800' }]}>{item.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>{VISIBILITY_DETAILS[visibility]}</Text>
              </View>

              {visibility === 'private' && (
                <View style={{ gap: spacing.sm }}>
                  <TouchableOpacity onPress={loadInviteCandidates} disabled={loadingCandidates} accessibilityRole="button" style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.sm, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs }}>
                    {loadingCandidates ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="people-outline" size={18} color={colors.primary} />}
                    <Text style={[typography.small, { color: colors.primary, fontWeight: '800' }]}>{loadingCandidates ? 'Loading chat contacts…' : 'Choose people from your chats'}</Text>
                  </TouchableOpacity>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }} contentContainerStyle={{ gap: 5 }}>
                    {inviteCandidates.map((person) => {
                      const selected = selectedInvitees.includes(person.id);
                      return (
                        <TouchableOpacity key={person.id} onPress={() => toggleInvitee(person.id)} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderRadius: radii.md, backgroundColor: selected ? colors.primary + '18' : colors.surface }}>
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

              <TouchableOpacity onPress={() => setAllowGuests((value) => !value)} accessibilityRole="checkbox" accessibilityState={{ checked: allowGuests }} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs }}>
                <Ionicons name={allowGuests ? 'checkbox' : 'square-outline'} size={21} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.small, { color: colors.textPrimary, fontWeight: '700' }]}>Allow approved viewers on stage</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>You decide who gets publishing access.</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity disabled={busy} onPress={startLive} accessibilityRole="button" style={{ backgroundColor: busy ? colors.border : colors.primary, borderRadius: radii.md, minHeight: 52, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm }}>
                {busy ? <ActivityIndicator color={colors.background} /> : <Ionicons name="radio" size={20} color={colors.background} />}
                <Text style={[typography.bodyStrong, { color: colors.background }]}>{busy ? 'Connecting…' : 'Go LIVE'}</Text>
              </TouchableOpacity>
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
                        <Ionicons name="lock-closed" size={17} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{item.stream.title}</Text>
                        <Text style={[typography.caption, { color: colors.textSecondary }]}>Private invitation</Text>
                      </View>
                      <TouchableOpacity disabled={busy} onPress={() => acceptInvitation(item)} style={{ backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md }}>
                        <Text style={[typography.small, { color: colors.background, fontWeight: '800' }]}>Join</Text>
                      </TouchableOpacity>
                    </View>
                  </GlassCard>
                ))}
              </View>
            )}

            {followingCreators.length > 0 && (
              <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.md, gap: spacing.sm }}>
                <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Creators you follow</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                  {followingCreators.map((creator) => (
                    <View key={creator.creator_id} style={{ minWidth: 150, padding: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                      <Text numberOfLines={1} style={[typography.small, { color: colors.textPrimary, fontWeight: '800' }]}>{creator.name}</Text>
                      <TouchableOpacity disabled={busy} onPress={() => toggleFollow(creator.creator_id)} style={{ marginTop: spacing.xs }}>
                        <Text style={[typography.caption, { color: colors.primary, fontWeight: '800' }]}>Unfollow</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Live now</Text>
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
                  <TouchableOpacity key={filter.value} onPress={() => setActiveFilter(filter.value)} accessibilityRole="radio" accessibilityState={{ checked: selected }} style={{ minHeight: 36, paddingHorizontal: spacing.md, borderRadius: 18, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={[typography.small, { color: selected ? colors.background : colors.textSecondary, fontWeight: '800' }]}>{filter.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {loading && <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />}
            {!!error && <Text accessibilityRole="alert" style={[typography.caption, { color: '#D64545', paddingHorizontal: spacing.md, paddingBottom: spacing.sm }]}>{error}</Text>}
          </View>
        }
        renderItem={({ item }) => (
          <GlassCard style={{ marginHorizontal: spacing.md, marginBottom: spacing.sm }} contentStyle={{ padding: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <TouchableOpacity disabled={busy} onPress={() => joinLive(item)} accessibilityRole="button" accessibilityLabel={'Join LIVE: ' + item.title} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#E34D68' + '18', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="videocam" size={23} color="#E34D68" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs }}>
                    <Text numberOfLines={2} style={[typography.bodyStrong, { color: colors.textPrimary, flexShrink: 1 }]}>{item.title}</Text>
                    <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, backgroundColor: '#E34D68' + '18' }}>
                      <Text style={[typography.caption, { color: '#E34D68', fontWeight: '900' }]}>● LIVE</Text>
                    </View>
                  </View>
                  {!!item.description && <Text numberOfLines={2} style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>{item.description}</Text>}
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 5 }]}>{item.visibility === 'followers' ? 'Followers only' : item.visibility === 'private' ? 'Private invitation' : 'Public broadcast'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              {item.creator_id && !item.is_creator && (
                <TouchableOpacity disabled={busy} onPress={() => toggleFollow(item.creator_id)} accessibilityRole="button" style={{ paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderRadius: radii.md, backgroundColor: followingIds.includes(item.creator_id) ? colors.surface : colors.primary + '18', borderWidth: 1, borderColor: colors.border }}>
                  <Text style={[typography.caption, { color: colors.primary, fontWeight: '800' }]}>{followingIds.includes(item.creator_id) ? 'Following' : 'Follow'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </GlassCard>
        )}
        ListEmptyComponent={!loading && !error ? (
          <GlassCard style={{ marginHorizontal: spacing.md, marginTop: spacing.sm }} contentStyle={{ padding: spacing.lg, alignItems: 'center', gap: spacing.sm }}>
            <View style={{ width: 58, height: 58, borderRadius: 20, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="videocam-outline" size={28} color={colors.primary} />
            </View>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>No LIVE streams in this view</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', lineHeight: 19 }]}>
              {activeFilter === 'following' ? 'Follow creators to see their broadcasts here.' : 'Start a broadcast or check back when your community is live.'}
            </Text>
          </GlassCard>
        ) : null}
      />
    </SafeAreaView>
  );
}
