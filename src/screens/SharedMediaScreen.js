import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Linking, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../theme/ThemeContext';
import { fetchMessages } from '../services/api';
import { classifySharedContent, filterSharedItems, getSafeSharedMediaUrl, mergeOlderMessages } from '../utils/sharedContent';

const PAGE_SIZE = 30;
const MAX_PAGES_PER_LOAD = 6;
const TABS = [
  { key: 'photos', label: 'Photos', icon: 'images-outline' },
  { key: 'files', label: 'Files', icon: 'document-text-outline' },
  { key: 'links', label: 'Links', icon: 'link-outline' },
];

function readableDate(value) {
  if (!value) return '';
  return String(value);
}

export default function SharedMediaScreen({ route, navigation }) {
  const { conversation } = route.params;
  const { colors, spacing, radii, typography } = useTheme();
  const [tab, setTab] = useState('photos');
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [failedPhotoIds, setFailedPhotoIds] = useState(() => new Set());
  const loadGeneration = useRef(0);

  const content = useMemo(() => classifySharedContent(messages), [messages]);
  const currentItems = content[tab] || [];
  const visibleItems = useMemo(() => filterSharedItems(currentItems, searchQuery), [currentItems, searchQuery]);

  const loadInitial = useCallback(async () => {
    const requestId = ++loadGeneration.current;
    setLoading(true);
    setLoadingMore(false);
    setError('');
    setMessages([]);
    setFailedPhotoIds(new Set());
    setHasMore(false);
    try {
      const result = await fetchMessages(conversation.id, { limit: PAGE_SIZE });
      if (requestId !== loadGeneration.current) return;
      if (!result || !Array.isArray(result.messages)) throw new Error('Invalid messages response');
      setMessages(mergeOlderMessages([], result.messages));
      setHasMore(Boolean(result.hasMore));
    } catch (_) {
      if (requestId === loadGeneration.current) setError('Shared items could not be loaded. Check your connection and try again.');
    } finally {
      if (requestId === loadGeneration.current) setLoading(false);
    }
  }, [conversation.id]);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  const loadOlder = useCallback(async () => {
    if (loadingMore || !hasMore || !messages.length) return;
    const requestId = loadGeneration.current;
    setLoadingMore(true);
    setError('');
    try {
      let cursor = messages[0]?.createdAtRaw;
      let collected = [];
      let more = hasMore;
      // Fetch a bounded number of pages per action. The user can request
      // another batch, so a large conversation never causes an unbounded query.
      for (let page = 0; page < MAX_PAGES_PER_LOAD && more; page += 1) {
        const result = await fetchMessages(conversation.id, { limit: PAGE_SIZE, before: cursor });
        if (requestId !== loadGeneration.current) return;
        if (!result || !Array.isArray(result.messages)) throw new Error('Invalid messages response');
        const older = result.messages;
        if (!older.length) { more = false; break; }
        collected = [...older, ...collected];
        cursor = older[0]?.createdAtRaw;
        more = Boolean(result.hasMore);
        if (collected.length >= PAGE_SIZE * 2) break;
      }
      if (requestId !== loadGeneration.current) return;
      setMessages((previous) => mergeOlderMessages(previous, collected));
      setHasMore(more);
    } catch (_) {
      if (requestId === loadGeneration.current) setError('Older shared items could not be loaded. Please try again.');
    } finally {
      if (requestId === loadGeneration.current) setLoadingMore(false);
    }
  }, [conversation.id, hasMore, loadingMore, messages]);

  async function openLink(url) {
    // Link extraction already filters to HTTP(S), but validate again at the
    // navigation boundary in case route data is ever changed by another caller.
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) {
        throw new Error('Invalid link');
      }
      await Linking.openURL(parsed.toString());
    } catch (_) {
      Alert.alert('Link unavailable', 'This link could not be opened safely.');
    }
  }

  async function openAttachment(item) {
    const safeUrl = getSafeSharedMediaUrl(item?.mediaUrl);
    if (!safeUrl) {
      Alert.alert('Attachment unavailable', 'This attachment has an invalid or expired address.');
      return;
    }
    if (item.mediaType === 'image') {
      setFullscreenImage(safeUrl);
      return;
    }
    try {
      await Linking.openURL(safeUrl);
    } catch (_) {
      Alert.alert('Unable to open file', 'Try again when you have a connection.');
    }
  }

  function renderEmpty() {
    const emptyCopy = {
      photos: ['No photos yet', 'Photos shared in this conversation will appear here.'],
      files: ['No files yet', 'Documents and voice notes shared in this conversation will appear here.'],
      links: ['No links yet', 'Links shared in messages will appear here.'],
    }[tab];
    return (
      <View style={styles.emptyWrap}>
        <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}35` }]}>
          <Ionicons name={TABS.find((item) => item.key === tab)?.icon || 'albums-outline'} size={28} color={colors.primary} />
        </View>
        <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginTop: spacing.md }]}>{emptyCopy[0]}</Text>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs, maxWidth: 270 }]}>{emptyCopy[1]}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Shared media" subtitle={conversation.participant?.name || 'Conversation'} onBack={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md }}>
        <View style={[styles.tabRail, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }]} accessibilityRole="tablist">
          {TABS.map((item) => {
            const active = tab === item.key;
            const count = content[item.key]?.length || 0;
            return (
              <TouchableOpacity key={item.key} onPress={() => setTab(item.key)} activeOpacity={0.8}
                accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={`${item.label}, ${count} items`}
                style={[styles.tab, { backgroundColor: active ? `${colors.primary}20` : 'transparent', borderColor: active ? `${colors.primary}55` : 'transparent' }]}>
                <Ionicons name={item.icon} size={16} color={active ? colors.primary : colors.textSecondary} />
                <Text style={[typography.small, { color: active ? colors.primary : colors.textSecondary, marginLeft: 5, fontWeight: active ? '700' : '500' }]}>{item.label}</Text>
                <Text style={[styles.count, { color: active ? colors.primary : colors.textSecondary }]}>{count}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder={`Search ${TABS.find((item) => item.key === tab)?.label.toLowerCase() || 'shared items'}…`} placeholderTextColor={colors.textSecondary} accessibilityLabel={`Search shared ${tab}`} returnKeyType="search" clearButtonMode="while-editing" style={[typography.body, { color: colors.textPrimary, marginTop: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md }]} />
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm }]}>Recent shared items · private attachments use expiring access links.</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm }]}>Finding shared items…</Text></View>
      ) : error && messages.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={30} color={colors.textSecondary} />
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md, marginHorizontal: spacing.xl }]}>{error}</Text>
          <TouchableOpacity onPress={loadInitial} style={[styles.retryButton, { backgroundColor: colors.primary, borderRadius: radii.md }]}><Text style={[typography.bodyStrong, { color: colors.onPrimary }]}>Try again</Text></TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl || spacing.xl }}>
          {error ? <Text accessibilityRole="alert" style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>{error}</Text> : null}
          {tab === 'photos' && visibleItems.length > 0 ? (
            <View style={styles.photoGrid}>
              {visibleItems.map((item) => (
                <TouchableOpacity key={item.id} onPress={() => { if (failedPhotoIds.has(String(item.id))) { setFailedPhotoIds((previous) => { const next = new Set(previous); next.delete(String(item.id)); return next; }); } else { openAttachment(item); } }} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={failedPhotoIds.has(String(item.id)) ? `Retry photo ${item.mediaName || ''}` : `Open photo ${item.mediaName || ''}`} style={[styles.photoCell, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md }]}>
                  {failedPhotoIds.has(String(item.id)) ? (
                    <View style={[styles.photoFailure, { backgroundColor: colors.surface }]}>
                      <Ionicons name="image-outline" size={26} color={colors.textSecondary} />
                      <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: 6 }]}>Photo unavailable</Text>
                      <Text style={[typography.caption, { color: colors.primary, marginTop: 3 }]}>Tap to retry</Text>
                    </View>
                  ) : (
                    <Image source={{ uri: item.mediaUrl }} style={styles.photo} resizeMode="cover" onError={() => setFailedPhotoIds((previous) => new Set(previous).add(String(item.id)))} />
                  )}
                  <View style={[styles.photoMeta, { backgroundColor: `${colors.background}E8` }]}><Text numberOfLines={1} style={[typography.caption, { color: colors.textPrimary }]}>{item.mediaName || item.createdAt || 'Shared photo'}</Text></View>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
          {tab === 'files' && visibleItems.map((item) => (
            <TouchableOpacity key={item.id} onPress={() => openAttachment(item)} activeOpacity={0.82} accessibilityRole="button" accessibilityLabel={`Open ${item.mediaName || (item.mediaType === 'voice' ? 'voice note' : 'shared file')}`} style={{ marginBottom: spacing.sm }}>
              <GlassCard contentStyle={styles.fileRow}>
                <View style={[styles.fileIcon, { backgroundColor: `${colors.primary}18`, borderRadius: radii.md }]}><Ionicons name={item.mediaType === 'voice' || item.mediaType === 'audio' ? 'musical-notes-outline' : item.mediaType === 'video' ? 'videocam-outline' : 'document-text-outline'} size={22} color={colors.primary} /></View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text numberOfLines={1} style={[typography.bodyStrong, { color: colors.textPrimary }]}>{item.mediaName || (item.mediaType === 'voice' ? 'Voice note' : item.mediaType === 'video' ? 'Video' : 'Shared file')}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>{readableDate(item.createdAt)}{item.mediaSize ? ` · ${Math.max(1, Math.round(item.mediaSize / 1024))} KB` : ''}</Text>
                </View>
                <Ionicons name="open-outline" size={19} color={colors.textSecondary} />
              </GlassCard>
            </TouchableOpacity>
          ))}
          {tab === 'links' && visibleItems.map((item, index) => (
            <TouchableOpacity key={`${item.messageId}-${item.url}-${index}`} onPress={() => openLink(item.url)} activeOpacity={0.82} accessibilityRole="link" accessibilityLabel={`Open link to ${item.host}`} style={{ marginBottom: spacing.sm }}>
              <GlassCard contentStyle={styles.linkRow}>
                <View style={[styles.linkIcon, { backgroundColor: `${colors.primary}18`, borderRadius: radii.md }]}><Ionicons name="link-outline" size={21} color={colors.primary} /></View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text numberOfLines={2} style={[typography.bodyStrong, { color: colors.textPrimary }]}>{item.title}</Text>
                  <Text numberOfLines={1} style={[typography.caption, { color: colors.primary, marginTop: 4 }]}>{item.host}</Text>
                  {item.senderName ? <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>Shared by {item.senderName}</Text> : null}
                </View>
                <Ionicons name="arrow-up-right" size={18} color={colors.textSecondary} />
              </GlassCard>
            </TouchableOpacity>
          ))}
          {!visibleItems.length && !loading ? (searchQuery.trim() ? <View style={styles.emptyWrap}><Ionicons name="search-outline" size={28} color={colors.textSecondary} /><Text style={[typography.bodyStrong, { color: colors.textPrimary, marginTop: spacing.md }]}>No matching items</Text><Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>Try a different name, sender, file type or link.</Text><TouchableOpacity onPress={() => setSearchQuery('')} accessibilityRole="button" style={[styles.retryButton, { backgroundColor: colors.primary, borderRadius: radii.md }]}><Text style={[typography.bodyStrong, { color: colors.onPrimary }]}>Clear search</Text></TouchableOpacity></View> : renderEmpty()) : null}
          {hasMore ? (
            <TouchableOpacity onPress={loadOlder} disabled={loadingMore} activeOpacity={0.82} style={[styles.loadMore, { borderColor: colors.border, borderRadius: radii.lg }]} accessibilityRole="button">
              {loadingMore ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="time-outline" size={17} color={colors.primary} />}
              <Text style={[typography.bodyStrong, { color: colors.primary, marginLeft: spacing.sm }]}>{loadingMore ? 'Loading older items…' : 'Load older shared items'}</Text>
            </TouchableOpacity>
          ) : null}
          <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md }]}>Showing {visibleItems.length} of {currentItems.length} items in loaded messages. Deleted messages are excluded.</Text>
        </ScrollView>
      )}

      {fullscreenImage ? (
        <View style={styles.lightbox} accessibilityViewIsModal>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setFullscreenImage(null)} accessibilityRole="button" accessibilityLabel="Close photo preview"><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity>
          <Image source={{ uri: fullscreenImage }} style={styles.fullscreenPhoto} resizeMode="contain" accessibilityLabel="Shared photo, full screen" />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabRail: { flexDirection: 'row', borderWidth: 1, padding: 4, gap: 4 },
  tab: { flex: 1, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 11, borderWidth: 1, paddingHorizontal: 4 },
  count: { fontSize: 11, marginLeft: 5, fontVariant: ['tabular-nums'] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  retryButton: { marginTop: 16, paddingHorizontal: 18, paddingVertical: 11 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  photoCell: { width: '48.5%', aspectRatio: 0.92, marginBottom: 10, borderWidth: 1, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  photoFailure: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', padding: 10 },
  photoMeta: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 8, paddingVertical: 7 },
  fileRow: { flexDirection: 'row', alignItems: 'center' },
  fileIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  linkRow: { flexDirection: 'row', alignItems: 'center' },
  linkIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { minHeight: 240, alignItems: 'center', justifyContent: 'center', paddingVertical: 26 },
  emptyIcon: { width: 58, height: 58, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  loadMore: { minHeight: 48, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, paddingHorizontal: 12 },
  lightbox: { ...StyleSheet.absoluteFillObject, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.96)', alignItems: 'center', justifyContent: 'center' },
  lightboxClose: { position: 'absolute', top: 44, right: 20, zIndex: 2, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  fullscreenPhoto: { width: '100%', height: '100%' },
});
