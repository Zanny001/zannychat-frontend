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
// to a real backend or running on local mock data — AND the only place
// that knows Supabase's raw rows are snake_case (sender_id, avatar_url)
// while every screen was built against mock data's camelCase shape
// (senderId, avatarUrl). The normalize* functions below are what make
// that invisible to screens. Skipping this was a real bug, not just
// style: without it every message from a real account would render as
// "theirs" (item.senderId is undefined on a raw row) and the chat list
// would crash on the raw join shape Supabase actually returns.
//
// Two backends are involved, each with its own flag:
//   SUPABASE_ENABLED — direct reads/writes for profiles, conversations,
//     and messages (see supabaseClient.js).
//   BACKEND_ENABLED — the Express service on Render, used only for the
//     handful of things a client shouldn't do directly: creating a
//     conversation (a multi-table write) and touching wallet balances
//     (see zannychat-backend's README for why).
//
// Actual Supabase schema (see zannychat-backend/supabase/migrations):
//   profiles(id, name, avatar_color, avatar_url, status, online)
//   conversations(id, created_at)
//   conversation_participants(conversation_id, user_id)
//   messages(id, conversation_id, sender_id, text, created_at, reply_to_id,
//            media_url, media_type, media_name, media_size, shared_user_id)
//   wallets(user_id, currency) / ledger_entries(id, wallet_id, amount, ...)
// ---------------------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Deliberately not Intl.DateTimeFormat / toLocaleTimeString — older
// Hermes builds have had inconsistent Intl support, and this is simple
// enough to just not depend on it at all.
function formatTimestamp(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const suffix = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${suffix}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

function mediaPreviewText(mediaType) {
  if (mediaType === 'image') return '📷 Photo';
  if (mediaType === 'file') return '📄 File';
  if (mediaType === 'contact') return '👤 Contact';
  return '';
}

function normalizeProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    avatarColor: row.avatar_color,
    avatarUrl: row.avatar_url,
    status: row.status,
    online: row.online,
  };
}

function normalizeMessage(row) {
  if (!row) return row;
  return {
    id: row.id,
    senderId: row.sender_id,
    text: row.text,
    createdAt: formatTimestamp(row.created_at),
    replyToId: row.reply_to_id,
    mediaUrl: row.media_url,
    mediaType: row.media_type,
    mediaName: row.media_name,
    mediaSize: row.media_size,
    sharedUserId: row.shared_user_id,
  };
}

// row is one item from the nested conversations/participants/messages
// select in fetchConversations — see the query there for the exact
// shape this expects.
function normalizeConversation(row, currentUserId) {
  const participants = row.conversation_participants || [];
  const other = participants.find((p) => p.user_id !== currentUserId) || participants[0];
  const profile = normalizeProfile(other?.profiles) || {};

  const messages = [...(row.messages || [])].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );
  const last = messages[messages.length - 1];
  const sortKey = last?.created_at || row.created_at;

  return {
    id: row.id,
    participant: {
      id: other?.user_id,
      name: profile.name || 'Unknown',
      avatarColor: profile.avatarColor || '#6C5CE7',
      avatarUrl: profile.avatarUrl,
      online: profile.online || false,
    },
    lastMessage: last ? last.text || mediaPreviewText(last.media_type) : '',
    lastMessageAt: formatTimestamp(sortKey),
    // No read-state tracked yet (no "read_at" column) — always 0 rather
    // than a fabricated number. A real unread count is a real feature,
    // not something to fake.
    unreadCount: 0,
    _sortKey: sortKey,
  };
}

// Mutable in-memory clones so mock mode "remembers" changes for the
// lifetime of the app session — sent messages, and now profile edits
// from EditProfileScreen.
const mockMessageStore = JSON.parse(JSON.stringify(MOCK_MESSAGES));
const mockUser = { ...CURRENT_USER };

export async function getCurrentUser() {
  if (!SUPABASE_ENABLED) return mockUser;

  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (error) throw error;
  return normalizeProfile(profile);
}

// Edits made in mock mode persist on mockUser for the session but
// don't survive an app restart — same honesty tradeoff as everything
// else that's mock-backed.
export async function updateProfile({ name, status }) {
  if (!SUPABASE_ENABLED) {
    if (name !== undefined) mockUser.name = name;
    if (status !== undefined) mockUser.status = status;
    return mockUser;
  }

  const { data: authData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...(name !== undefined && { name }), ...(status !== undefined && { status }) })
    .eq('id', authData?.user?.id)
    .select()
    .single();

  if (error) throw error;
  return normalizeProfile(data);
}

// Uploads a picked photo to the "avatars" bucket and points the
// profile at it. mimeType comes from whatever picked the file
// (expo-image-picker) — api.js stays free of Expo-specific APIs so
// screens are the only place that import them.
export async function uploadAvatar(localUri, mimeType = 'image/jpeg') {
  if (!SUPABASE_ENABLED) {
    // No real storage in mock mode — just point the mock user at the
    // local file URI directly, which <Image> can render fine on-device.
    mockUser.avatarUrl = localUri;
    return localUri;
  }

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) throw new Error('Not signed in');

  const extension = mimeType.split('/')[1] || 'jpg';
  const path = `${userId}/avatar-${Date.now()}.${extension}`;

  const arrayBuffer = await (await fetch(localUri)).arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, arrayBuffer, { contentType: mimeType, upsert: true });
  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
  const avatarUrl = publicUrlData.publicUrl;

  const { error: updateError } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId);
  if (updateError) throw updateError;

  return avatarUrl;
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

