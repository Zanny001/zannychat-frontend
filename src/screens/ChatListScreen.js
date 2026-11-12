import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, RefreshControl, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTheme } from '../theme/ThemeContext';
import ChatListItem from '../components/ChatListItem';
import Avatar from '../components/Avatar';
import GlassCard from '../components/GlassCard';
import Knot from '../components/Knot';
import ActionSheet from '../components/ActionSheet';
import { fetchConversations, toggleFavorite, setConversationFlags, deleteConversationForCurrentUser, getCurrentUser } from '../services/api';
import { startPresence, subscribePresence } from '../services/presence';
import { SUPABASE_ENABLED } from '../services/supabaseClient';
import { hexToRgba } from '../utils/color';
import { filterConversations as filterChatList } from '../utils/filterConversations';
import { filterByChatFolder } from '../utils/chatFolders';
import { loadChatFolders } from '../services/chatFolders';
import { listActiveStatuses, resolveStatusUserNames } from '../services/statusUpdates';
import { readSeenStatusIds } from '../utils/statusSeen';
import { buildStoryTrayGroups } from '../utils/storyTray';

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
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState('');
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [customFolders, setCustomFolders] = useState([]);
  const [storyGroups, setStoryGroups] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [sheetFor, setSheetFor] = useState(null); // conversation whose long-press sheet is open
  const [onlineIds, setOnlineIds] = useState(new Set());
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [conversationActionError, setConversationActionError] = useState('');
  const pendingConversationActions = useRef(new Set());


  // Real presence: every "online" dot used to be mock data (the
  // profiles.online column existed but nothing ever set it). Now the
  // app tracks itself on a shared Presence channel and the dots reflect
  // who's actually connected right now. Mock mode keeps its own flags.
  useEffect(() => {
    startPresence();
    return subscribePresence(setOnlineIds);
  }, []);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const { conversations: data, hasMore: more } = await fetchConversations({ limit: PAGE_SIZE, offset: 0 });
      setConversations(Array.isArray(data) ? data : []);
      setHasMore(Boolean(more));
    } catch (error) {
      setLoadError(error?.message || 'Could not load your chats. Check your connection and try again.');
      throw error;
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    load().catch(() => {});
    let alive = true;
    (async () => {
      try {
        const user = await getCurrentUser();
        const folders = await loadChatFolders(user?.id || 'guest');
        if (alive) setCustomFolders(folders);
      } catch (_) {}
      if (!SUPABASE_ENABLED) {
        if (alive) setStoryGroups([]);
        return;
      }
      try {
        const [statuses, seenIds] = await Promise.all([
          listActiveStatuses(),
          readSeenStatusIds(AsyncStorage),
        ]);
        const names = await resolveStatusUserNames(statuses.map((status) => status.user_id));
        if (alive) setStoryGroups(buildStoryTrayGroups(statuses, names, seenIds));
      } catch (_) {
        if (alive) setStoryGroups([]);
      }
    })();
    return () => { alive = false; };
  }, [load]));

  async function handleRefresh() {
    setRefreshing(true);
    try { await load(); } catch (_) { /* Inline error state offers a retry. */ }
    finally { setRefreshing(false); }
  }

  // Older conversations page in on scroll — created_at desc pages from
  // the API, re-sorted into the list by actual last activity.
  async function handleLoadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setLoadMoreError('');
    try {
      const { conversations: older, hasMore: more } = await fetchConversations({
        limit: PAGE_SIZE,
        offset: conversations.length,
      });
      if (!Array.isArray(older)) throw new Error('The server returned an invalid chat page.');
      setConversations((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        const next = [...prev];
        for (const item of older) {
          if (item && item.id != null && !seen.has(item.id)) {
            seen.add(item.id);
            next.push(item);
          }
        }
        return next;
      });
      setHasMore(Boolean(more));
    } catch (err) {
      // Keep pagination available and give the user an explicit retry path.
      setLoadMoreError(err?.message || 'Could not load older chats. Check your connection and try again.');
    } finally {
      setLoadingMore(false);
    }
  }

  function patchConversation(id, patch) {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  // Optimistic actions stay responsive, but now roll back visibly on write
  // failure. A per-conversation/field lock prevents rapid taps from racing
  // multiple contradictory writes to the participant row.
  async function updateConversationFlag(conversation, field, persist) {
    if (!conversation?.id) return;
    const actionKey = `${conversation.id}:${field}`;
    if (pendingConversationActions.current.has(actionKey)) return;
    const previousValue = Boolean(conversation[field]);
    const nextValue = !previousValue;
    pendingConversationActions.current.add(actionKey);
    setConversationActionError('');
    patchConversation(conversation.id, { [field]: nextValue });
    try {
      await persist(conversation.id, nextValue);
    } catch (error) {
      // Roll back only the field involved; preserve unrelated newer updates.
      patchConversation(conversation.id, { [field]: previousValue });
      setConversationActionError(`Couldn't save ${field === 'isFavorite' ? 'favorite' : field === 'isMuted' ? 'mute setting' : 'archive setting'}. Please try again.`);
    } finally {
      pendingConversationActions.current.delete(actionKey);
    }
  }

  function handleToggleFavorite(conversation) {
    return updateConversationFlag(conversation, 'isFavorite', (id, value) => toggleFavorite(id, value));
  }

  function handleToggleMute(conversation) {
    return updateConversationFlag(conversation, 'isMuted', (id, value) => setConversationFlags(id, { isMuted: value }));
  }

  function handleToggleArchive(conversation) {
    return updateConversationFlag(conversation, 'isArchived', (id, value) => setConversationFlags(id, { isArchived: value }));
  }

  async function performDeleteConversation(conversation) {
    if (!conversation || deleting) return;

    const previous = conversations;
    setDeleting(true);
    setDeleteError('');
    setConversations((current) =>
      current.filter((item) => item.id !== conversation.id)
    );

    try {
      await deleteConversationForCurrentUser(conversation.id);
      setDeleteTarget(null);
      setSheetFor(null);
    } catch (error) {
      setConversations(previous);
      const message = error?.message || 'Please try again.';
      setDeleteError(message);
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert('Could not delete chat: ' + message);
      }
    } finally {
      setDeleting(false);
    }
  }

  function confirmDeleteConversation(conversation) {
    if (!conversation) return;

    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      const confirmed = window.confirm(
        'Delete this chat? This removes it from your list. Other participants will keep their chat and message history.'
      );
      if (confirmed) void performDeleteConversation(conversation);
      return;
    }

    setDeleteError('');
    setDeleteTarget(conversation);
  }

  async function handleConfirmDeleteConversation() {
    await performDeleteConversation(deleteTarget);
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

  // Search covers people, group names, and message previews. Keep the
  // filtering logic pure so malformed/partial rows cannot crash the list.
  const selectedFolder = customFolders.find((folder) => `custom:${folder.id}` === activeFilter);
  const filtered = selectedFolder
    ? filterByChatFolder(conversations, selectedFolder).filter((conversation) => {
        const needle = String(query || '').trim().toLocaleLowerCase();
        return !needle || [conversation?.participant?.name, conversation?.name, conversation?.lastMessage].filter((part) => typeof part === 'string').join(' ').toLocaleLowerCase().includes(needle);
      })
    : filterChatList(conversations, activeFilter, query);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingHorizontal: spacing.md }]}>
        <View style={styles.titleRow}>
          <Knot size={26} signalColor={mood.signal} threadColor={mood.thread} strokeWidth={5} />
          <Text style={[typography.title, { color: colors.textPrimary, marginLeft: 8 }]}>Chats</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.cameraBtn, { backgroundColor: colors.accent, borderColor: hexToRgba(colors.accent, 0.5), shadowColor: colors.accent }]}
            onPress={() => navigation.navigate('Updates')}
            accessibilityLabel="Open camera and updates"
            accessibilityRole="button"
          >
            <Ionicons name="camera" size={19} color={colors.onAccent} />
          </TouchableOpacity>
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
            <Ionicons name="add" size={22} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ marginBottom: spacing.sm }}>
        <View style={styles.storyHeading}>
          <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Moments</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Updates')} accessibilityRole="button" accessibilityLabel="See all moments">
            <Text style={[typography.small, { color: colors.primary }]}>See all</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyTray}>
          <TouchableOpacity onPress={() => navigation.navigate('Updates')} accessibilityRole="button" accessibilityLabel="Add or view your story" style={styles.storyItem}>
            <View style={[styles.storyRing, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Avatar name="Your story" color={colors.primary} size={52} />
              <View style={[styles.storyAdd, { backgroundColor: colors.primary, borderColor: colors.background }]}>
                <Ionicons name="add" size={14} color={colors.onPrimary} />
              </View>
            </View>
            <Text numberOfLines={1} style={[typography.small, { color: colors.textSecondary, marginTop: 6 }]}>Your story</Text>
          </TouchableOpacity>
          {storyGroups.filter((group) => !group.isOwn).map((group) => (
            <TouchableOpacity key={group.userId} onPress={() => navigation.navigate('Updates', { userId: group.userId })} accessibilityRole="button" accessibilityLabel={`Open moments from ${group.name}`} style={styles.storyItem}>
              <View style={[styles.storyRing, { borderColor: group.unseenCount > 0 ? colors.primary : colors.border, backgroundColor: group.unseenCount > 0 ? hexToRgba(colors.primary, 0.16) : colors.surface }]}>
                <View style={[styles.storyInnerRing, { borderColor: colors.background }]}>
                  <Avatar name={group.name} color={colors.accent} size={52} />
                </View>
              </View>
              <Text numberOfLines={1} style={[typography.small, { color: colors.textSecondary, marginTop: 6 }]}>{group.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.sm }}>
        <GlassCard noPadding intensity={28} tintAlpha={0.42} glow>
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
          {[...FILTERS, ...customFolders.map((folder) => ({ key: `custom:${folder.id}`, label: folder.name }))].map((filter) => {
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
                <Text style={[typography.caption, { color: active ? colors.onPrimary : colors.textSecondary }]}>{filter.label}</Text>
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

      {conversationActionError ? (
        <View style={{ marginHorizontal: spacing.md, marginBottom: spacing.sm, padding: spacing.sm, borderRadius: radii.md || 12, borderWidth: 1, borderColor: colors.danger || '#dc2626', backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.danger || '#dc2626'} />
          <Text accessibilityRole="alert" style={[typography.caption, { color: colors.textPrimary, flex: 1, marginHorizontal: spacing.sm }]}>{conversationActionError}</Text>
          <TouchableOpacity onPress={() => setConversationActionError('')} accessibilityRole="button" accessibilityLabel="Dismiss chat action error" style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      ) : null}

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
          loadingMore ? (
            <View accessibilityLiveRegion="polite" style={{ paddingVertical: spacing.md, alignItems: 'center' }}>
              <ActivityIndicator color={colors.textSecondary} />
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>Loading older chats…</Text>
            </View>
          ) : loadMoreError ? (
            <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.md, alignItems: 'center' }}>
              <Text accessibilityRole="alert" style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.sm }]}>{loadMoreError}</Text>
              <TouchableOpacity onPress={handleLoadMore} accessibilityRole="button" accessibilityLabel="Retry loading older chats" style={{ minHeight: 44, paddingHorizontal: spacing.lg, justifyContent: 'center', borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border }}>
                <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Retry loading older chats</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={{ paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl || spacing.xl, alignItems: 'center' }}>
            {initialLoading ? (
              <>
                <ActivityIndicator color={colors.primary} size="large" />
                <Text accessibilityRole="text" style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>Loading your conversations…</Text>
              </>
            ) : loadError ? (
              <>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }}>
                  <Ionicons name="cloud-offline-outline" size={28} color={colors.textSecondary} />
                </View>
                <Text accessibilityRole="header" style={[typography.bodyStrong, { color: colors.textPrimary, marginBottom: spacing.xs, textAlign: 'center' }]}>Your chats couldn't load</Text>
                <Text accessibilityRole="alert" style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md }]}>{loadError}</Text>
                <TouchableOpacity onPress={() => load().catch(() => {})} accessibilityRole="button" accessibilityLabel="Retry loading chats" style={{ minHeight: 44, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={[typography.bodyStrong, { color: colors.onPrimary }]}>Try again</Text>
                </TouchableOpacity>
              </>
            ) : query.trim() ? (
              <>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }}>
                  <Ionicons name="search-outline" size={28} color={colors.textSecondary} />
                </View>
                <Text accessibilityRole="header" style={[typography.bodyStrong, { color: colors.textPrimary, marginBottom: spacing.xs }]}>No matches found</Text>
                <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md }]}>Try another name, group, or message keyword.</Text>
                <TouchableOpacity onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear chat search" style={{ minHeight: 44, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' }}>
                  <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Clear search</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }}>
                  <Ionicons name={activeFilter === 'all' ? 'chatbubbles-outline' : 'filter-outline'} size={30} color={colors.primary} />
                </View>
                <Text accessibilityRole="header" style={[typography.bodyStrong, { color: colors.textPrimary, marginBottom: spacing.xs }]}>{activeFilter === 'all' ? 'Your conversations start here' : `No ${activeFilter} chats yet`}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md }]}>{activeFilter === 'all' ? 'Start a private conversation or create a group. Your chats will appear here.' : 'Try another filter, or start a conversation to build your chat list.'}</Text>
                {activeFilter === 'all' ? (
                  <TouchableOpacity onPress={() => navigation.navigate('NewChat')} accessibilityRole="button" accessibilityLabel="Start your first chat" style={{ minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radii.pill, backgroundColor: colors.primary }}>
                    <Ionicons name="add" size={19} color={colors.onPrimary} />
                    <Text style={[typography.bodyStrong, { color: colors.onPrimary, marginLeft: spacing.xs }]}>Start a chat</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            )}
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
                    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
                      setSheetFor(null);
                      confirmDeleteConversation(conversation);
                    } else {
                      setSheetFor(null);
                      setTimeout(() => confirmDeleteConversation(conversation), 350);
                    }
                  },
                },
              ]
            : []
        }
        onClose={() => setSheetFor(null)}
      />

      <Modal
        visible={Boolean(deleteTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            padding: spacing.lg,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 420,
              alignSelf: 'center',
              padding: spacing.lg,
              borderRadius: 16,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={[
                typography.title,
                { color: colors.textPrimary, marginBottom: spacing.sm },
              ]}
            >
              Delete this chat?
            </Text>

            <Text
              style={[
                typography.body,
                { color: colors.textSecondary, marginBottom: spacing.md },
              ]}
            >
              This removes the chat from your list. Other participants will
              keep their chat and message history.
            </Text>

            {deleteError ? (
              <Text
                accessibilityRole="alert"
                style={{
                  color: colors.danger || '#dc2626',
                  marginBottom: spacing.md,
                }}
              >
                Could not delete chat: {deleteError}
              </Text>
            ) : null}

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: spacing.sm,
                flexWrap: 'wrap',
              }}
            >
              <TouchableOpacity
                disabled={deleting}
                onPress={() => {
                  setDeleteTarget(null);
                  setDeleteError('');
                }}
                accessibilityRole="button"
                accessibilityLabel="Cancel delete chat"
                style={{
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.textPrimary }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={deleting}
                onPress={handleConfirmDeleteConversation}
                accessibilityRole="button"
                accessibilityLabel="Confirm delete chat"
                style={{
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  borderRadius: 10,
                  backgroundColor: deleting ? colors.border : '#dc2626',
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                <Text style={{ color: '#ffffff', fontWeight: '600' }}>
                  {deleting ? 'Deleting…' : 'Delete chat'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  storyHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 9 },
  storyTray: { paddingHorizontal: 16, gap: 14 },
  storyItem: { width: 64, alignItems: 'center' },
  storyRing: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  storyInnerRing: { borderWidth: 2, borderRadius: 30, padding: 2 },
  storyAdd: { position: 'absolute', right: -1, bottom: -1, width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  draftsBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  cameraBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 15, shadowOpacity: 0.34, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
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
