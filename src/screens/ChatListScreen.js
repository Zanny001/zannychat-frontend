import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, RefreshControl, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTheme } from '../theme/ThemeContext';
import ChatListItem from '../components/ChatListItem';
import GlassCard from '../components/GlassCard';
import Knot from '../components/Knot';
import ActionSheet from '../components/ActionSheet';
import { fetchConversations, toggleFavorite, setConversationFlags, deleteConversationForCurrentUser } from '../services/api';
import { startPresence, subscribePresence } from '../services/presence';
import { SUPABASE_ENABLED } from '../services/supabaseClient';
import { hexToRgba } from '../utils/color';

// All / Unread / Favorites / Groups / Archived — the same category set
// WhatsApp itself uses, confirmed against real screenshots rather than
// guessed. Archived chats are hidden from every filter except their
// own, which is what "archive" means everywhere else too.
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'groups', label: 'Groups' },
  { key: 'archived', label: 'Archived' },
];

const PAGE_SIZE = 50;

export default function ChatListScreen({ navigation }) {
  const { colors, mood, spacing, typography, radii } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const [conversations, setConversations] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [sheetFor, setSheetFor] = useState(null); // conversation whose long-press sheet is open
  const [onlineIds, setOnlineIds] = useState(new Set());

  // Real presence: every "online" dot used to be mock data (the
  // profiles.online column existed but nothing ever set it). Now the
  // app tracks itself on a shared Presence channel and the dots reflect
  // who's actually connected right now. Mock mode keeps its own flags.
  useEffect(() => {
    startPresence();
    return subscribePresence(setOnlineIds);
  }, []);

  const load = useCallback(async () => {
    const { conversations: data, hasMore: more } = await fetchConversations({ limit: PAGE_SIZE, offset: 0 });
    setConversations(data);
    setHasMore(more);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  // Older conversations page in on scroll — created_at desc pages from
  // the API, re-sorted into the list by actual last activity.
  async function handleLoadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const { conversations: older, hasMore: more } = await fetchConversations({
        limit: PAGE_SIZE,
        offset: conversations.length,
      });
      setConversations((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...older.filter((c) => !seen.has(c.id))];
      });
      setHasMore(more);
    } catch (err) {
      // Leave hasMore as-is so another attempt is possible.
    } finally {
      setLoadingMore(false);
    }
  }

  function patchConversation(id, patch) {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  // Optimistic — flips the star immediately rather than waiting on the
  // round trip, since a favorite toggle has no failure mode worth
  // blocking on (worst case, a rare write failure quietly reverts on
  // the next real fetch).
  function handleToggleFavorite(conversation) {
    patchConversation(conversation.id, { isFavorite: !conversation.isFavorite });
    toggleFavorite(conversation.id, !conversation.isFavorite).catch(() => {});
  }

  function handleToggleMute(conversation) {
    patchConversation(conversation.id, { isMuted: !conversation.isMuted });
    setConversationFlags(conversation.id, { isMuted: !conversation.isMuted }).catch(() => {});
  }

  function handleToggleArchive(conversation) {
    // Archiving removes it from the visible list immediately (every
    // filter except "Archived" excludes archived chats anyway).
    patchConversation(conversation.id, { isArchived: !conversation.isArchived });
    setConversationFlags(conversation.id, { isArchived: !conversation.isArchived }).catch(() => {});
  }

  function confirmDeleteConversation(conversation) {
    Alert.alert(
      'Delete this chat?',
      'This removes the chat from your list. Other participants will keep their chat and message history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete chat',
          style: 'destructive',
          onPress: async () => {
            const previous = conversations;
            setConversations((current) => current.filter((item) => item.id !== conversation.id));
            try {
              await deleteConversationForCurrentUser(conversation.id);
              setSheetFor(null);
            } catch (error) {
              setConversations(previous);
              Alert.alert('Could not delete chat', error?.message || 'Please try again.');
            }
          },
        },
      ],
    );
  }

  // Live presence overrides the stored online flag for 1:1 rows —
  // "online" now means "has the app open right now".
  function withPresence(conversation) {
    if (!SUPABASE_ENABLED || conversation.isGroup || !conversation.participant?.id) return conversation;
    return {
      ...conversation,
      participant: { ...conversation.participant, online: onlineIds.has(conversation.participant.id) },
    };
  }

  const filtered = conversations
    .filter((c) => (activeFilter === 'archived' ? c.isArchived : !c.isArchived))
    .filter((c) => c.participant.name.toLowerCase().includes(query.toLowerCase()))
    .filter((c) => {
      if (activeFilter === 'unread') return c.unreadCount > 0;
      if (activeFilter === 'favorites') return c.isFavorite;
      if (activeFilter === 'groups') return c.isGroup;
      return true;
    });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingHorizontal: spacing.md }]}>
        <View style={styles.titleRow}>
          <Knot size={26} signalColor={mood.signal} threadColor={mood.thread} strokeWidth={5} />
          <Text style={[typography.title, { color: colors.textPrimary, marginLeft: 8 }]}>Chats</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.draftsBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.pill }]}
            onPress={() => navigation.navigate('Drafts')}
            accessibilityLabel="Open unsent drafts"
            accessibilityRole="button"
          >
            <Ionicons name="document-text-outline" size={19} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.newChatBtn, { backgroundColor: colors.primary, borderRadius: radii.pill }]}
            onPress={() => navigation.navigate('NewChat')}
            accessibilityLabel="Start a new chat"
            accessibilityRole="button"
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
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
              accessibilityLabel="Search chats"
            />
          </View>
        </GlassCard>
      </View>

      <View style={{ flexGrow: 0, flexShrink: 0, marginBottom: spacing.sm }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: 8 }}
        >
          {FILTERS.map((filter) => {
          const active = activeFilter === filter.key;
          return (
            <TouchableOpacity
              key={filter.key}
              onPress={() => setActiveFilter(filter.key)}
              accessibilityLabel={`${filter.label} filter`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <View
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? colors.primary : hexToRgba(colors.surface, 0.6),
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[typography.caption, { color: active ? '#FFFFFF' : colors.textSecondary }]}>
                  {filter.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
          })}
        </ScrollView>
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
        style={{ flex: 1 }}
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: tabBarHeight + spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => (
          <ChatListItem
            conversation={withPresence(item)}
            onPress={() => navigation.navigate('Chat', { conversation: withPresence(item) })}
            onLongPressActions={() => setSheetFor(item)}
          />
        )}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator style={{ marginVertical: spacing.md }} color={colors.textSecondary} /> : null
        }
        ListEmptyComponent={
          <View style={{ padding: spacing.xl, alignItems: 'center' }}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginBottom: 4 }]}>
              {activeFilter === 'all' ? 'Nothing here yet' : `No ${activeFilter} chats`}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
              {activeFilter === 'all'
                ? 'Tap + to start your first thread.'
                : 'Long-press a chat for favorite, mute & archive, or switch filters.'}
            </Text>
          </View>
        }
      />

      {/* Long-press actions — the audit noted favoriting was
          long-press-only with zero visible hint; the sheet now also
          carries mute & archive, and the empty state names the
          gesture outright. */}
      <ActionSheet
        visible={Boolean(sheetFor)}
        title={sheetFor?.participant?.name}
        options={
          sheetFor
            ? [
                {
                  key: 'favorite',
                  label: sheetFor.isFavorite ? 'Remove from favorites' : 'Add to favorites',
                  icon: sheetFor.isFavorite ? 'star' : 'star-outline',
                  onPress: () => { handleToggleFavorite(sheetFor); setSheetFor(null); },
                },
                {
                  key: 'mute',
                  label: sheetFor.isMuted ? 'Unmute' : 'Mute notifications',
                  icon: sheetFor.isMuted ? 'volume-high-outline' : 'volume-mute-outline',
                  onPress: () => { handleToggleMute(sheetFor); setSheetFor(null); },
                },
                {
                  key: 'archive',
                  label: sheetFor.isArchived ? 'Unarchive' : 'Archive',
                  icon: 'archive-outline',
                  onPress: () => { handleToggleArchive(sheetFor); setSheetFor(null); },
                },
                {
                  key: 'delete',
                  label: 'Delete chat',
                  icon: 'trash-outline',
                  destructive: true,
                  onPress: () => {
                    const conversation = sheetFor;
                    setSheetFor(null);
                    setTimeout(() => confirmDeleteConversation(conversation), 350);
                  },
                },
              ]
            : []
        }
        onClose={() => setSheetFor(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  draftsBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  newChatBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
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