// Excludes your own profile — without this, "New chat" showed yourself
// as a contact, and tapping it failed anyway (the backend explicitly
// rejects starting a conversation with yourself).
export async function fetchContacts() {
  if (!SUPABASE_ENABLED) return MOCK_CONTACTS;

  const { data: authData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .neq('id', authData?.user?.id || '');

  if (error) throw error;
  return data.map(normalizeProfile);
}

export async function fetchConversations() {
  if (!SUPABASE_ENABLED) return MOCK_CONVERSATIONS;

  const { data: authData } = await supabase.auth.getUser();
  const currentUserId = authData?.user?.id;

  const { data, error } = await supabase.from('conversations').select(
    `id, created_at,
     conversation_participants(user_id, profiles(*)),
     messages(text, created_at, media_type)`
  );

  if (error) throw error;

  // Sorted here (not via .order() in the query) by actual last-activity
  // rather than the conversation row's own created_at, so a thread that
  // just got a reply moves back to the top like a chat list should.
  return data
    .map((row) => normalizeConversation(row, currentUserId))
    .sort((a, b) => new Date(b._sortKey) - new Date(a._sortKey))
    .map(({ _sortKey, ...rest }) => rest);
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

// Resolves each message's replyToId into the actual quoted text
// (replyPreview) from within the same fetched batch — replies almost
// always quote something still in view. subscribeToMessages does the
// same resolution for realtime-delivered messages, against whatever's
// currently in ChatScreen's state.
export async function fetchMessages(conversationId) {
  if (!SUPABASE_ENABLED) return mockMessageStore[conversationId] || [];

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const normalized = data.map(normalizeMessage);
  const byId = Object.fromEntries(normalized.map((m) => [m.id, m]));
  return normalized.map((m) => ({
    ...m,
    replyPreview: m.replyToId ? byId[m.replyToId]?.text : undefined,
  }));
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
  return normalizeMessage(data);
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
      (payload) => onInsert(normalizeMessage(payload.new))
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// --- Attachments: images, files, and shared contacts --------------------
// All three funnel through sendAttachment() below. Images and files
// upload to Storage first (skipped in mock mode — the local file URI
// displays fine on-device without a real upload); contacts never
// upload anything, they just reference another profile's id.

export async function uploadChatImage(conversationId, localUri, mimeType = 'image/jpeg') {
  if (!SUPABASE_ENABLED) return { url: localUri, name: 'photo' };

  const extension = mimeType.split('/')[1] || 'jpg';
  const path = `${conversationId}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${extension}`;

  const arrayBuffer = await (await fetch(localUri)).arrayBuffer();
  const { error } = await supabase.storage
    .from('chat-media')
    .upload(path, arrayBuffer, { contentType: mimeType });
  if (error) throw error;

  const { data } = supabase.storage.from('chat-media').getPublicUrl(path);
  return { url: data.publicUrl, name: 'photo' };
}

export async function uploadChatFile(conversationId, localUri, fileName, mimeType, size) {
  if (!SUPABASE_ENABLED) return { url: localUri, name: fileName, size };

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${conversationId}/${Date.now()}-${safeName}`;

  const arrayBuffer = await (await fetch(localUri)).arrayBuffer();
  const { error } = await supabase.storage
    .from('chat-media')
    .upload(path, arrayBuffer, { contentType: mimeType || 'application/octet-stream' });
  if (error) throw error;

  const { data } = supabase.storage.from('chat-media').getPublicUrl(path);
  return { url: data.publicUrl, name: fileName, size };
}

// One insert path for every attachment type — image/file (mediaUrl set)
// or a shared contact (sharedUserId set instead). text is optional in
// every case (a caption, or nothing).
export async function sendAttachment(conversationId, attachment) {
  const { mediaUrl, mediaType, mediaName, mediaSize, sharedUserId, text = '' } = attachment;

  if (!SUPABASE_ENABLED) {
    const message = {
      id: `local-${Date.now()}`,
      senderId: 'me',
      text,
      mediaUrl,
      mediaType,
      mediaName,
      mediaSize,
      sharedUserId,
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
      media_url: mediaUrl,
      media_type: mediaType,
      media_name: mediaName,
      media_size: mediaSize,
      shared_user_id: sharedUserId,
    })
    .select()
    .single();

  if (error) throw error;
  return normalizeMessage(data);
}

// --- Phase 3: AI features (smart replies, summaries) -------------------
// Both require the backend AND Supabase (same as wallet/conversations —
// these routes check a real session token) AND the backend's own
// ANTHROPIC_API_KEY. There's no client-side flag for that last part —
// the backend just returns 501, which these treat as "feature not on
// yet" rather than an error worth alarming the user about.

export async function fetchSmartReplies(conversationId) {
  if (!BACKEND_ENABLED || !SUPABASE_ENABLED) return [];
  try {
    const result = await backendFetch('/ai/smart-replies', {
      method: 'POST',
      body: JSON.stringify({ conversationId }),
    });
    return result.suggestions || [];
  } catch (err) {
    return [];
  }
}

export async function summarizeConversation(conversationId) {
  if (!BACKEND_ENABLED || !SUPABASE_ENABLED) {
    throw new Error('Connect Supabase and the backend to use AI summaries.');
  }
  const result = await backendFetch('/ai/summarize', {
    method: 'POST',
    body: JSON.stringify({ conversationId }),
  });
  return result.summary;
}
