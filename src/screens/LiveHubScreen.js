import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, SafeAreaView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { backendFetch } from '../services/backendClient';

export default function LiveHubScreen({ navigation }) {
  const [streams, setStreams] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await backendFetch('/live');
      setStreams(Array.isArray(result?.streams) ? result.streams : []);
      setError('');
    } catch (e) {
      setError(e?.message || 'LIVE discovery is unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const startLive = async () => {
    if (!title.trim()) return Alert.alert('Add a title', 'Give your LIVE stream a short title first.');
    setBusy(true);
    try {
      const connection = await backendFetch('/live', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), description: description.trim(), visibility: 'public' }),
      });
      setTitle('');
      setDescription('');
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
      navigation.navigate('LiveStream', { connection, creatorMode: false });
    } catch (e) {
      Alert.alert('Could not join LIVE', e?.message || 'This stream may have ended.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F6FB' }}>
      <View style={{ padding: 20, paddingBottom: 12 }}>
        <Text style={{ color: '#6C5CE7', fontSize: 12, fontWeight: '900', letterSpacing: 1.4 }}>ZANNYCHAT LIVE</Text>
        <Text style={{ color: '#171526', fontSize: 28, fontWeight: '900', marginTop: 6 }}>Go live together.</Text>
        <Text style={{ color: '#6C687C', fontSize: 14, lineHeight: 21, marginTop: 6 }}>Broadcast with video, audience chat, reactions and safety reporting.</Text>
      </View>
      <View style={{ marginHorizontal: 16, padding: 16, borderRadius: 22, backgroundColor: '#FFFFFF', gap: 10, elevation: 2 }}>
        <Text style={{ color: '#171526', fontSize: 16, fontWeight: '800' }}>Start a broadcast</Text>
        <TextInput value={title} onChangeText={(v) => setTitle(v.slice(0, 80))} maxLength={80} placeholder="What are you going live about?" placeholderTextColor="#9B98AB" style={{ color: '#171526', borderWidth: 1, borderColor: '#E5E2F0', borderRadius: 13, paddingHorizontal: 13, paddingVertical: 12 }} />
        <TextInput value={description} onChangeText={(v) => setDescription(v.slice(0, 500))} maxLength={500} multiline placeholder="Description (optional)" placeholderTextColor="#9B98AB" style={{ color: '#171526', borderWidth: 1, borderColor: '#E5E2F0', borderRadius: 13, paddingHorizontal: 13, paddingVertical: 12, minHeight: 66, textAlignVertical: 'top' }} />
        <TouchableOpacity disabled={busy} onPress={startLive} style={{ backgroundColor: busy ? '#AAA5D8' : '#6C5CE7', borderRadius: 14, minHeight: 48, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
          <Ionicons name="radio" size={19} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>{busy ? 'Connecting…' : 'Go LIVE'}</Text>
        </TouchableOpacity>
      </View>
      <View style={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: '#171526', fontSize: 18, fontWeight: '900' }}>Live now</Text>
        <TouchableOpacity onPress={refresh} accessibilityRole="button" accessibilityLabel="Refresh LIVE streams"><Ionicons name="refresh" size={20} color="#6C5CE7" /></TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator color="#6C5CE7" style={{ marginTop: 24 }} /> : error ? (
        <Text style={{ color: '#B83245', padding: 20 }}>{error}</Text>
      ) : (
        <FlatList
          data={streams}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity disabled={busy} onPress={() => joinLive(item)} style={{ backgroundColor: '#FFFFFF', borderRadius: 18, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: '#FFE8ED', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="radio" size={22} color="#D83A59" /></View>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={2} style={{ color: '#171526', fontWeight: '800', fontSize: 15 }}>{item.title}</Text>
                {!!item.description && <Text numberOfLines={2} style={{ color: '#777286', marginTop: 4, fontSize: 12 }}>{item.description}</Text>}
                <Text style={{ color: '#D83A59', fontSize: 11, fontWeight: '900', marginTop: 6 }}>● LIVE NOW</Text>
              </View>
              <Ionicons name="chevron-forward" size={19} color="#9894A8" />
            </TouchableOpacity>
          )}
          ListEmptyComponent={<View style={{ padding: 28, alignItems: 'center' }}><Ionicons name="videocam-outline" size={34} color="#A7A2BB" /><Text style={{ color: '#777286', textAlign: 'center', marginTop: 10 }}>No public LIVE streams yet. Start the first one when your media server is configured.</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}
