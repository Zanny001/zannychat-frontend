import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTheme } from '../theme/ThemeContext';
import ChatListItem from '../components/ChatListItem';
import GlassCard from '../components/GlassCard';
import Knot from '../components/Knot';
import { fetchConversations } from '../services/api';
import { SUPABASE_ENABLED } from '../services/supabaseClient';
import { hexToRgba } from '../utils/color';

export default function ChatListScreen({ navigation }) {
  const { colors, mood, spacing, typography, radii } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingHorizontal: spacing.md }]}>
        <View style={styles.titleRow}>
          <Knot size={26} signalColor={mood.signal} threadColor={mood.thread} strokeWidth={5} />
          <Text style={[typography.title, { color: colors.textPrimary, marginLeft: 8 }]}>Chats</Text>
        </View>
        <TouchableOpacity
          style={[styles.newChatBtn, { backgroundColor: colors.primary, borderRadius: radii.pill }]}
          onPress={() => navigation.navigate('NewChat')}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.sm }}>
        <GlassCard noPadding intensity={24} tintAlpha={0.4}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={colors.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search"
              placeholderTextColor={colors.textSecondary}
              style={[typography.body, { color: colors.textPrimary, marginLeft: 8, flex: 1 }]}
            />
          </View>
        </GlassCard>
      </View>

      {!SUPABASE_ENABLED && (
        <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.sm }}>
          <View style={[styles.demoPill, { backgroundColor: hexToRgba(colors.gold, 0.14), borderColor: hexToRgba(colors.gold, 0.35) }]}>
            <Ionicons name="flask-outline" size={13} color={colors.gold} />
            <Text style={[typography.small, { color: colors.gold, marginLeft: 6 }]}>
              DEMO DATA — connect Supabase to go live
            </Text>
          </View>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: tabBarHeight + spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <ChatListItem
            conversation={item}
            onPress={() => navigation.navigate('Chat', { conversation: item })}
          />
        )}
        ListEmptyComponent={
          <View style={{ padding: spacing.xl, alignItems: 'center' }}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginBottom: 4 }]}>
              Nothing here yet
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
              Tap + to start your first thread.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  newChatBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9 },
  demoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
});
