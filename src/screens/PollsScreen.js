import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../theme/ThemeContext';
import { castPollVote, createConversationPoll, listConversationPolls } from '../services/polls';

export default function PollsScreen({ navigation, route }) {
  const conversation = route.params?.conversation;
  const conversationId = conversation?.id || route.params?.conversationId;
  const { colors, spacing, radii, typography } = useTheme();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    if (!conversationId) { setError('Open polls from a conversation.'); setLoading(false); return; }
    setLoading(true); setError('');
    try { setPolls(await listConversationPolls(conversationId)); }
    catch (e) { setError(e?.message || 'Could not load polls. Apply database migration 0017 and try again.'); }
    finally { setLoading(false); }
  }, [conversationId]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  const publish = async () => {
    setSaving(true);
    try { await createConversationPoll(conversationId, question, options); setQuestion(''); setOptions(['', '', '', '']); await refresh(); Alert.alert('Poll created', 'Conversation members can now vote.'); }
    catch (e) { Alert.alert('Could not create poll', e?.message || 'Please try again.'); }
    finally { setSaving(false); }
  };
  const vote = async (poll, option) => {
    try { await castPollVote(poll.id, option.id); await refresh(); }
    catch (e) { Alert.alert('Could not vote', e?.message || 'This poll may be closed.'); }
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <Header title="Polls" subtitle="Ask your conversation and vote" onBack={() => navigation.goBack()} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl || spacing.xl }}>
      <GlassCard style={{ marginBottom: spacing.md }} contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
        <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Create a poll</Text>
        <TextInput value={question} onChangeText={setQuestion} maxLength={240} placeholder="Ask a question" placeholderTextColor={colors.textSecondary} accessibilityLabel="Poll question" style={[typography.body, { color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md }]} />
        {options.map((value, index) => <TextInput key={index} value={value} onChangeText={(v) => setOptions((old) => old.map((item, i) => i === index ? v : item))} maxLength={120} placeholder={`Option ${index + 1}${index < 2 ? ' (required)' : ' (optional)'}`} placeholderTextColor={colors.textSecondary} accessibilityLabel={`Poll option ${index + 1}`} style={[typography.body, { color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md }]} />)}
        <TouchableOpacity onPress={publish} disabled={saving || !question.trim()} accessibilityRole="button" style={{ minHeight: 46, borderRadius: radii.md, backgroundColor: saving || !question.trim() ? colors.border : colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
          {saving ? <ActivityIndicator color={colors.background} /> : <Ionicons name="bar-chart-outline" size={17} color={colors.background} />}
          <Text style={[typography.bodyStrong, { color: colors.background }]}>{saving ? 'Creating…' : 'Create poll'}</Text>
        </TouchableOpacity>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>Single-choice voting; 2–10 options. Poll creation requires database migration 0017.</Text>
      </GlassCard>
      <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginBottom: spacing.sm }]}>Conversation polls</Text>
      {loading ? <ActivityIndicator color={colors.primary} style={{ padding: spacing.xl }} /> : error ? <View style={{ padding: spacing.md }}><Text style={[typography.body, { color: colors.textSecondary }]}>{error}</Text><TouchableOpacity onPress={refresh} style={{ paddingVertical: spacing.md }}><Text style={[typography.bodyStrong, { color: colors.primary }]}>Try again</Text></TouchableOpacity></View> : polls.map((poll) => {
        const total = (poll.poll_votes || []).length;
        const closed = poll.closes_at && new Date(poll.closes_at).getTime() <= Date.now();
        return <GlassCard key={poll.id} style={{ marginBottom: spacing.sm }} contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
          <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{poll.question}</Text>
          {(poll.poll_options || []).map((option) => { const count = (poll.poll_votes || []).filter((v) => v.option_id === option.id).length; return <TouchableOpacity key={option.id} disabled={Boolean(closed)} onPress={() => vote(poll, option)} accessibilityRole="button" style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={[typography.body, { color: colors.textPrimary, flex: 1 }]}>{option.label}</Text><Text style={[typography.caption, { color: colors.textSecondary }]}>{count}</Text></TouchableOpacity>; })}
          <Text style={[typography.caption, { color: colors.textSecondary }]}>{total} vote{total === 1 ? '' : 's'}{closed ? ' · Closed' : ' · Tap an option to vote or change your vote'}</Text>
        </GlassCard>;
      })}
      {!loading && !error && polls.length === 0 ? <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.lg }]}>No polls in this conversation yet.</Text> : null}
    </ScrollView>
  </SafeAreaView>;
}
