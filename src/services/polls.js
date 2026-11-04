import { normalizePoll } from '../utils/pollRules';
import { attachPollVoteCounts } from '../utils/pollVoteCounts';
import { slicePollPage, validatePollCursor, validatePollPageArgs } from '../utils/pollPagination';
import { supabase, SUPABASE_ENABLED } from './supabaseClient';

function requireConnection() {
  if (!SUPABASE_ENABLED || !supabase) throw new Error('Polls require a configured account connection.');
}
export async function listConversationPollPage(conversationId, { offset = 0, limit = 40, cursor = null } = {}) {
  requireConnection();
  if (typeof conversationId !== 'string' || !conversationId.trim()) throw new Error('A valid conversation is required.');
  ({ offset, limit } = validatePollPageArgs(offset, limit));
  const safeCursor = validatePollCursor(cursor);
  let query = supabase.from('polls')
    .select('id,conversation_id,creator_id,question,closes_at,created_at,allow_multiple,poll_options(id,label,position)')
    .eq('conversation_id', conversationId);
  if (safeCursor) {
    // Keyset pagination remains stable when new polls are created while the user browses older history.
    query = query.or(`created_at.lt.${safeCursor.created_at},and(created_at.eq.${safeCursor.created_at},id.lt.${safeCursor.id})`);
  }
  const { data, error } = await query.order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(safeCursor ? 0 : offset, (safeCursor ? 0 : offset) + limit);
  if (error) throw error;
  const { polls, hasMore, nextOffset, nextCursor } = slicePollPage(data, offset, limit);
  if (!polls.length) return { polls, hasMore, nextOffset, nextCursor };
  const { data: counts, error: countError } = await supabase.rpc('get_poll_vote_counts_for_ids', {
    p_conversation_id: conversationId,
    p_poll_ids: polls.map((poll) => poll.id),
  });
  if (countError) throw countError;
  return { polls: attachPollVoteCounts(polls, counts), hasMore, nextOffset, nextCursor };
}

// Backwards-compatible convenience API; callers needing long histories should use pages.
export async function listConversationPolls(conversationId) {
  const page = await listConversationPollPage(conversationId, { limit: 100 });
  return page.polls;
}
export async function createConversationPoll(conversationId, question, options, closesAt = null, allowMultiple = false) {
  requireConnection();
  const normalized = normalizePoll(question, options);
  const { data, error } = await supabase.rpc('create_conversation_poll', { p_conversation_id: conversationId, p_question: normalized.question, p_options: normalized.options, p_closes_at: closesAt, p_allow_multiple: Boolean(allowMultiple) });
  if (error) throw error;
  return data;
}
export async function castPollVote(pollId, optionIds) {
  requireConnection();
  const ids = [...new Set((Array.isArray(optionIds) ? optionIds : [optionIds]).filter((id) => typeof id === 'string' && id.trim()))];
  if (!pollId || ids.length < 1 || ids.length > 10) throw new Error('Choose between 1 and 10 poll options.');
  const { error } = await supabase.rpc('cast_poll_vote', { p_poll_id: pollId, p_option_ids: ids });
  if (error) throw error;
}
