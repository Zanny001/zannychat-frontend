import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, SUPABASE_ENABLED } from './supabaseClient';
import { createPinnedMessage, upsertPinnedMessage, removePinnedMessage } from '../utils/pinnedMessages';

const keyFor = (userId) => `zannychat.pinnedMessages.v1.${encodeURIComponent(String(userId || 'guest'))}`;
const validItems = (items) => Array.isArray(items) ? items.filter((item) => item && item.id && item.messageId && item.conversationId) : [];

async function loadLocal(userId) {
  try { const raw = await AsyncStorage.getItem(keyFor(userId)); return validItems(raw ? JSON.parse(raw) : []); }
  catch (_) { return []; }
}
async function saveLocal(userId, items) { await AsyncStorage.setItem(keyFor(userId), JSON.stringify(validItems(items).slice(0, 300))); }

function fromRemote(row) {
  const conversationId = String(row.conversation_id);
  const messageId = String(row.message_id);
  return {
    id: `${conversationId}:${messageId}`, messageId, conversationId,
    conversation: { id: conversationId, isGroup: Boolean(row.is_group), name: row.conversation_name || 'Conversation', participant: null },
    conversationName: row.conversation_name || 'Conversation', text: row.message_text || '',
    senderName: row.sender_name || '', createdAt: row.message_created_at || '',
    attachment: row.attachment_type ? { type: row.attachment_type, name: row.attachment_name || '' } : null,
    pinnedAt: row.pinned_at || new Date().toISOString(), pinnedBy: row.pinned_by,
  };
}

export async function loadPinnedMessages(userId) {
  const local = await loadLocal(userId);
  if (!SUPABASE_ENABLED || !supabase || !userId || userId === 'me') return local;
  const { data, error } = await supabase.from('pinned_messages').select('*').order('pinned_at', { ascending: false }).limit(300);
  if (error) return local;
  const remote = (data || []).map(fromRemote);
  const merged = [...remote, ...local.filter((item) => !remote.some((r) => r.id === item.id))].slice(0, 300);
  await saveLocal(userId, merged).catch(() => {});
  return merged;
}

export async function pinMessageLocally(userId, message, conversation) {
  if (!userId || userId === 'me') throw new Error('Sign in to pin messages.');
  const item = createPinnedMessage(message, conversation);
  if (SUPABASE_ENABLED && supabase) {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user?.id === userId) {
      const row = {
        conversation_id: item.conversationId, message_id: item.messageId, pinned_by: userId,
        message_text: item.text, sender_name: item.senderName, message_created_at: item.createdAt || null,
        conversation_name: item.conversationName, is_group: Boolean(item.conversation?.isGroup),
        attachment_type: item.attachment?.type || null, attachment_name: item.attachment?.name || null,
      };
      const { error } = await supabase.from('pinned_messages').insert(row);
      if (error && error.code !== '23505') throw new Error(error.message || 'Could not sync this pin.');
      item.pinnedBy = userId;
    }
  }
  const next = upsertPinnedMessage(await loadLocal(userId), item);
  await saveLocal(userId, next);
  return next;
}

export async function unpinMessageLocally(userId, pinId) {
  const item = (await loadLocal(userId)).find((entry) => entry.id === pinId);
  if (SUPABASE_ENABLED && supabase && item) {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user?.id === userId) {
      const { error } = await supabase.from('pinned_messages').delete().eq('conversation_id', item.conversationId).eq('message_id', item.messageId);
      if (error) throw new Error(error.message || 'Could not remove the shared pin.');
    }
  }
  const next = removePinnedMessage(await loadLocal(userId), pinId);
  await saveLocal(userId, next);
  return next;
}

export async function clearPinnedMessagesForUser(userId) {
  if (!userId) return false;
  try { await AsyncStorage.removeItem(keyFor(userId)); return true; }
  catch (_) { return false; }
}
