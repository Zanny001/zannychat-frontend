import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { backendFetch } from '../services/backendClient';

const VISIBILITIES = [
  { value: 'public', label: 'Public' },
  { value: 'followers', label: 'Followers' },
  { value: 'private', label: 'Private' },
];

export default function LiveHubScreen({ navigation }) {
  const [streams, setStreams] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [followingIds, setFollowingIds] = useState([]);
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
    if (!title.trim()) return Alert.alert('Add a title', 'Give your LIVE stream a short title first.');
    const invitees = [...new Set(selectedInvitees)];
    if (visibility === 'private' && invitees.length === 0) {
      return Alert.alert('Add invitees', 'Choose at least one person from your existing chats.');
    }
    setBusy(true);
    try {
      const connection = await backendFetch('/live', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(), description: description.trim(), visibility, allowGuests, inviteeIds: invitees,
        }),
      });
      setTitle('');
      setDescription('');
      setSelectedInvitees([]);
      navigation.navigate('LiveStream', { connection, creatorMode: true });
    } catch (e) {
      Alert.alert('Could not start LIVE', e?.message || 'The media service may not be configured yet.');
    } finally {
      setBusy(false);
    }
  };

  const joinLive = async (stream) => {
    setBusy(true);
    try {
      const connection = await backendFetch(`/live/${stream.id}/join`, { method: 'POST' });
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
      if (isFollowing) setStreams((current) => current.filter((item) => item.creator_id !== creatorId || item.visibility === 'public'));
      else refresh();
    } catch (e) {
      Alert.alert('Could not update follow', e?.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const acceptInvitation = (item) => joinLive(item.stream);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F6FB' }}>
      <FlatList
        data={streams}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 28 }}
        ListHeaderComponent={
          <View>
            <View style={{ padding: 20, paddingBottom: 12 }}>
              <Text style={{ color: '#6C5CE7', fontSize: 12, fontWeight: '900', letterSpacing: 1.4 }}>ZANNYCHAT LIVE</Text>
              <Text style={{ color: '#171526', fontSize: 28, fontWeight: '900', marginTop: 6 }}>Go live together.</Text>
              <Text style={{ color: '#6C687C', fontSize: 14, lineHeight: 21, marginTop: 6 }}>Broadcast publicly, share with followers, or invite a private audience. Approved guests can join you on stage.</Text>
            </View>
            <View style={{ marginHorizontal: 16, padding: 16, borderRadius: 22, backgroundColor: '#FFFFFF', gap: 10, elevation: 2 }}>
              <Text style={{ color: '#171526', fontSize: 16, fontWeight: '800' }}>Start a broadcast</Text>
              <TextInput value={title} onChangeText={(v) => setTitle(v.slice(0, 80))} maxLength={80} placeholder="What are you going live about?" placeholderTextColor="#9B98AB" style={{ color: '#171526', borderWidth: 1, borderColor: '#E5E2F0', borderRadius: 13, paddingHorizontal: 13, paddingVertical: 12 }} />
              <TextInput value={description} onChangeText={(v) => setDescription(v.slice(0, 500))} maxLength={500} multiline placeholder="Description (optional)" placeholderTextColor="#9B98AB" style={{ color: '#171526', borderWidth: 1, borderColor: '#E5E2F0', borderRadius: 13, paddingHorizontal: 13, paddingVertical: 12, minHeight: 66, textAlignVertical: 'top' }} />
              <Text style={{ color: '#6C687C', fontSize: 12, fontWeight: '800' }}>WHO CAN WATCH?</Text>
              <View style={{ flexDirection: 'row', gap: 7 }}>
                {VISIBILITIES.map((item) => (
                  <TouchableOpacity key={item.value} onPress={() => setVisibility(item.value)} style={{ flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center', backgroundColor: visibility === item.value ? '#6C5CE7' : '#F0EEF7' }}>
                    <Text style={{ color: visibility === item.value ? '#FFFFFF' : '#5E5A70', fontSize: 12, fontWeight: '800' }}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {visibility === 'private' && (
                <View style={{ gap: 8 }}>
                  <TouchableOpacity onPress={loadInviteCandidates} disabled={loadingCandidates} style={{ borderWidth: 1, borderColor: '#DCD7EF', borderRadius: 12, padding: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Ionicons name="people-outline" size={17} color="#6C5CE7" />
                    <Text style={{ color: '#6C5CE7', fontWeight: '800', fontSize: 12 }}>{loadingCandidates ? 'Loading chat contacts…' : 'Choose people from your chats'}</Text>
                  </TouchableOpacity>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }} contentContainerStyle={{ gap: 5 }}>
                    {inviteCandidates.map((person) => {
                      const selected = selectedInvitees.includes(person.id);
                      return (
                        <TouchableOpacity key={person.id} onPress={() => toggleInvitee(person.id)} style={{ flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 10, backgroundColor: selected ? '#EEEAFE' : '#F7F6FB' }}>
                          <Ionicons name={selected ? 'checkbox' : 'square-outline'} size={19} color="#6C5CE7" />
                          <Text numberOfLines={1} style={{ color: '#373448', marginLeft: 9, fontWeight: '700', flex: 1 }}>{person.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                    {inviteCandidates.length === 0 && <Text style={{ color: '#777286', fontSize: 12 }}>Load people from your existing chats to invite them.</Text>}
                  </ScrollView>
                  <Text style={{ color: '#6C687C', fontSize: 11 }}>{selectedInvitees.length} invitee(s) selected</Text>
                </View>
              )}
              <TouchableOpacity onPress={() => setAllowGuests((value) => !value)} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 4 }}>
                <Ionicons name={allowGuests ? 'checkbox' : 'square-outline'} size={21} color="#6C5CE7" />
                <Text style={{ color: '#373448', fontWeight: '700', fontSize: 13 }}>Allow approved viewers to join me on stage</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={busy} onPress={startLive} style={{ backgroundColor: busy ? '#AAA5D8' : '#6C5CE7', borderRadius: 14, minHeight: 48, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
                <Ionicons name="radio" size={19} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>{busy ? 'Connecting…' : 'Go LIVE'}</Text>
              </TouchableOpacity>
            </View>
            {invitations.length > 0 && (
              <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
                <Text style={{ color: '#171526', fontSize: 18, fontWeight: '900', marginBottom: 9 }}>Private LIVE invitations</Text>
                {invitations.map((item) => (
                  <View key={item.stream_id} style={{ backgroundColor: '#FFFFFF', borderRadius: 15, padding: 13, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#171526', fontWeight: '800' }}>{item.stream.title}</Text>
                      <Text style={{ color: '#777286', fontSize: 11, marginTop: 3 }}>Private invitation</Text>
                    </View>
                    <TouchableOpacity disabled={busy} onPress={() => acceptInvitation(item)} style={{ backgroundColor: '#6C5CE7', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 }}>
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>Join</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            <View style={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: '#171526', fontSize: 18, fontWeight: '900' }}>Live now</Text>
              <TouchableOpacity onPress={refresh} accessibilityRole="button" accessibilityLabel="Refresh LIVE streams"><Ionicons name="refresh" size={20} color="#6C5CE7" /></TouchableOpacity>
            </View>
            {loading && <ActivityIndicator color="#6C5CE7" style={{ marginTop: 16 }} />}
            {!!error && <Text style={{ color: '#B83245', paddingHorizontal: 20, paddingVertical: 8 }}>{error}</Text>}
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ marginHorizontal: 16, marginBottom: 9, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity disabled={busy} onPress={() => joinLive(item)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: '#FFE8ED', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="radio" size={22} color="#D83A59" /></View>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={2} style={{ color: '#171526', fontWeight: '800', fontSize: 15 }}>{item.title}</Text>
                {!!item.description && <Text numberOfLines={2} style={{ color: '#777286', marginTop: 4, fontSize: 12 }}>{item.description}</Text>}
                <Text style={{ color: '#D83A59', fontSize: 11, fontWeight: '900', marginTop: 6 }}>● LIVE NOW {item.visibility === 'followers' ? '· FOLLOWERS' : ''}</Text>
              </View>
              <Ionicons name="chevron-forward" size={19} color="#9894A8" />
            </TouchableOpacity>
            {item.creator_id && !item.is_creator && <TouchableOpacity disabled={busy} onPress={() => toggleFollow(item.creator_id)} style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: followingIds.includes(item.creator_id) ? '#F0EEF7' : '#EEEAFE' }}>
              <Text style={{ color: '#6C5CE7', fontWeight: '800', fontSize: 11 }}>{followingIds.includes(item.creator_id) ? 'Following' : 'Follow'}</Text>
            </TouchableOpacity>}
          </View>
        )}
        ListEmptyComponent={!loading && !error ? <View style={{ padding: 28, alignItems: 'center' }}><Ionicons name="videocam-outline" size={34} color="#A7A2BB" /><Text style={{ color: '#777286', textAlign: 'center', marginTop: 10 }}>No public or followed LIVE streams right now. Follow creators to see follower-only broadcasts.</Text></View> : null}
      />
    </SafeAreaView>
  );
}
