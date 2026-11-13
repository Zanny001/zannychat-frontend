import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../theme/ThemeContext';
import { castPollVote, createConversationPoll, listConversationPollPage } from '../services/polls';
import { formatPollVoteSummary } from '../utils/pollResults';

export default function PollsScreen({ navigation, route }) {
  const conversation = route.params?.conversation;
  const conversationId = conversation?.id || route.params?.conversationId;
  const { colors, spacing, radii, typography } = useTheme();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [selectedPollOptions, setSelectedPollOptions] = useState({});
  const [votingPollId, setVotingPollId] = useState(null);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const refresh = useCallback(async () => {
    if (!conversationId) { setError('Open polls from a conversation.'); setLoading(false); return; }
    setLoading(true); setError('');
    try { const page = await listConversationPollPage(conversationId); setPolls(page.polls); setSelectedPollOptions(Object.fromEntries(page.polls.map((poll) => [poll.id, (poll.poll_options || []).filter((option) => option.selected_by_me).map((option) => option.id)]))); setHasMore(page.hasMore); setNextCursor(page.nextCursor); }
    catch (e) { setError(e?.message || 'Could not load polls. Ensure database migrations 0017 and 0051–0053 are applied, then try again.'); }
    finally { setLoading(false); }
  }, [conversationId]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  const loadMore = async () => {
    if (!conversationId || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try { const page = await listConversationPollPage(conversationId, { cursor: nextCursor }); setPolls((current) => { const seen = new Set(current.map((poll) => poll.id)); return [...current, ...page.polls.filter((poll) => !seen.has(poll.id))]; }); setSelectedPollOptions((current) => ({ ...current, ...Object.fromEntries(page.polls.map((poll) => [poll.id, (poll.poll_options || []).filter((option) => option.selected_by_me).map((option) => option.id)])) })); setHasMore(page.hasMore); setNextCursor(page.nextCursor); }
    catch (e) { Alert.alert('Could not load older polls', e?.message || 'Please try again.'); }
    finally { setLoadingMore(false); }
  };
  const publish = async () => {
    setSaving(true);
    try { await createConversationPoll(conversationId, question, options, null, allowMultiple); setQuestion(''); setOptions(['', '', '', '']); setAllowMultiple(false); await refresh(); Alert.alert('Poll created', allowMultiple ? 'Conversation members can select multiple options.' : 'Conversation members can now vote.'); }
    catch (e) { Alert.alert('Could not create poll', e?.message || 'Please try again.'); }
    finally { setSaving(false); }
  };
  const vote = async (poll, option) => {
    if (poll.allow_multiple) {
      setSelectedPollOptions((current) => {
        const selected = current[poll.id] || [];
        const next = selected.includes(option.id) ? selected.filter((id) => id !== option.id) : [...selected, option.id];
        if (next.length > 10) { Alert.alert('Selection limit', 'You can select up to 10 options.'); return current; }
        return { ...current, [poll.id]: next };
      });
      return;
    }
    setVotingPollId(poll.id);
    try { await castPollVote(poll.id, [option.id]); await refresh(); }
    catch (e) { Alert.alert('Could not vote', e?.message || 'This poll may be closed.'); }
    finally { setVotingPollId(null); }
  };
  const submitMultiVote = async (poll) => {
    const selected = selectedPollOptions[poll.id] || [];
    if (!selected.length || votingPollId) return;
    setVotingPollId(poll.id);
    try { await castPollVote(poll.id, selected); await refresh(); Alert.alert('Vote saved', 'Your selected options have been recorded.'); }
    catch (e) { Alert.alert('Could not vote', e?.message || 'This poll may be closed.'); }
    finally { setVotingPollId(null); }
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <Header title="Polls" subtitle="Ask your conversation and vote" onBack={() => navigation.goBack()} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl || spacing.xl }}>
      <GlassCard style={{ marginBottom: spacing.md }} contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
        <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Create a poll</Text>
        <TextInput value={question} onChangeText={setQuestion} maxLength={240} placeholder="Ask a question" placeholderTextColor={colors.textSecondary} accessibilityLabel="Poll question" style={[typography.body, { color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md }]} />
        {options.map((value, index) => <TextInput key={index} value={value} onChangeText={(v) => setOptions((old) => old.map((item, i) => i === index ? v : item))} maxLength={120} placeholder={`Option ${index + 1}${index < 2 ? ' (required)' : ' (optional)'}`} placeholderTextColor={colors.textSecondary} accessibilityLabel={`Poll option ${index + 1}`} style={[typography.body, { color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md }]} />)}
        <TouchableOpacity onPress={() => setAllowMultiple((value) => !value)} accessibilityRole="checkbox" accessibilityState={{ checked: allowMultiple }} style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}><Ionicons name={allowMultiple ? 'checkbox' : 'square-outline'} size={20} color={allowMultiple ? colors.primary : colors.textSecondary} /><Text style={[typography.body, { color: colors.textPrimary }]}>Allow multiple answers</Text></TouchableOpacity>
        <TouchableOpacity onPress={publish} disabled={saving || !question.trim()} accessibilityRole="button" style={{ minHeight: 46, borderRadius: radii.md, backgroundColor: saving || !question.trim() ? colors.border : colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
          {saving ? <ActivityIndicator color={colors.onPrimary} /> : <Ionicons name="bar-chart-outline" size={17} color={colors.onPrimary} />}
          <Text style={[typography.bodyStrong, { color: colors.onPrimary }]}>{saving ? 'Creating…' : 'Create poll'}</Text>
        </TouchableOpacity>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>Choose single-choice or multi-select voting; 2–10 options. Percentages show the share of voters who selected each option. Requires migrations 0017, 0051, 0052 and 0053.</Text>
      </GlassCard>
      <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginBottom: spacing.sm }]}>Conversation polls</Text>
      {loading ? <ActivityIndicator color={colors.primary} style={{ padding: spacing.xl }} /> : error ? <View style={{ padding: spacing.md }}><Text style={[typography.body, { color: colors.textSecondary }]}>{error}</Text><TouchableOpacity onPress={refresh} style={{ paddingVertical: spacing.md }}><Text style={[typography.bodyStrong, { color: colors.primary }]}>Try again</Text></TouchableOpacity></View> : polls.map((poll) => {
        const total = poll.total_votes || 0;
        const closed = poll.closes_at && new Date(poll.closes_at).getTime() <= Date.now();
        return <GlassCard key={poll.id} style={{ marginBottom: spacing.sm }} contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
          <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{poll.question}</Text>
          {(poll.poll_options || []).map((option) => { const summary = formatPollVoteSummary(option.vote_count, total); const selected = (selectedPollOptions[poll.id] || []).includes(option.id); return <TouchableOpacity key={option.id} disabled={Boolean(closed) || votingPollId === poll.id} onPress={() => vote(poll, option)} accessibilityRole="checkbox" accessibilityState={{ checked: poll.allow_multiple ? selected : Boolean(option.selected_by_me) }} accessibilityLabel={`${option.label}, ${summary.votes} votes, ${summary.label}`} style={{ borderWidth: 1, borderColor: selected || option.selected_by_me ? colors.primary : colors.border, borderRadius: radii.md, padding: spacing.sm, gap: 7, opacity: closed ? 0.92 : 1 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm }}><View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}><Ionicons name={(poll.allow_multiple ? selected : option.selected_by_me) ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={(poll.allow_multiple ? selected : option.selected_by_me) ? colors.primary : colors.textSecondary} /><Text style={[typography.body, { color: colors.textPrimary, flex: 1 }]}>{option.label}</Text></View><Text style={[typography.caption, { color: colors.textSecondary }]}>{summary.label} · {summary.votes}</Text></View><View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: colors.border }}><View style={{ height: '100%', width: `${summary.percentage}%`, borderRadius: 3, backgroundColor: colors.primary }} /></View></TouchableOpacity>; })}
          {poll.allow_multiple && !closed ? <TouchableOpacity onPress={() => submitMultiVote(poll)} disabled={votingPollId === poll.id || !(selectedPollOptions[poll.id] || []).length} accessibilityRole="button" style={{ minHeight: 42, borderRadius: radii.md, backgroundColor: votingPollId === poll.id || !(selectedPollOptions[poll.id] || []).length ? colors.border : colors.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={[typography.bodyStrong, { color: colors.onPrimary }]}>{votingPollId === poll.id ? 'Saving vote…' : `Submit ${((selectedPollOptions[poll.id] || []).length)} selection${(selectedPollOptions[poll.id] || []).length === 1 ? '' : 's'}`}</Text></TouchableOpacity> : null}
          <Text style={[typography.caption, { color: colors.textSecondary }]}>{total} voter{total === 1 ? '' : 's'}{poll.allow_multiple ? ' · Multiple answers allowed' : ''}{closed ? ' · Closed' : poll.allow_multiple ? ' · Select options, then submit' : ' · Tap an option to vote or change your vote'}</Text>
        </GlassCard>;
      })}
      {!loading && !error && hasMore ? <TouchableOpacity onPress={loadMore} disabled={loadingMore} accessibilityRole="button" style={{ minHeight: 46, marginVertical: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>{loadingMore ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="chevron-down" size={18} color={colors.primary} />}<Text style={[typography.bodyStrong, { color: colors.primary }]}>{loadingMore ? 'Loading older polls…' : 'Load older polls'}</Text></TouchableOpacity> : null}
      {!loading && !error && polls.length === 0 ? <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.lg }]}>No polls in this conversation yet.</Text> : null}
    </ScrollView>
  </SafeAreaView>;
}
