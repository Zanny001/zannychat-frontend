import { supabase, SUPABASE_ENABLED } from './supabaseClient';
import { buildPersonalDataExport } from '../utils/dataExport';
import { loadMediaPreferences } from './mediaPreferences';

const PAGE_SIZE = 500;

async function fetchAllMessages(conversationIds) {
  const messages = [];
  for (let start = 0; start < conversationIds.length; start += 50) {
    const batch = conversationIds.slice(start, start + 50);
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', batch)
        .order('created_at', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      const page = data || [];
      messages.push(...page);
      if (page.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
  }
  return messages;
}

export async function createPersonalDataExport() {
  if (!SUPABASE_ENABLED || !supabase) {
    throw new Error('A connected, signed-in ZannyChat account is required to export server data. Demo data is not exported.');
  }
  const { data: authResult, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const account = authResult?.user;
  if (!account?.id) throw new Error('Please sign in again before exporting your data.');

  const [profileResult, membershipResult, readCursorResult, preferences] = await Promise.all([
    supabase.rpc('get_my_profile'),
    supabase.from('conversation_participants')
      .select('conversation_id, joined_at, is_favorite, is_muted, is_archived')
      .eq('user_id', account.id),
    supabase.rpc('get_my_read_cursors'),
    loadMediaPreferences(),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (membershipResult.error) throw membershipResult.error;
  if (readCursorResult.error) throw readCursorResult.error;
  const readCursorByConversation = new Map((readCursorResult.data || []).map((row) => [row.conversation_id, row.last_read_at]));
  const memberships = (membershipResult.data || []).map((row) => ({ ...row, last_read_at: readCursorByConversation.get(row.conversation_id) || null }));
  const conversationIds = memberships.map((row) => row.conversation_id).filter(Boolean);

  let conversations = [];
  let messages = [];
  for (let start = 0; start < conversationIds.length; start += 100) {
    const ids = conversationIds.slice(start, start + 100);
    const { data, error } = await supabase.from('conversations').select('*').in('id', ids);
    if (error) throw error;
    conversations.push(...(data || []));
  }
  if (conversationIds.length) messages = await fetchAllMessages(conversationIds);

  return buildPersonalDataExport({
    account,
    profile: Array.isArray(profileResult.data) ? profileResult.data[0] || null : profileResult.data,
    memberships,
    conversations,
    messages,
    preferences,
  });
}
