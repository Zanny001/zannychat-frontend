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
import { loadPinnedMessages, unpinMessageLocally } from '../services/pinnedMessages';
import { filterPinnedMessages } from '../utils/pinnedMessages';

export default function PinnedMessagesScreen({ route, navigation }) {
  const conversation = route.params?.conversation;
  const { colors, spacing, radii, typography, layout } = useTheme();
  const [userId, setUserId] = useState(null);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const visible = useMemo(() => filterPinnedMessages(items, query, conversation?.id).filter((item) => kindFilter === 'all' || (kindFilter === 'text' && !item.attachment) || (kindFilter === 'attachments' && Boolean(item.attachment)) || (kindFilter === 'voice' && item.attachment?.type === 'voice')), [items, query, conversation?.id, kindFilter]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const user = await getCurrentUser();
      const id = user?.id || 'me';
      setUserId(id);
      setItems(await loadPinnedMessages(id));
    } catch (_) {
      setError('Pinned messages could not be loaded. Please try again.');
    } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const remove = (item) => Alert.alert('Unpin this message?', 'The original message will remain in the conversation.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Unpin', style: 'destructive', onPress: async () => {
      try { setItems(await unpinMessageLocally(userId, item.id)); }
      catch (_) { Alert.alert('Could not unpin message', 'Please try again.'); }
    } },
  ]);

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <Header eyebrow="QUICK ACCESS" title="Pinned messages" subtitle={conversation?.name || conversation?.participant?.name || 'This conversation'} onBack={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}>
        <GlassCard noPadding glow intensity={24} tintAlpha={0.42}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, minHeight: 48 }}>
            <Ionicons name="search-outline" size={19} color={colors.textSecondary} />
            <TextInput value={query} onChangeText={setQuery} placeholder="Search pinned messages" placeholderTextColor={colors.textSecondary} style={[typography.body, { flex: 1, minWidth: 0, color: colors.textPrimary, marginLeft: spacing.sm, paddingVertical: 10 }]} accessibilityLabel="Search pinned messages" returnKeyType="search" />
            {query ? <TouchableOpacity onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear search" style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="close-circle" size={18} color={colors.textSecondary} /></TouchableOpacity> : null}
          </View>
        </GlassCard>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm }}>
          {[['all', 'All'], ['text', 'Text'], ['attachments', 'Attachments'], ['voice', 'Voice notes']].map(([value, label]) => {
            const selected = kindFilter === value;
            return <TouchableOpacity key={value} onPress={() => setKindFilter(value)} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={'Show ' + label.toLowerCase() + ' pins'} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: 999, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? hexToRgba(colors.primary, 0.1) : colors.surface }}>
              <Text style={[typography.caption, { color: selected ? colors.primary : colors.textSecondary, fontWeight: selected ? '800' : '600' }]}>{label}</Text>
            </TouchableOpacity>;
          })}
        </View>
        <GlassCard glow style={{ marginTop: spacing.md, borderRadius: 24, borderWidth: 1, borderColor: colors.border }} contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ width: 50, height: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              <Ionicons name="bookmark" size={23} color={colors.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '900', letterSpacing: 1.2 }]}>YOUR PERSONAL HIGHLIGHTS</Text>
              <Text style={[typography.heading, { color: colors.textPrimary, fontSize: 19 }]}>Keep the important close.</Text>
            </View>
            <View style={{ minWidth: 44, minHeight: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.xs }}>
              <Text style={[typography.bodyStrong, { color: colors.primary }]}>{visible.length}</Text>
              <Text style={[typography.small, { color: colors.textSecondary }]}>shown</Text>
            </View>
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 19 }]}>Find a saved moment, then jump straight back to its original conversation. Your pins are private device bookmarks and do not sync across devices.</Text>
        </GlassCard>
      </View>
      {loading ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /><Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm }]}>Loading pinned messages…</Text></View> : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}><Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>{error}</Text><TouchableOpacity onPress={refresh} accessibilityRole="button" accessibilityLabel="Retry loading pinned messages" style={{ minHeight: 48, justifyContent: 'center', marginTop: spacing.md }}><Text style={[typography.bodyStrong, { color: colors.primary }]}>Try again</Text></TouchableOpacity></View>
      ) : (
        <FlatList
          data={visible}
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
                <View style={{ width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.primary}18` }}><Ionicons name={item.attachment ? 'attach-outline' : 'pin'} size={19} color={colors.primary} /></View>
                <View style={{ flex: 1, minWidth: 0, marginLeft: spacing.sm }}>
                  <Text style={[typography.bodyStrong, { color: colors.textPrimary }]} numberOfLines={1}>{item.senderName || 'Pinned message'}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>{item.conversationName}{item.createdAt ? ` · ${String(item.createdAt).slice(0, 10)}` : ''}</Text>
                </View>
                <TouchableOpacity onPress={() => remove(item)} accessibilityRole="button" accessibilityLabel="Unpin message" hitSlop={8} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="pin-outline" size={19} color={colors.accent} /></TouchableOpacity>
              </View>
              {item.text ? <Text style={[typography.body, { color: colors.textPrimary }]}>{item.text}</Text> : null}
              {item.attachment ? <Text style={[typography.caption, { color: colors.textSecondary }]}><Ionicons name="attach-outline" size={13} /> {item.attachment.name || (item.attachment.type === 'voice' ? 'Voice note' : 'Attachment')} · Open the conversation to access the original</Text> : null}
              <TouchableOpacity onPress={() => navigation.navigate('Chat', { conversation: item.conversation || { id: item.conversationId, name: item.conversationName || 'Conversation' }, targetMessageId: item.messageId })} accessibilityRole="button" accessibilityLabel="Open original message" style={{ minHeight: 48, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
                <Text style={[typography.small, { color: colors.primary, fontWeight: '700' }]}>Open original message</Text><Ionicons name="arrow-forward" size={15} color={colors.primary} style={{ marginLeft: 5 }} />
              </TouchableOpacity>
            </GlassCard>
          )}
          ListEmptyComponent={<View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: spacing.xl }}><View style={{ width: 72, height: 72, borderRadius: 25, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="bookmark-outline" size={31} color={colors.primary} /></View><Text style={[typography.bodyStrong, { color: colors.textPrimary, marginTop: spacing.md }]}>{query || kindFilter !== 'all' ? 'No matching pins' : 'No pinned messages yet'}</Text><Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs, lineHeight: 21 }]}>{query || kindFilter !== 'all' ? 'Try another filter or clear your search to see every saved message.' : 'When a message matters, pin it from the conversation. It will be waiting here whenever you need it.'}</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}
