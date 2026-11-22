import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../theme/ThemeContext';
import { fetchConversations, getCurrentUser } from '../services/api';
import { clearDraft, loadDraftsForUser } from '../services/drafts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function updatedLabel(value) {
  if (!value) return 'Saved on this device';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Saved on this device';
  return `Updated ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

export default function DraftsScreen({ navigation }) {
  const { colors, spacing, radii, typography, layout } = useTheme();
  const [drafts, setDrafts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draftSearch, setDraftSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const user = await getCurrentUser();
      const items = await loadDraftsForUser(user?.id || 'me');
      setDrafts(items);
      if (items.length) {
        try {
          // The picker only needs a recent conversation directory, not an unbounded
          // history query. Keep the payload bounded and avoid fetching it for an
          // empty drafts collection.
          const result = await fetchConversations({ limit: 100, offset: 0 });
          setConversations(result.conversations || []);
        } catch (_) {
          setConversations([]);
          setError('Drafts are saved, but conversation details could not be loaded. Retry when you are back online.');
        }
      } else {
        setConversations([]);
      }
    } catch (_) {
      setDrafts([]);
      setConversations([]);
      setError('Your drafts could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const conversationsById = useMemo(() => new Map(conversations.map((item) => [item.id, item])), [conversations]);
  const visibleDrafts = useMemo(() => {
    const query = draftSearch.trim().toLowerCase();
    if (!query) return drafts;
    return drafts.filter((draft) => {
      const conversation = conversationsById.get(draft.conversationId);
      const title = conversation?.participant?.name || conversation?.name || '';
      return [draft.text, title].join(' ').toLowerCase().includes(query);
    });
  }, [drafts, conversationsById, draftSearch]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function openDraft(draft) {
    const conversation = conversationsById.get(draft.conversationId);
    if (!conversation) {
      Alert.alert('Conversation unavailable', 'This draft is still stored on this device, but its conversation details are unavailable right now. Reconnect and retry, or delete the draft from here.');
      return;
    }
    navigation.navigate('Chat', { conversation });
  }

  function confirmDelete(draft) {
    Alert.alert('Delete draft?', 'This removes the unsent text from this device. It will not affect sent messages.', [
      { text: 'Keep draft', style: 'cancel' },
      { text: 'Delete draft', style: 'destructive', onPress: async () => {
        const cleared = await clearDraft(draft.key);
        if (!cleared) { Alert.alert("Couldn't delete draft", 'The draft is still stored on this device. Please try again.'); return; }
        setDrafts((current) => current.filter((item) => item.id !== draft.id));
      } },
    ]);
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <Header eyebrow="MESSAGE STUDIO" title="Drafts" subtitle="Unsent messages on this device" onBack={() => navigation.goBack()} />
      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}><ActivityIndicator color={colors.primary} /><Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm }]}>Finding your drafts…</Text></View>
      ) : error && drafts.length === 0 ? (
        <GlassCard style={{ margin: spacing.md }}>
          <Text accessibilityRole="alert" style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>{error}</Text>
          <TouchableOpacity onPress={load} accessibilityRole="button" accessibilityLabel="Retry loading drafts" style={{ minHeight: 48, alignSelf: 'center', marginTop: spacing.md, backgroundColor: colors.primary, borderRadius: radii.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}><Text style={[typography.bodyStrong, { color: colors.onPrimary }]}>Try again</Text></TouchableOpacity>
        </GlassCard>
      ) : (
        <FlatList
          data={visibleDrafts}
          keyExtractor={(draft) => String(draft.id)}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl || spacing.xl, flexGrow: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}
          ListHeaderComponent={
            <View>
              <GlassCard glow style={{ marginBottom: spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: `${colors.primary}20`, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="document-text-outline" size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, marginLeft: spacing.md }}>
                    <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Your message studio</Text>
                    <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>Thoughts in progress, ready when you are. Drafts stay on this device.</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    <Ionicons name="lock-closed-outline" size={13} color={colors.textSecondary} />
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>PRIVATE TO THIS DEVICE</Text>
                  </View>
                  <Text style={[typography.caption, { color: colors.primary, fontWeight: '800' }]}>{drafts.length} {drafts.length === 1 ? 'DRAFT' : 'DRAFTS'}</Text>
                </View>
              </GlassCard>
              {error ? (
                <View accessibilityRole="alert" style={{ marginBottom: spacing.sm }}>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>{error}</Text>
                  {drafts.length > 0 ? (
                    <TouchableOpacity onPress={load} accessibilityRole="button" accessibilityLabel="Retry loading draft conversations" style={{ minHeight: 48, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: spacing.sm }}>
                      <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>Retry conversation lookup</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}
              {drafts.length > 0 ? <>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>{visibleDrafts.length} of {drafts.length} drafts</Text>
                </View>
                <View style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.sm, marginBottom: spacing.sm }}>
                  <Ionicons name="search-outline" size={17} color={colors.textSecondary} />
                  <TextInput value={draftSearch} onChangeText={setDraftSearch} placeholder="Search draft text or conversation" placeholderTextColor={colors.textSecondary} accessibilityLabel="Search drafts" returnKeyType="search" style={[typography.body, { flex: 1, minWidth: 0, color: colors.textPrimary, paddingVertical: spacing.sm, paddingLeft: spacing.sm }]} />
                  {draftSearch ? <TouchableOpacity onPress={() => setDraftSearch('')} accessibilityRole="button" accessibilityLabel="Clear draft search" style={{ minWidth: 40, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="close-circle" size={18} color={colors.textSecondary} /></TouchableOpacity> : null}
                </View>
              </> : null}
            </View>
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl }}>
              <View style={{ width: 68, height: 68, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="checkmark-done-outline" size={30} color={colors.textSecondary} /></View>
              <Text style={[typography.heading, { color: colors.textPrimary, marginTop: spacing.md }]}>{draftSearch.trim() ? 'No matching drafts' : 'All caught up'}</Text>
              <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>{draftSearch.trim() ? 'Try another search or clear your query.' : 'Unsent messages you write will appear here automatically.'}</Text>
            </View>
          }
          renderItem={({ item: draft }) => {
            const conversation = conversationsById.get(draft.conversationId);
            const title = conversation?.participant?.name || conversation?.name || 'Conversation';
            return (
              <GlassCard style={{ marginBottom: spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <TouchableOpacity onPress={() => openDraft(draft)} accessibilityRole="button" accessibilityLabel={`Continue draft for ${title}`} style={{ flex: 1, minHeight: 64, flexDirection: 'row', alignItems: 'flex-start' }}>
                    <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: `${colors.accent}18`, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.accent} /></View>
                    <View style={{ flex: 1, minWidth: 0, marginLeft: spacing.md }}>
                      <Text style={[typography.bodyStrong, { color: colors.textPrimary }]} numberOfLines={1}>{title}</Text>
                      <View style={{ borderLeftWidth: 2, borderLeftColor: colors.accent, paddingLeft: spacing.sm, marginTop: spacing.sm }}>
                        <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]} numberOfLines={3}>{draft.text}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm }}>
                        <Text style={[typography.caption, { color: colors.textSecondary }]}>{updatedLabel(draft.updatedAt).toUpperCase()}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={[typography.caption, { color: colors.primary, fontWeight: '800' }]}>CONTINUE</Text>
                          <Ionicons name="arrow-forward" size={13} color={colors.primary} />
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDelete(draft)} accessibilityRole="button" accessibilityLabel={`Delete draft for ${title}`} hitSlop={8} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.xs }}><Ionicons name="trash-outline" size={18} color={colors.danger} /></TouchableOpacity>
                </View>
              </GlassCard>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
