import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import ChatListItem from '../components/ChatListItem';
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingHorizontal: spacing.md }]}>
        <Text style={[typography.title, { color: colors.textPrimary }]}>Chats</Text>
        <TouchableOpacity
          style={[styles.newChatBtn, { backgroundColor: colors.primary, borderRadius: radii.pill }]}
          onPress={() => navigation.navigate('NewChat')}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.sm }}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderRadius: radii.md }]}>
          <Ionicons name="search" size={16} color={colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            placeholderTextColor={colors.textSecondary}
            style={[typography.body, { color: colors.textPrimary, marginLeft: 8, flex: 1 }]}
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <ChatListItem
            conversation={item}
            onPress={() => navigation.navigate('Chat', { conversation: item })}
          />
        )}
        ItemSeparatorComponent={() => (
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 76 }} />
        )}
        ListEmptyComponent={
          <View style={{ padding: spacing.lg, alignItems: 'center' }}>
            <Text style={[typography.body, { color: colors.textSecondary }]}>No conversations yet.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  newChatBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9 },
});
