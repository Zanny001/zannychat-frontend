import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../theme/ThemeContext';
import { cancelScheduledMessage, fetchConversations, fetchScheduledMessages, scheduleMessage } from '../services/api';
import { localDateTimeInput, normalizeScheduledDate, validateScheduledMessageText } from '../utils/scheduledMessageRules';

export default function ScheduledMessagesScreen({ navigation, route }) {
  const conversation = route.params?.conversation;
  const initialConversationId = conversation?.id || route.params?.conversationId || null;
  const [selectedConversationId, setSelectedConversationId] = useState(initialConversationId);
  const conversationId = selectedConversationId;
  const { colors, spacing, radii, typography } = useTheme();
  const [text, setText] = useState('');
  const [scheduledFor, setScheduledFor] = useState(() => localDateTimeInput(new Date(Date.now() + 60 * 60 * 1000)));
  const [items, setItems] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [scheduled, conversationResult] = await Promise.all([
        fetchScheduledMessages(),
        fetchConversations({ limit: 1000, offset: 0 }).catch(() => ({ conversations: [] })),
      ]);
      setItems(scheduled);
      setConversations(conversationResult.conversations || []);
    } catch (e) {
      setError(e?.message || 'Could not load scheduled messages. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const submit = async () => {
    if (!conversationId) {
      Alert.alert('Open a conversation first', 'To schedule a message, open the intended conversation and choose Schedule message from its options.');
      return;
    }
    if (!text.trim()) {
      Alert.alert('Message required', 'Write the message you want to send later.');
      return;
    }
    setSaving(true);
    try {
      const iso = normalizeScheduledDate(scheduledFor);
      await scheduleMessage(conversationId, validateScheduledMessageText(text), iso);
      setText('');
      await refresh();
      Alert.alert('Message scheduled', 'It will be sent at the selected time when the scheduled-message worker is configured and running.');
    } catch (e) {
      Alert.alert('Could not schedule message', e?.message || 'Please check the date and try again.');
    } finally {
      setSaving(false);
    }
  };

  const cancel = (item) => {
    Alert.alert('Cancel scheduled message?', 'This message will not be sent.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel message', style: 'destructive', onPress: async () => {
        setBusyId(item.id);
        try { await cancelScheduledMessage(item.id); setItems((current) => current.filter((row) => row.id !== item.id)); }
        catch (e) { Alert.alert('Could not cancel', e?.message || 'Refresh and try again.'); }
        finally { setBusyId(null); }
      } },
    ]);
  };

  const fieldStyle = [typography.body, { color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md }];
  const conversationName = (id) => {
    const found = conversations.find((row) => row.id === id);
    return found?.participant?.name || found?.name || (id === conversationId ? conversation?.participant?.name || conversation?.name : null) || 'Conversation';
  };
  const canChooseConversation = !initialConversationId;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Scheduled messages" subtitle="Plan a message for later" onBack={() => navigation.goBack()} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl || spacing.xl }}>
        <GlassCard style={{ marginBottom: spacing.md }} contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Ionicons name="time-outline" size={22} color={colors.primary} />
            <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>New scheduled message</Text>
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {conversationId ? `To: ${conversationName(conversationId)}` : 'Choose a conversation, then write the message and select when it should be sent.'}
          </Text>
          {canChooseConversation && conversations.length > 0 ? (
            <View style={{ gap: spacing.xs }}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Conversation</Text>
              {conversations.slice(0, 100).map((row) => {
                const active = row.id === conversationId;
                return <TouchableOpacity key={row.id} onPress={() => setSelectedConversationId(row.id)} accessibilityRole="radio" accessibilityState={{ checked: active }} accessibilityLabel={`Schedule for ${conversationName(row.id)}`} style={{ padding: spacing.sm, borderRadius: radii.md, borderWidth: 1, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? `${colors.primary}14` : 'transparent', flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={18} color={active ? colors.primary : colors.textSecondary} />
                  <Text numberOfLines={1} style={[typography.body, { color: colors.textPrimary, flex: 1, minWidth: 0 }]}>{conversationName(row.id)}</Text>
                </TouchableOpacity>;
              })}
            </View>
          ) : null}
          <TextInput
            value={text} onChangeText={setText} maxLength={4000} multiline
            placeholder="Write your message…" placeholderTextColor={colors.textSecondary}
            accessibilityLabel="Scheduled message text"
            style={[fieldStyle, { minHeight: 100, textAlignVertical: 'top' }]}
          />
          <TextInput
            value={scheduledFor} onChangeText={setScheduledFor}
            placeholder="YYYY-MM-DDTHH:mm (local time)" placeholderTextColor={colors.textSecondary}
            accessibilityLabel="Scheduled date and time" autoCapitalize="none" autoCorrect={false}
            style={fieldStyle}
          />
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Use your device's local time in YYYY-MM-DDTHH:mm format. Schedule from 1 minute to 30 days ahead. Maximum 4,000 characters.</Text>
          <TouchableOpacity
            onPress={submit} disabled={saving || !conversationId || !text.trim()}
            accessibilityRole="button" accessibilityLabel="Schedule message"
            style={{ minHeight: 46, borderRadius: radii.md, backgroundColor: saving || !conversationId || !text.trim() ? colors.border : colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
          >
            {saving ? <ActivityIndicator color={colors.background} /> : <Ionicons name="calendar-outline" size={18} color={colors.background} />}
            <Text style={[typography.bodyStrong, { color: colors.background }]}>{saving ? 'Scheduling…' : 'Schedule message'}</Text>
          </TouchableOpacity>
        </GlassCard>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Pending messages</Text>
          <TouchableOpacity onPress={refresh} accessibilityRole="button" accessibilityLabel="Refresh scheduled messages" style={{ padding: spacing.xs }}><Ionicons name="refresh-outline" size={19} color={colors.primary} /></TouchableOpacity>
        </View>
        {loading ? <ActivityIndicator color={colors.primary} style={{ padding: spacing.xl }} /> : error ? (
          <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
            <Text accessibilityRole="alert" style={[typography.body, { color: colors.textSecondary }]}>{error}</Text>
            <TouchableOpacity onPress={refresh} accessibilityRole="button" accessibilityLabel="Refresh scheduled messages"><Text style={[typography.bodyStrong, { color: colors.primary }]}>Try again</Text></TouchableOpacity>
          </GlassCard>
        ) : items.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
            <Ionicons name="calendar-clear-outline" size={34} color={colors.textSecondary} />
            <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginTop: spacing.sm }]}>Nothing scheduled yet</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>Messages you schedule will appear here until they are sent or cancelled.</Text>
          </View>
        ) : items.map((item) => (
          <GlassCard key={item.id} style={{ marginBottom: spacing.sm }} contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
              <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: `${colors.primary}20`, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="time-outline" size={19} color={colors.primary} /></View>
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{conversationName(item.conversation_id)}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>{item.scheduled_for ? new Date(item.scheduled_for).toLocaleString() : 'Time unavailable'}</Text>
              </View>
              <TouchableOpacity onPress={() => cancel(item)} disabled={busyId === item.id} accessibilityRole="button" accessibilityLabel={`Cancel scheduled message to ${conversationName(item.conversation_id)}`} style={{ padding: spacing.xs }}>
                {busyId === item.id ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="close-circle-outline" size={22} color={colors.textSecondary} />}
              </TouchableOpacity>
            </View>
            <Text selectable style={[typography.body, { color: colors.textPrimary }]}>{item.text}</Text>
          </GlassCard>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
