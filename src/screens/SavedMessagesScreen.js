import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../utils/color';
import { getCurrentUser } from '../services/api';
import { loadSavedMessages, removeSavedMessage } from '../services/savedMessages';
import { filterSavedMessages } from '../utils/savedMessages';

export default function SavedMessagesScreen({ navigation }) {
  const { colors, spacing, radii, typography, layout } = useTheme();
  const [userId, setUserId] = useState(null);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const visible = useMemo(() => filterSavedMessages(items, query).filter((item) => kindFilter === 'all' || (kindFilter === 'text' && !item.attachment) || (kindFilter === 'attachments' && Boolean(item.attachment)) || (kindFilter === 'voice' && item.attachment?.type === 'voice')), [items, query, kindFilter]);

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const user = await getCurrentUser();
      const id = user?.id || 'me';
      setUserId(id);
      setItems(await loadSavedMessages(id));
    } catch (_) { setError('Saved messages could not be loaded. Please try again.'); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const remove = (item) => Alert.alert('Remove saved message?', 'This removes the local bookmark only. The original message will remain in the conversation.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: async () => {
      try { setItems(await removeSavedMessage(userId, item.id)); }
      catch (_) { Alert.alert('Could not remove bookmark', 'Please try again.'); }
    } },
  ]);

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <Header eyebrow="YOUR LIBRARY" title="Saved messages" subtitle="Your private, on-device collection" onBack={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}>
        <GlassCard noPadding glow intensity={24} tintAlpha={0.42}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, minHeight: 48 }}>
            <Ionicons name="search-outline" size={19} color={colors.textSecondary} />
            <TextInput value={query} onChangeText={setQuery} placeholder="Search saved messages" placeholderTextColor={colors.textSecondary} style={[typography.body, { flex: 1, minWidth: 0, color: colors.textPrimary, marginLeft: spacing.sm, paddingVertical: 10 }]} accessibilityLabel="Search saved messages" returnKeyType="search" />
            {query ? <TouchableOpacity onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear search" style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="close-circle" size={18} color={colors.textSecondary} /></TouchableOpacity> : null}
          </View>
        </GlassCard>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm }}>
          {[['all', 'All'], ['text', 'Text'], ['attachments', 'Attachments'], ['voice', 'Voice notes']].map(([value, label]) => {
            const selected = kindFilter === value;
            return <TouchableOpacity key={value} onPress={() => setKindFilter(value)} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={'Show ' + label.toLowerCase() + ' saved messages'} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: 999, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? hexToRgba(colors.primary, 0.1) : colors.surface }}>
              <Text style={[typography.caption, { color: selected ? colors.primary : colors.textSecondary, fontWeight: selected ? '800' : '600' }]}>{label}</Text>
            </TouchableOpacity>;
          })}
        </View>
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm }]}>Bookmarks stay on this device and do not sync. Private attachment links are never stored here.</Text>
      </View>
      {loading ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /><Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm }]}>Loading saved messages…</Text></View> : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}><Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>{error}</Text><TouchableOpacity onPress={refresh} accessibilityRole="button" accessibilityLabel="Retry loading saved messages" style={{ minHeight: 48, justifyContent: 'center', marginTop: spacing.md }}><Text style={[typography.bodyStrong, { color: colors.primary }]}>Try again</Text></TouchableOpacity></View>
      ) : (
        <FlatList
          data={visible}
          ListHeaderComponent={
            <GlassCard glow intensity={22} tintAlpha={0.34} style={{ marginBottom: spacing.md }} contentStyle={{ padding: spacing.md, gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.primary}20`, borderWidth: 1, borderColor: `${colors.primary}35` }}>
                  <Ionicons name="bookmark" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0, marginLeft: spacing.md }}>
                  <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Your personal collection</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>Keep the moments and details worth finding again.</Text>
                </View>
                <View style={{ minWidth: 48, alignItems: 'flex-end' }}>
                  <Text style={[typography.heading, { color: colors.primary }]}>{items.length}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>SAVED</Text>
                </View>
              </View>
              <View style={{ height: 1, backgroundColor: colors.border }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>{query.trim() ? `${visible.length} matching ${visible.length === 1 ? 'message' : 'messages'}` : 'PRIVATE TO THIS DEVICE'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name="lock-closed-outline" size={13} color={colors.textSecondary} />
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>PRIVATE</Text>
                </View>
              </View>
            </GlassCard>
          }
          keyExtractor={(item) => String(item.id)}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl || spacing.xl, flexGrow: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}
          renderItem={({ item }) => (
<GlassCard style={{ marginBottom: spacing.sm }} contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.primary}18` }}><Ionicons name={item.attachment ? 'attach-outline' : 'bookmark'} size={19} color={colors.primary} /></View>
                <View style={{ flex: 1, minWidth: 0, marginLeft: spacing.sm }}>
                  <Text style={[typography.bodyStrong, { color: colors.textPrimary }]} numberOfLines={1}>{item.conversation?.name || 'Conversation'}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>{item.senderName || 'Saved message'}{item.createdAt ? ` · ${String(item.createdAt).slice(0, 10)}` : ''}</Text>
                </View>
                <TouchableOpacity onPress={() => remove(item)} accessibilityRole="button" accessibilityLabel="Remove saved message" hitSlop={8} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="bookmark" size={19} color={colors.accent} /></TouchableOpacity>
              </View>
              {item.text ? (
                <View style={{ borderLeftWidth: 2, borderLeftColor: colors.primary, paddingLeft: spacing.md, paddingVertical: spacing.xs }}>
                  <Text style={[typography.body, { color: colors.textPrimary, lineHeight: 23 }]}>{item.text}</Text>
                </View>
              ) : null}
              {item.attachment ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
                  <Ionicons name="attach-outline" size={16} color={colors.primary} />
                  <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: spacing.xs, flex: 1 }]}>{item.attachment.name || (item.attachment.type === 'voice' ? 'Voice note' : 'Attachment')} · Open the conversation to access the original</Text>
                </View>
              ) : null}
              <TouchableOpacity onPress={() => navigation.navigate('Chat', { conversation: item.conversation, targetMessageId: item.messageId })} accessibilityRole="button" accessibilityLabel="Open saved message in conversation" style={{ minHeight: 48, alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, borderRadius: radii.md, backgroundColor: `${colors.primary}12` }}>
                <Text style={[typography.small, { color: colors.primary, fontWeight: '800' }]}>Return to conversation</Text>
                <Ionicons name="arrow-up-right" size={17} color={colors.primary} />
              </TouchableOpacity>
            </GlassCard>
          )}
          ListEmptyComponent={<View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: spacing.xl }}><View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: `${colors.primary}18`, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="bookmark-outline" size={29} color={colors.primary} /></View><Text style={[typography.bodyStrong, { color: colors.textPrimary, marginTop: spacing.md }]}>{query || kindFilter !== 'all' ? 'No matching bookmarks' : 'Nothing saved yet'}</Text><Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>{query || kindFilter !== 'all' ? 'Try another filter or clear your search.' : 'Long-press a message in any chat and choose Save message to keep it close.'}</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}
