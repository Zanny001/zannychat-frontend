import React, { useCallback, useRef, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../theme/ThemeContext';
import { fetchConversations } from '../services/api';
import { useAuthenticatedUserId } from '../hooks/useAuthenticatedUserId';
import { clearDraft, loadDraftsForUser } from '../services/drafts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function updatedLabel(value) {
  if (!value) return 'Saved on this device';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Saved on this device';
  return `Updated ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

export default function DraftsScreen({ navigation }) {
  const { colors, spacing, radii, typography } = useTheme();
  const [drafts, setDrafts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestRef = useRef(0);
  const { userId, userIdRef } = useAuthenticatedUserId(useCallback(() => {
    requestRef.current += 1;
    setDrafts([]);
    setConversations([]);
    setError('');
    setLoading(true);
    if (navigation?.canGoBack?.()) navigation.goBack();
  }, [navigation]));

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    if (!userId) {
      setDrafts([]);
      setConversations([]);
      setLoading(false);
      return;
    }
    const expectedUserId = userId;
    setLoading(true);
    setError('');
    try {
      const items = await loadDraftsForUser(expectedUserId);
      if (requestId !== requestRef.current || userIdRef.current !== expectedUserId) return;
      setDrafts(Array.isArray(items) ? items : []);
      try {
        const result = await fetchConversations({ limit: 1000, offset: 0 });
        if (requestId !== requestRef.current || userIdRef.current !== expectedUserId) return;
        setConversations(result.conversations || []);
      } catch (_) {
        if (requestId !== requestRef.current || userIdRef.current !== expectedUserId) return;
        setConversations([]);
        if (items.length) setError('Drafts are saved, but conversation details could not be loaded. Retry when you are back online.');
        else throw new Error('Conversation details unavailable');
      }
    } catch (_) {
      if (requestId === requestRef.current && userIdRef.current === expectedUserId) {
        setDrafts([]);
        setConversations([]);
        setError('Your drafts could not be loaded. Please try again.');
      }
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [userId, userIdRef]);

  useFocusEffect(useCallback(() => {
    load();
    return () => { requestRef.current += 1; };
  }, [load]));

  function openDraft(draft) {
    const conversation = conversations.find((item) => item.id === draft.conversationId);
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
        const expectedUserId = userId;
        if (!expectedUserId || userIdRef.current !== expectedUserId) return;
        const cleared = await clearDraft(draft.key);
        if (userIdRef.current !== expectedUserId) return;
        if (!cleared) { Alert.alert("Couldn't delete draft", 'The draft is still stored on this device. Please try again.'); return; }
        setDrafts((current) => current.filter((item) => item.id !== draft.id));
      } },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Drafts" subtitle="Unsent messages on this device" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl || spacing.xl }}>
        <GlassCard glow style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: `${colors.primary}20`, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="document-text-outline" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0, marginLeft: spacing.md }}>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Pick up where you left off</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>Drafts stay on this device and do not sync across devices.</Text>
            </View>
          </View>
        </GlassCard>

        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}><ActivityIndicator color={colors.primary} /><Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm }]}>Finding your drafts…</Text></View>
        ) : error && drafts.length === 0 ? (
          <GlassCard>
            <Text accessibilityRole="alert" style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>{error}</Text>
            <TouchableOpacity onPress={load} accessibilityRole="button" accessibilityLabel="Retry loading drafts" style={{ minHeight: 48, alignSelf: 'center', marginTop: spacing.md, backgroundColor: colors.primary, borderRadius: radii.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}><Text style={[typography.bodyStrong, { color: colors.onPrimary }]}>Try again</Text></TouchableOpacity>
          </GlassCard>
        ) : drafts.length === 0 ? (
          <View style={{ alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl }}>
            <View style={{ width: 68, height: 68, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="checkmark-done-outline" size={30} color={colors.textSecondary} /></View>
            <Text style={[typography.heading, { color: colors.textPrimary, marginTop: spacing.md }]}>All caught up</Text>
            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>Unsent messages you write will appear here automatically.</Text>
          </View>
        ) : (
          <View>
            {error ? <Text accessibilityRole="alert" style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>{error}</Text> : null}
            {drafts.map((draft) => {
          const conversation = conversations.find((item) => item.id === draft.conversationId);
          const title = conversation?.participant?.name || conversation?.name || 'Conversation';
          return (
            <GlassCard key={draft.id} style={{ marginBottom: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <TouchableOpacity onPress={() => openDraft(draft)} accessibilityRole="button" accessibilityLabel={`Continue draft for ${title}`} style={{ flex: 1, minHeight: 64, flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: `${colors.accent}18`, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.accent} /></View>
                  <View style={{ flex: 1, minWidth: 0, marginLeft: spacing.md }}>
                    <Text style={[typography.bodyStrong, { color: colors.textPrimary }]} numberOfLines={1}>{title}</Text>
                    <Text style={[typography.body, { color: colors.textSecondary, marginTop: 5 }]} numberOfLines={3}>{draft.text}</Text>
                    <Text style={[typography.caption, { color: colors.primary, marginTop: spacing.sm }]}>{updatedLabel(draft.updatedAt).toUpperCase()}  ·  CONTINUE DRAFT</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDelete(draft)} accessibilityRole="button" accessibilityLabel={`Delete draft for ${title}`} hitSlop={8} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.xs }}><Ionicons name="trash-outline" size={18} color={colors.danger} /></TouchableOpacity>
              </View>
            </GlassCard>
          );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
