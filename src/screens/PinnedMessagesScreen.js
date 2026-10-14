import React, { useCallback, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../theme/ThemeContext';
import { getCurrentUser } from '../services/api';
import { loadPinnedMessages, unpinMessageLocally } from '../services/pinnedMessages';
import { filterPinnedMessages } from '../utils/pinnedMessages';

export default function PinnedMessagesScreen({ route, navigation }) {
  const conversation = route.params?.conversation;
  const { colors, spacing, radii, typography } = useTheme();
  const [userId, setUserId] = useState(null);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const visible = useMemo(() => filterPinnedMessages(items, query, conversation?.id), [items, query, conversation?.id]);

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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Pinned messages" subtitle={conversation?.name || conversation?.participant?.name || 'This conversation'} onBack={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, paddingHorizontal: spacing.md, backgroundColor: colors.surface, minHeight: 48 }}>
          <Ionicons name="search-outline" size={19} color={colors.textSecondary} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search pinned messages" placeholderTextColor={colors.textSecondary} style={[typography.body, { flex: 1, color: colors.textPrimary, marginLeft: spacing.sm, paddingVertical: 10 }]} accessibilityLabel="Search pinned messages" returnKeyType="search" />
          {query ? <TouchableOpacity onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear search"><Ionicons name="close-circle" size={18} color={colors.textSecondary} /></TouchableOpacity> : null}
        </View>
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm }]}>Pins are stored on this device and do not sync to other devices. They are bookmarks, not shared conversation pins.</Text>
      </View>
      {loading ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /><Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm }]}>Loading pinned messages…</Text></View> : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}><Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>{error}</Text><TouchableOpacity onPress={refresh} style={{ marginTop: spacing.md }}><Text style={[typography.bodyStrong, { color: colors.primary }]}>Try again</Text></TouchableOpacity></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl || spacing.xl }}>
          {visible.map((item) => (
            <GlassCard key={item.id} style={{ marginBottom: spacing.sm }} contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.primary}18` }}><Ionicons name={item.attachment ? 'attach-outline' : 'pin'} size={19} color={colors.primary} /></View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={[typography.bodyStrong, { color: colors.textPrimary }]} numberOfLines={1}>{item.senderName || 'Pinned message'}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>{item.conversationName}{item.createdAt ? ` · ${String(item.createdAt).slice(0, 10)}` : ''}</Text>
                </View>
                <TouchableOpacity onPress={() => remove(item)} accessibilityRole="button" accessibilityLabel="Unpin message" hitSlop={8}><Ionicons name="pin-outline" size={19} color={colors.accent} /></TouchableOpacity>
              </View>
              {item.text ? <Text style={[typography.body, { color: colors.textPrimary }]}>{item.text}</Text> : null}
              {item.attachment ? <Text style={[typography.caption, { color: colors.textSecondary }]}><Ionicons name="attach-outline" size={13} /> {item.attachment.name || (item.attachment.type === 'voice' ? 'Voice note' : 'Attachment')} · Open the conversation to access the original</Text> : null}
              <TouchableOpacity onPress={() => navigation.navigate('Chat', { conversation: item.conversation || { id: item.conversationId, name: item.conversationName || 'Conversation' }, targetMessageId: item.messageId })} accessibilityRole="button" accessibilityLabel="Open original message" style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingVertical: 5 }}>
                <Text style={[typography.small, { color: colors.primary, fontWeight: '700' }]}>Open original message</Text><Ionicons name="arrow-forward" size={15} color={colors.primary} style={{ marginLeft: 5 }} />
              </TouchableOpacity>
            </GlassCard>
          ))}
          {!visible.length ? <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 72, paddingHorizontal: spacing.xl }}><View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: `${colors.primary}18`, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="pin-outline" size={29} color={colors.primary} /></View><Text style={[typography.bodyStrong, { color: colors.textPrimary, marginTop: spacing.md }]}>{query ? 'No matching pins' : 'No pinned messages yet'}</Text><Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>{query ? 'Try a different search.' : 'Long-press a message in this chat and choose Pin message to keep it close.'}</Text></View> : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
