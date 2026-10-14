import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import GlassCard from '../components/GlassCard';
import { fetchConversations, sendMessage } from '../services/api';

export default function ForwardMessageScreen({ navigation, route }) {
  const { colors, spacing, typography } = useTheme();
  const { messageText, sourceConversationId } = route.params || {};
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchConversations()
      .then((result) => {
        const rows = Array.isArray(result) ? result : result?.conversations || [];
        if (mounted) setConversations(rows.filter((item) => item.id !== sourceConversationId && !item.isArchived));
      })
      .catch((error) => Alert.alert("Couldn't load chats", error.message || 'Please try again.'))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [sourceConversationId]);

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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Forward message" onBack={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md }}>
        <GlassCard style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Ionicons name="arrow-redo-outline" size={18} color={colors.accent} style={{ marginRight: spacing.sm, marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 4 }]}>Text message</Text>
              <Text style={[typography.body, { color: colors.textPrimary }]} numberOfLines={4}>{messageText || 'Message unavailable'}</Text>
            </View>
          </View>
        </GlassCard>
        <Text style={[typography.heading, { color: colors.textPrimary, marginBottom: spacing.sm }]}>Choose a chat</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.lg, flexGrow: 1 }}
          ListEmptyComponent={<Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl }]}>No other chats available to forward to.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => forwardTo(item)} disabled={Boolean(sendingId)} accessibilityRole="button" accessibilityLabel={`Forward message to ${item.participant?.name || item.name || 'group chat'}`} accessibilityState={{ disabled: Boolean(sendingId), busy: sendingId === item.id }} activeOpacity={0.8}>
              <GlassCard style={{ marginBottom: spacing.sm }} contentStyle={{ flexDirection: 'row', alignItems: 'center' }}>
                <Avatar name={item.participant?.name || item.name || 'Group'} color={item.participant?.avatarColor || colors.primary} imageUrl={item.participant?.avatarUrl} />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
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
