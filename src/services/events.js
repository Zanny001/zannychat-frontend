import { normalizeEvent } from '../utils/eventRules';
import { supabase, SUPABASE_ENABLED } from './supabaseClient';
function requireConnection() { if (!SUPABASE_ENABLED || !supabase) throw new Error('Events require a configured account connection.'); }
export async function listConversationEvents(conversationId) {
  requireConnection();
  const { data, error } = await supabase.from('conversation_events').select('id,conversation_id,creator_id,title,description,starts_at,location,created_at,conversation_event_rsvps(user_id,response,updated_at)').eq('conversation_id', conversationId).order('starts_at', { ascending: true });
  if (error) throw error;
  return data || [];
}
export async function createConversationEvent(conversationId, fields) {
  requireConnection();
  const event = normalizeEvent(fields);
  const { data, error } = await supabase.rpc('create_conversation_event', { p_conversation_id: conversationId, p_title: event.title, p_starts_at: event.startsAt, p_description: event.description, p_location: event.location });
  if (error) throw error;
  return data;
}
export async function respondToConversationEvent(eventId, response) {
  requireConnection();
  if (!['going', 'maybe', 'not_going'].includes(response)) throw new Error('Invalid RSVP response.');
  const { error } = await supabase.rpc('respond_to_conversation_event', { p_event_id: eventId, p_response: response });
  if (error) throw error;
}

export async function getCurrentEventUserId() { requireConnection(); const { data, error } = await supabase.auth.getUser(); if (error) throw error; return data?.user?.id || null; }
