import { supabase, SUPABASE_ENABLED } from './supabaseClient';
import { backendFetch, BACKEND_ENABLED } from './backendClient';
import {
  CURRENT_USER,
  MOCK_CONTACTS,
  MOCK_CONVERSATIONS,
  MOCK_MESSAGES,
} from './mockData';

// ---------------------------------------------------------------------
// This file is the ONLY place that knows whether ZannyChat is talking
// to a real backend or running on local mock data. Screens never
// import supabaseClient, backendClient, or mockData directly — they
// call these functions, so turning on the real backend (Phase 2) means
// filling in env vars, not rewriting screens.
//
// Two backends are involved, each with its own flag:
//   SUPABASE_ENABLED — direct reads/writes for profiles, conversations,
//     and messages (see supabaseClient.js).
//   BACKEND_ENABLED — the Express service on Render, used only for the
//     handful of things a client shouldn't do directly: creating a
//     conversation (a multi-table write) and touching wallet balances
//     (see zannychat-backend's README for why).
//
// Expected Supabase schema (created by the backend project):
//   profiles(id, name, avatar_color, status, online)
//   conversations(id, created_at)
//   conversation_participants(conversation_id, user_id)
//   messages(id, conversation_id, sender_id, text, created_at, reply_to_id)
//   wallets(user_id, currency) / ledger_entries(id, wallet_id, amount, ...)
// ---------------------------------------------------------------------

// Mutable in-memory clone so mock mode "remembers" sent messages for
// the lifetime of the app session.
const mockMessageStore = JSON.parse(JSON.stringify(MOCK_MESSAGES));

export async function getCurrentUser() {
  if (!SUPABASE_ENABLED) return CURRENT_USER;

  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (error) throw error;
  return profile;
}

export async function signInWithEmail(email, password) {
  if (!SUPABASE_ENABLED) return { user: CURRENT_USER };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email, password, name) {
  if (!SUPABASE_ENABLED) return { user: { ...CURRENT_USER, name } };
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!SUPABASE_ENABLED) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function fetchContacts() {
  if (!SUPABASE_ENABLED) return MOCK_CONTACTS;
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) throw error;
  return data;
}

export async function fetchConversations() {
  if (!SUPABASE_ENABLED) return MOCK_CONVERSATIONS;

  const { data, error } = await supabase
    .from('conversations')
    .select(
      `id, created_at,
       conversation_participants(user_id, profiles(*)),
       messages(text, created_at)`
    )
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Starts a conversation with a contact. When the backend is deployed,
// this is a single trusted server call that creates the conversation
// and both participant rows together (see zannychat-backend's
// POST /conversations). Otherwise it falls back to a locally-faked
// conversation, same as before — good enough to demo the Chat screen
// without any backend at all.
export async function createConversation(participantId, participantProfile) {
  if (BACKEND_ENABLED && SUPABASE_ENABLED) {
    const conversation = await backendFetch('/conversations', {
      method: 'POST',
      body: JSON.stringify({ participantId }),
    });
    return {
      ...conversation,
      participant: participantProfile,
      lastMessage: '',
      lastMessageAt: '',
      unreadCount: 0,
    };
  }

  return {
    id: `new-${participantId}`,
    participant: participantProfile,
    lastMessage: '',
    lastMessageAt: '',
    unreadCount: 0,
  };
}

// Returns null when the backend isn't configured — WalletScreen treats
// that as "show the static preview" rather than a real ₦0.00 balance.
export async function fetchWalletBalance() {
  if (!BACKEND_ENABLED || !SUPABASE_ENABLED) return null;
  return backendFetch('/wallet/balance');
}

export async function fetchMessages(conversationId) {
  if (!SUPABASE_ENABLED) return mockMessageStore[conversationId] || [];

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function sendMessage(conversationId, text, replyToId = null) {
  if (!SUPABASE_ENABLED) {
    const message = {
      id: `local-${Date.now()}`,
      senderId: 'me',
      text,
      replyToId,
      createdAt: 'Now',
    };
    mockMessageStore[conversationId] = [...(mockMessageStore[conversationId] || []), message];
    return message;
  }

  const { data: authData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: authData?.user?.id,
      text,
      reply_to_id: replyToId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Subscribes to new messages in a conversation. Returns an unsubscribe
// function. In mock mode this is a no-op (there's nothing to push
// realtime updates), which keeps ChatScreen's cleanup logic identical
// in both modes.
export function subscribeToMessages(conversationId, onInsert) {
  if (!SUPABASE_ENABLED) {
    return () => {};
  }

  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onInsert(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
