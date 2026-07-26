import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import Avatar from '../components/Avatar';
import { fetchConversations } from '../services/api';

export default function ChatListScreen({ navigation }) {
  const { colors, spacing, typography, radii } = useTheme();
  const [conversations, setConversations] = useState([]);
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await fetchConversations();
    setConversations(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const filtered = conversations.filter((c) =>
    c.participant.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a1a' }}> 
      {/* Premium Dark Glass Background Simulation */}
      <View style={StyleSheet.absoluteFillObject}>
        <View style={[styles.bgBlob, { backgroundColor: colors.primary, top: -100, left: -100 }]} />
        <View style={[styles.bgBlob, { backgroundColor: colors.accent, bottom: -100, right: -100 }]} />
        <View style={{ flex: 1, backgroundColor: 'rgba(10, 10, 26, 0.85)' }} />
      </View>

      <View style={[styles.header, { paddingHorizontal: spacing.md }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.logoZ, { borderColor: colors.primary }]}>
             <Text style={{ color: colors.primary, fontWeight: '900', fontStyle: 'italic', fontSize: 18 }}>Z</Text>
          </View>
          <Text style={[typography.title, { color: '#fff', marginLeft: 8, fontSize: 24, fontWeight: 'bold' }]}>
            <Text style={{ color: colors.primary, fontStyle: 'italic' }}>Z</Text>annyChat
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1 }]}
          onPress={() => navigation.navigate('NewChat')}
        >
          <Ionicons name="add" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center' }}>
        <View style={[styles.searchBar, { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderRadius: radii.pill }]}>
          <Ionicons name="search" size={18} color="rgba(255,255,255,0.5)" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search global network..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            style={[typography.body, { color: '#fff', marginLeft: 8, flex: 1 }]}
          />
        </View>
        <TouchableOpacity style={[styles.iconBtn, { marginLeft: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }]}>
          <Ionicons name="globe-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.chatCard, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: radii.lg }]}
            onPress={() => navigation.navigate('Chat', { conversation: item })}
          >
            <View style={styles.avatarWrap}>
              <Avatar name={item.participant.name} color={item.participant.avatarColor || colors.primary} size={48} />
              <View style={[styles.globalBadge, { backgroundColor: '#1a1a2e', borderColor: colors.primary }]}>
                <Ionicons name="flag" size={8} color="#fff" />
              </View>
            </View>
            <View style={styles.chatDetails}>
              <View style={styles.chatHeaderRow}>
                <Text style={[typography.bodyStrong, { color: '#fff', fontSize: 16 }]}>{item.participant.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="globe-outline" size={12} color="rgba(255,255,255,0.4)" style={{ marginRight: 4 }} />
                  <Text style={[typography.caption, { color: 'rgba(255,255,255,0.6)' }]}>
                    {item.lastMessageAt || 'Yesterday'}
                  </Text>
                </View>
              </View>
              <View style={styles.chatFooterRow}>
                <Text style={[typography.body, { color: 'rgba(255,255,255,0.7)', flex: 1 }]} numberOfLines={1}>
                  {item.lastMessage || 'Securely connected to ZannyChat.'}
                </Text>
                <Ionicons name="lock-closed" size={12} color="rgba(255,255,255,0.4)" style={{ marginLeft: 8 }} />
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ padding: spacing.lg, alignItems: 'center' }}>
            <Ionicons name="planet-outline" size={48} color="rgba(255,255,255,0.2)" />
            <Text style={[typography.body, { color: 'rgba(255,255,255,0.5)', marginTop: 16 }]}>No global connections yet.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bgBlob: { width: 300, height: 300, borderRadius: 150, position: 'absolute', opacity: 0.15, transform: [{ scale: 1.5 }] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 12 },
  logoZ: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, flex: 1 },
  chatCard: { flexDirection: 'row', padding: 16, marginBottom: 12, borderWidth: 1, alignItems: 'center' },
  avatarWrap: { position: 'relative', marginRight: 16 },
  globalBadge: { position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chatDetails: { flex: 1, justifyContent: 'center' },
  chatHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
