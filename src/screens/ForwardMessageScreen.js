import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import GlassCard from '../components/GlassCard';
import { fetchConversations, sendMessage } from '../services/api';

export default function ForwardMessageScreen({ navigation, route }) {
  const { colors, spacing, typography, layout } = useTheme();
  const { messageText, sourceConversationId } = route.params || {};
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setLoadFailed(false);
    fetchConversations()
      .then((result) => {
        const rows = Array.isArray(result) ? result : result?.conversations || [];
        if (mounted) setConversations(rows.filter((item) => item.id !== sourceConversationId && !item.isArchived));
      })
      .catch(() => {
        if (mounted) {
          setConversations([]);
          setLoadFailed(true);
        }
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [sourceConversationId, retryCount]);

  async function forwardTo(conversation) {
    if (typeof messageText !== 'string' || !messageText.trim()) {
      Alert.alert('Cannot forward message', 'Only non-empty text messages can be forwarded in this version.');
      return;
    }
    setSendingId(conversation.id);
    try {
      await sendMessage(conversation.id, messageText.trim());
      navigation.replace('Chat', { conversation });
    } catch (error) {
      Alert.alert("Couldn't forward message", error.message || 'Please try again.');
      setSendingId(null);
    }
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Forward message" onBack={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}>
        <GlassCard glow style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Ionicons name="arrow-redo-outline" size={18} color={colors.accent} style={{ marginRight: spacing.sm, marginTop: 2 }} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 4 }]}>Text message</Text>
              <Text style={[typography.body, { color: colors.textPrimary }]} numberOfLines={4}>{messageText || 'Message unavailable'}</Text>
            </View>
          </View>
        </GlassCard>
        <Text style={[typography.heading, { color: colors.textPrimary, marginBottom: spacing.sm }]}>Choose a chat</Text>
      </View>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.md }]}>Loading your chats…</Text>
        </View>
      ) : loadFailed ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing.md, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}>
          <GlassCard glow style={{ alignItems: 'center', padding: spacing.lg }}>
            <Ionicons name="cloud-offline-outline" size={30} color={colors.accent} />
            <Text style={[typography.heading, { color: colors.textPrimary, marginTop: spacing.md, textAlign: 'center' }]}>Couldn't load chats</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' }]}>Check your connection, then try again.</Text>
            <TouchableOpacity onPress={() => setRetryCount((count) => count + 1)} style={{ minHeight: 48, minWidth: 132, marginTop: spacing.lg, paddingHorizontal: spacing.lg, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }} accessibilityRole="button" accessibilityLabel="Retry loading chats">
              <Text style={[typography.bodyStrong, { color: colors.onPrimary }]}>Try again</Text>
            </TouchableOpacity>
          </GlassCard>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.lg, flexGrow: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}
          ListEmptyComponent={(
            <GlassCard glow style={{ alignItems: 'center', padding: spacing.lg, marginTop: spacing.xl }}>
              <Ionicons name="chatbubbles-outline" size={28} color={colors.accent} />
              <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginTop: spacing.md }]}>No other chats yet</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' }]}>Start a conversation before forwarding this message.</Text>
              <TouchableOpacity onPress={() => navigation.navigate('NewChat')} style={{ minHeight: 48, minWidth: 132, marginTop: spacing.md, paddingHorizontal: spacing.lg, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }} accessibilityRole="button" accessibilityLabel="Start a new chat to forward this message">
                <Text style={[typography.bodyStrong, { color: colors.onPrimary }]}>Start a chat</Text>
              </TouchableOpacity>
            </GlassCard>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => forwardTo(item)} disabled={Boolean(sendingId)} style={{ minHeight: 64 }} accessibilityRole="button" accessibilityLabel={`Forward message to ${item.participant?.name || item.name || 'group chat'}`} accessibilityState={{ disabled: Boolean(sendingId), busy: sendingId === item.id }} activeOpacity={0.8}>
              <GlassCard style={{ marginBottom: spacing.sm }} contentStyle={{ minHeight: 64, flexDirection: 'row', alignItems: 'center' }}>
                <Avatar name={item.participant?.name || item.name || 'Group'} color={item.participant?.avatarColor || colors.primary} imageUrl={item.participant?.avatarUrl} />
                <View style={{ flex: 1, minWidth: 0, marginLeft: spacing.sm }}>
                  <Text style={[typography.bodyStrong, { color: colors.textPrimary }]} numberOfLines={1}>{item.participant?.name || item.name || 'Group chat'}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>{item.isGroup ? 'Group conversation' : item.lastMessage || 'No messages yet'}</Text>
                </View>
                {sendingId === item.id ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="arrow-redo-outline" size={18} color={colors.accent} />}
              </GlassCard>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
