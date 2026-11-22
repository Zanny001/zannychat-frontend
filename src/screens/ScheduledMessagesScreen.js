import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const { colors, spacing, radii, typography, layout } = useTheme();
  const [text, setText] = useState('');
  const [scheduledFor, setScheduledFor] = useState(() => localDateTimeInput(new Date(Date.now() + 60 * 60 * 1000)));
  const [items, setItems] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [messageSearch, setMessageSearch] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [scheduled, conversationResult] = await Promise.all([
        fetchScheduledMessages(),
        initialConversationId ? Promise.resolve({ conversations: [] }) : fetchConversations({ limit: 100, offset: 0 }).catch(() => ({ conversations: [] })),
      ]);
      setItems(scheduled);
      setConversations(conversationResult.conversations || []);
    } catch (e) {
      setError(e?.message || 'Could not load scheduled messages. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [initialConversationId]);

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
  const visibleItems = useMemo(() => {
    const query = messageSearch.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => [item.text, conversationName(item.conversation_id)].filter(Boolean).join(' ').toLowerCase().includes(query));
  }, [items, messageSearch, conversations, conversationId]);

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <Header eyebrow="PLAN AHEAD" title="Scheduled messages" subtitle="A thoughtful message, at the right moment" onBack={() => navigation.goBack()} />
      <FlatList
        style={{ flex: 1 }}
        data={visibleItems}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl || spacing.xl, flexGrow: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}
        ListHeaderComponent={
          <View>
            <GlassCard style={{ marginBottom: spacing.md }} contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.primary}18`, borderWidth: 1, borderColor: `${colors.primary}35` }}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Compose for later</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>Choose the conversation and the moment.</Text>
            </View>
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {conversationId ? `To: ${conversationName(conversationId)}` : 'Choose a conversation, then write the message and select when it should be sent.'}
          </Text>
          {canChooseConversation && conversations.length > 0 ? (
            <View style={{ gap: spacing.xs }}>
              <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '800' }]}>SEND TO</Text>
              {conversations.slice(0, 100).map((row) => {
                const active = row.id === conversationId;
                return <TouchableOpacity key={row.id} onPress={() => setSelectedConversationId(row.id)} accessibilityRole="radio" accessibilityState={{ checked: active }} accessibilityLabel={`Schedule for ${conversationName(row.id)}`} style={{ padding: spacing.sm, borderRadius: radii.md, borderWidth: 1, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? `${colors.primary}14` : 'transparent', flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={18} color={active ? colors.primary : colors.textSecondary} />
                  <Text numberOfLines={1} style={[typography.body, { color: colors.textPrimary, flex: 1, minWidth: 0 }]}>{conversationName(row.id)}</Text>
                </TouchableOpacity>;
              })}
            </View>
          ) : null}
          <View style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '800' }]}>YOUR MESSAGE</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, fontVariant: ['tabular-nums'] }]}>{text.length}/4,000</Text>
            </View>
            <TextInput
              value={text} onChangeText={setText} maxLength={4000} multiline
              placeholder="Write something worth remembering…" placeholderTextColor={colors.textSecondary}
              accessibilityLabel="Scheduled message text"
              style={[fieldStyle, { minHeight: 116, textAlignVertical: 'top', lineHeight: 23, backgroundColor: colors.surface }]}
            />
          </View>
          <View style={{ gap: spacing.xs }}>
            <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '800' }]}>SEND AT · YOUR LOCAL TIME</Text>
            <TextInput
              value={scheduledFor} onChangeText={setScheduledFor}
              placeholder="YYYY-MM-DDTHH:mm" placeholderTextColor={colors.textSecondary}
              accessibilityLabel="Scheduled date and time" autoCapitalize="none" autoCorrect={false}
              style={[fieldStyle, { backgroundColor: colors.surface }]}
            />
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Use your device's local time in YYYY-MM-DDTHH:mm format. Schedule from 1 minute to 30 days ahead. Maximum 4,000 characters.</Text>
          <TouchableOpacity
            onPress={submit} disabled={saving || !conversationId || !text.trim()}
            accessibilityRole="button" accessibilityLabel="Schedule message"
            style={{ minHeight: 48, borderRadius: radii.md, backgroundColor: saving || !conversationId || !text.trim() ? colors.border : colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
          >
            {saving ? <ActivityIndicator color={colors.background} /> : <Ionicons name="calendar-outline" size={18} color={colors.background} />}
            <Text style={[typography.bodyStrong, { color: colors.background }]}>{saving ? 'Scheduling…' : 'Schedule message'}</Text>
          </TouchableOpacity>
        </GlassCard>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Your queue</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>{visibleItems.length} of {items.length} scheduled</Text>
          </View>
          <TouchableOpacity onPress={refresh} accessibilityRole="button" accessibilityLabel="Refresh scheduled messages" style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="refresh-outline" size={19} color={colors.primary} /></TouchableOpacity>
        </View>
        {items.length > 0 ? <View style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.sm, marginBottom: spacing.sm }}>
          <Ionicons name="search-outline" size={17} color={colors.textSecondary} />
          <TextInput value={messageSearch} onChangeText={setMessageSearch} placeholder="Search messages or conversations" placeholderTextColor={colors.textSecondary} accessibilityLabel="Search scheduled messages" returnKeyType="search" style={[typography.body, { flex: 1, minWidth: 0, color: colors.textPrimary, paddingVertical: spacing.sm, paddingLeft: spacing.sm }]} />
          {messageSearch ? <TouchableOpacity onPress={() => setMessageSearch('')} accessibilityRole="button" accessibilityLabel="Clear scheduled message search" style={{ minWidth: 40, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="close-circle" size={18} color={colors.textSecondary} /></TouchableOpacity> : null}
        </View> : null}
            {loading && items.length ? <ActivityIndicator color={colors.primary} style={{ padding: spacing.md }} /> : null}
            {error && items.length ? <GlassCard style={{ marginBottom: spacing.sm }} contentStyle={{ padding: spacing.md, gap: spacing.sm }}><Text accessibilityRole="alert" style={[typography.body, { color: colors.textSecondary }]}>{error}</Text><TouchableOpacity onPress={refresh} accessibilityRole="button" accessibilityLabel="Refresh scheduled messages" style={{ minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' }}><Text style={[typography.bodyStrong, { color: colors.primary }]}>Try again</Text></TouchableOpacity></GlassCard> : null}
          </View>
        }
        renderItem={({ item }) => (
          <GlassCard style={{ marginBottom: spacing.sm }} contentStyle={{ padding: spacing.md, gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: `${colors.primary}18`, borderWidth: 1, borderColor: `${colors.primary}30`, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <Text style={[typography.bodyStrong, { color: colors.textPrimary }]} numberOfLines={1}>{conversationName(item.conversation_id)}</Text>
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>{item.scheduled_for ? new Date(item.scheduled_for).toLocaleString() : 'Time unavailable'}</Text>
              </View>
              <TouchableOpacity onPress={() => cancel(item)} disabled={busyId === item.id} accessibilityRole="button" accessibilityLabel={`Cancel scheduled message to ${conversationName(item.conversation_id)}`} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.surface }}>
                {busyId === item.id ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="close-circle-outline" size={21} color={colors.textSecondary} />}
              </TouchableOpacity>
            </View>
            <View style={{ borderLeftWidth: 2, borderLeftColor: colors.primary, paddingLeft: spacing.md }}>
              <Text selectable style={[typography.body, { color: colors.textPrimary, lineHeight: 23 }]}>{item.text}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
              <Text style={[typography.caption, { color: colors.textSecondary }]}>SCHEDULED · CANCEL ANYTIME BEFORE DELIVERY</Text>
            </View>
          </GlassCard>
        )}
        ListEmptyComponent={
          loading ? <ActivityIndicator color={colors.primary} style={{ padding: spacing.xl }} />
            : error ? <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}><Text accessibilityRole="alert" style={[typography.body, { color: colors.textSecondary }]}>{error}</Text><TouchableOpacity onPress={refresh} accessibilityRole="button" accessibilityLabel="Refresh scheduled messages"><Text style={[typography.bodyStrong, { color: colors.primary }]}>Try again</Text></TouchableOpacity></GlassCard>
            : messageSearch.trim() ? <View style={{ alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm }}><Ionicons name="search-outline" size={30} color={colors.textSecondary} /><Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>No matching messages</Text><Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>Try another search or clear your query.</Text><TouchableOpacity onPress={() => setMessageSearch('')} accessibilityRole="button" accessibilityLabel="Clear scheduled message search" style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md }}><Text style={[typography.bodyStrong, { color: colors.primary }]}>Clear search</Text></TouchableOpacity></View>
            : <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}><Ionicons name="calendar-clear-outline" size={34} color={colors.textSecondary} /><Text style={[typography.bodyStrong, { color: colors.textPrimary, marginTop: spacing.sm }]}>Nothing scheduled yet</Text><Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>Messages you schedule will appear here until they are sent or cancelled.</Text></View>
        }
      />
    </SafeAreaView>
  );
}
