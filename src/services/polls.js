import { normalizePoll } from '../utils/pollRules';
import { supabase, SUPABASE_ENABLED } from './supabaseClient';

function requireConnection() {
  if (!SUPABASE_ENABLED || !supabase) throw new Error('Polls require a configured account connection.');
}
export async function listConversationPolls(conversationId) {
  requireConnection();
  const { data, error } = await supabase.from('polls').select('id,conversation_id,creator_id,question,closes_at,created_at,poll_options(id,label,position),poll_votes(option_id,user_id)').eq('conversation_id', conversationId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((poll) => ({ ...poll, poll_options: [...(poll.poll_options || [])].sort((a, b) => a.position - b.position) }));
}
export async function createConversationPoll(conversationId, question, options, closesAt = null) {
  requireConnection();
  const normalized = normalizePoll(question, options);
  const { data, error } = await supabase.rpc('create_conversation_poll', { p_conversation_id: conversationId, p_question: normalized.question, p_options: normalized.options, p_closes_at: closesAt });
  if (error) throw error;
  return data;
}
export async function castPollVote(pollId, optionId) {
  requireConnection();
  const { error } = await supabase.rpc('cast_poll_vote', { p_poll_id: pollId, p_option_id: optionId });
  if (error) throw error;
}
