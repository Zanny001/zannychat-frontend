import { normalizeEmail, parseRecoveryCallback } from '../utils/authValidation';
import { retryTransient } from '../utils/retry';
import { clearDraftsForUser } from './drafts';
import { clearPinnedMessagesForUser } from './pinnedMessages';
import { supabase, SUPABASE_ENABLED, SUPABASE_URL } from './supabaseClient';
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
//     conversation (a multi-table write), AI features, and link
//     previews (see zannychat-backend's README for why).
//
// Actual Supabase schema (see zannychat-backend/supabase/migrations):
//   profiles(id, name, avatar_color, avatar_url, status, online)
//   conversations(id, created_at, name, is_group)
//   conversation_participants(conversation_id, user_id)
//   messages(id, conversation_id, sender_id, text, created_at, reply_to_id,
//            media_url, media_type, media_name, media_size, media_duration,
//            shared_user_id)
//   push_tokens(user_id, expo_push_token, platform)
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
  if (mediaType === 'voice') return '🎤 Voice message';
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
    senderName: row.sender?.name,
    text: row.text,
    createdAt: formatTimestamp(row.created_at),
    createdAtRaw: row.created_at,
    editedAt: row.edited_at || null,
    deletedAt: row.deleted_at || null,
    replyToId: row.reply_to_id,
    mediaUrl: row.media_url,
    mediaType: row.media_type,
    mediaName: row.media_name,
    mediaSize: row.media_size,
    mediaDuration: row.media_duration,
    sharedUserId: row.shared_user_id,
  };
}

// Chat media is stored privately. Database rows contain a storage:// marker
// (new writes) or a legacy Supabase public URL (existing rows); convert either
// to a short-lived signed URL only after the current user's Storage SELECT RLS
// policy confirms they belong to the conversation. Local mock URIs and other
// non-Supabase URLs are passed through unchanged.
const CHAT_MEDIA_BUCKET = 'chat-media';
const CHAT_MEDIA_SIGNED_URL_TTL_SECONDS = 24 * 60 * 60;

function isSafeChatMediaPath(path) {
  if (typeof path !== 'string' || !path || path.startsWith('/') || path.includes('\\')) return false;
  // Object paths are relative and must not contain dot segments. This avoids
  // signing malformed paths that could be interpreted differently by URL,
  // proxy, or Storage layers.
  const segments = path.split('/');
  return segments.length >= 2 && segments.every((segment) => segment && segment !== '.' && segment !== '..');
}

function chatMediaObjectPath(value) {
  if (typeof value !== 'string' || !value) return null;
  const marker = 'storage://chat-media/';
  if (value.startsWith(marker)) {
    const path = value.slice(marker.length);
    return isSafeChatMediaPath(path) ? path : null;
  }

  // Never treat an arbitrary third-party URL that happens to resemble a
  // Supabase Storage URL as authority to sign an object from our bucket.
  // Legacy rows are accepted only when their origin matches this project.
  let url;
  try {
    url = new URL(value);
  } catch (_) {
    return null;
  }
  if (url.origin !== SUPABASE_URL) return null;

  const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign)\/chat-media\/(.+)$/);
  if (!match) return null;
  try {
    const path = decodeURIComponent(match[1]);
    return isSafeChatMediaPath(path) ? path : null;
  } catch (_) {
    return null;
  }
}

async function normalizeMessageWithMedia(row) {
  const message = normalizeMessage(row);
  const path = chatMediaObjectPath(message?.mediaUrl);
  if (!path || !SUPABASE_ENABLED) return message;

  try {
    const { data, error } = await supabase.storage
      .from(CHAT_MEDIA_BUCKET)
      .createSignedUrl(path, CHAT_MEDIA_SIGNED_URL_TTL_SECONDS);
    if (error || !data?.signedUrl) return { ...message, mediaUrl: null };
    return { ...message, mediaUrl: data.signedUrl };
  } catch (_) {
    // A media signing failure should not make ordinary text history fail to load.
    return { ...message, mediaUrl: null };
  }
}

// row is one item from the nested conversations/participants/messages
// select in fetchConversations — see the query there for the exact
// shape this expects.
//
// Groups reuse the same `participant` field every screen already reads
// (ChatListItem, ChatScreen's header) rather than introducing a
// parallel shape — for a group it's a synthesized pseudo-participant
// (the group's name/color standing in for a person's), plus isGroup
// and memberCount for the places that do need to know the difference
// (Avatar's group badge, ChatBubble's sender-name label).
const GROUP_AVATAR_COLOR = '#3E7BFA';

// Unread count and favorite status both come from the CURRENT user's
// own row in conversation_participants (see 0004_unread_and_favorites.sql)
// — every participant has their own last_read_at and is_favorite, not a
// single shared value. Unread = messages from someone else, newer than
// my last_read_at (or every message from someone else, if I've never
// opened this conversation at all).
function normalizeConversation(row, currentUserId) {
  const participants = row.conversation_participants || [];
  const messages = [...(row.messages || [])].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );
  const last = messages[messages.length - 1];
  const sortKey = last?.created_at || row.created_at;
  const lastMessage = last ? last.text || mediaPreviewText(last.media_type) : '';
  const lastMessageAt = formatTimestamp(sortKey);

  const mine = participants.find((p) => p.user_id === currentUserId);
  const myLastReadAt = mine?.last_read_at ? new Date(mine.last_read_at) : null;
  const unreadCount = messages.filter(
    (m) => m.sender_id !== currentUserId && (!myLastReadAt || new Date(m.created_at) > myLastReadAt)
  ).length;
  const isFavorite = Boolean(mine?.is_favorite);
  const isMuted = Boolean(mine?.is_muted);
  const isArchived = Boolean(mine?.is_archived);

  if (row.is_group) {
    return {
      id: row.id,
      isGroup: true,
      memberCount: participants.length,
      participant: {
        name: row.name || 'Group',
        avatarColor: GROUP_AVATAR_COLOR,
        avatarUrl: null,
        online: false,
      },
      lastMessage,
      lastMessageAt,
      unreadCount,
      isFavorite,
      isMuted,
      isArchived,
      _sortKey: sortKey,
    };
  }

  const other = participants.find((p) => p.user_id !== currentUserId) || participants[0];
  const profile = normalizeProfile(other?.profiles) || {};

  return {
    id: row.id,
    isGroup: false,
    participant: {
      id: other?.user_id,
      name: profile.name || 'Unknown',
      avatarColor: profile.avatarColor || '#6C5CE7',
      avatarUrl: profile.avatarUrl,
      online: profile.online || false,
    },
    lastMessage,
    lastMessageAt,
    unreadCount,
    isFavorite,
    isMuted,
    isArchived,
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
  const { data, error } = await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email, password, name) {
  if (!SUPABASE_ENABLED) return { user: { ...CURRENT_USER, name }, session: { mock: true }, requiresEmailConfirmation: false };
  const { data, error } = await supabase.auth.signUp({
    email: normalizeEmail(email),
    password,
    options: { data: { name } },
  });
  if (error) throw error;
  return { ...data, requiresEmailConfirmation: Boolean(data?.user && !data?.session) };
}

export async function verifySignupEmailOtp(email, token) {
  if (!SUPABASE_ENABLED) throw new Error('Email verification requires a configured Supabase project.');
  const normalizedEmail = normalizeEmail(email);
  const cleanToken = String(token || '').replace(/\s+/g, '');
  if (!/^[0-9]{6}$/.test(cleanToken)) throw new Error('Enter the 6-digit code from your email.');
  const { data, error } = await supabase.auth.verifyOtp({
    email: normalizedEmail,
    token: cleanToken,
    type: 'signup',
  });
  if (error) throw error;
  if (!data?.session || !data?.user) throw new Error('Verification did not create a session. Please sign in.');
  return data;
}

export async function resendSignupEmailOtp(email) {
  if (!SUPABASE_ENABLED) throw new Error('Email verification requires a configured Supabase project.');
  const normalizedEmail = normalizeEmail(email);
  const { error } = await supabase.auth.resend({ type: 'signup', email: normalizedEmail });
  if (error) throw error;
  return { requested: true };
}

export async function requestPasswordReset(email) {
  if (!SUPABASE_ENABLED) return { mock: true };
  const normalizedEmail = normalizeEmail(email);
  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    // Add this exact URL to Supabase Auth's redirect URL allowlist before
    // enabling recovery in a hosted environment.
    redirectTo: 'zannychat://reset-password',
  });
  if (error) throw error;
  // Do not return whether an account exists; the UI always shows the same
  // generic success message to avoid account enumeration.
  return { requested: true };
}

export async function changePassword(newPassword) {
  if (!SUPABASE_ENABLED) throw new Error('Password changes require a configured Supabase account.');
  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
    throw new Error('Use a password between 8 and 128 characters.');
  }
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  if (!data?.user) throw new Error('Your session may have expired. Sign in again and retry.');
  return { updated: true };
}

export async function completePasswordReset(callbackUrl, newPassword) {
  if (!SUPABASE_ENABLED) throw new Error('Password reset requires a configured Supabase project.');
  const callback = parseRecoveryCallback(callbackUrl);
  if (!callback) throw new Error('The recovery link is expired or invalid. Request a new one.');
  // Supabase can return a PKCE authorization code or implicit-flow tokens.
  // Exchange the code on this device when present so the stored PKCE verifier
  // is used; otherwise restore the recovery session from the token pair.
  const sessionResult = callback.code
    ? await supabase.auth.exchangeCodeForSession(callback.code)
    : await supabase.auth.setSession({ access_token: callback.accessToken, refresh_token: callback.refreshToken });
  if (sessionResult.error) throw sessionResult.error;
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return { updated: true };
}


// Permanently delete the authenticated account. Password re-authentication is
// required on-device, and the backend independently checks the fresh JWT
// auth_time claim before invoking the Supabase admin deletion API.
export async function deleteAccount(currentPassword) {
  if (!SUPABASE_ENABLED || !BACKEND_ENABLED) {
    throw new Error('Account deletion requires a configured Supabase project and backend.');
  }
  if (typeof currentPassword !== 'string' || !currentPassword) {
    throw new Error('Enter your current password to continue.');
  }
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user?.email) {
    throw new Error('Your session has expired. Sign in again before deleting your account.');
  }
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(userData.user.email),
    password: currentPassword,
  });
  if (reauthError) throw new Error('Password verification failed. Check your password and try again.');

  await backendFetch('/account/delete', {
    method: 'POST',
    body: JSON.stringify({ confirmation: 'DELETE' }),
  });
  // Account is already removed server-side. Clean this account's local
  // unsent drafts before dropping the local session; cleanup is best-effort
  // and never turns a successful server deletion into a reported failure.
  await clearDraftsForUser(userData.user.id).catch(() => false);
  await clearPinnedMessagesForUser(userData.user.id).catch(() => false);
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  return { deleted: true };
}

export async function getSessionSecurityInfo() {
  if (!SUPABASE_ENABLED || !supabase) throw new Error('Session management requires a connected account.');
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const session = sessionData?.session;
  if (!session) return null;
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  return {
    email: userData?.user?.email || session.user?.email || null,
    expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
  };
}

export async function signOutThisDevice() {
  if (!SUPABASE_ENABLED || !supabase) throw new Error('Session management requires a connected account.');
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
  return { signedOut: true, scope: 'local' };
}

export async function signOutEverywhere() {
  if (!SUPABASE_ENABLED || !supabase) throw new Error('Session management requires a connected account.');
  const { error } = await supabase.auth.signOut({ scope: 'global' });
  if (error) throw error;
  return { signedOut: true, scope: 'global' };
}

export async function signOut() {
  if (!SUPABASE_ENABLED) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Excludes your own profile — without this, "New chat" showed yourself
// as a contact, and tapping it failed anyway (the backend explicitly
// rejects starting a conversation with yourself).
export async function fetchContactById(userId) {
  if (!SUPABASE_ENABLED) throw new Error('QR contact discovery requires a connected account.');
  if (typeof userId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
    throw new Error('That QR code is not a valid ZannyChat contact.');
  }
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) throw new Error('Sign in before connecting to a contact.');
  if (authData.user.id === userId) throw new Error("That's your own QR code. Scan someone else's code.");
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('No ZannyChat profile was found for that QR code.');
  return normalizeProfile(data);
}

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

// Paginated since the Oct 2026 audit ("no pagination anywhere"): the
// conversation list pages by created_at desc, and each conversation's
// nested messages are capped at the 30 most recent — enough for the
// last-message preview and an unread count (which is therefore capped
// at 30; honest tradeoff, noted on the badge rather than fetching
// unbounded history per row like before).
// Server-backed scheduled messages. These helpers intentionally use the authenticated
// backend rather than direct Supabase writes because the queue is service-role-only.
export async function fetchScheduledMessages() {
  const result = await backendFetch('/conversations/scheduled-messages');
  return result.scheduledMessages || [];
}

export async function scheduleMessage(conversationId, text, scheduledFor) {
  if (typeof conversationId !== 'string' || !conversationId.trim()) throw new Error('A conversation is required');
  if (typeof text !== 'string' || !text.trim() || text.trim().length > 4000) throw new Error('Message text must be 1–4000 characters');
  if (typeof scheduledFor !== 'string' || !Number.isFinite(Date.parse(scheduledFor))) throw new Error('A valid scheduled date is required');
  const result = await backendFetch('/conversations/scheduled-messages', {
    method: 'POST',
    body: JSON.stringify({ conversationId, text: text.trim(), scheduledFor }),
  });
  return result.scheduledMessage;
}

export async function cancelScheduledMessage(scheduledMessageId) {
  if (typeof scheduledMessageId !== 'string' || !scheduledMessageId.trim()) throw new Error('A scheduled message ID is required');
  await backendFetch(`/conversations/scheduled-messages/${encodeURIComponent(scheduledMessageId)}`, { method: 'DELETE' });
  return true;
}

export async function fetchConversations({ limit = 50, offset = 0 } = {}) {
  if (!SUPABASE_ENABLED) return { conversations: MOCK_CONVERSATIONS, hasMore: false };

  const { data: authData } = await supabase.auth.getUser();
  const currentUserId = authData?.user?.id;

  const { data, error } = await supabase
    .from('conversations')
    .select(
      `id, created_at, name, is_group,
       conversation_participants(user_id, profiles(*), last_read_at, is_favorite, is_muted, is_archived),
       messages(sender_id, text, created_at, media_type)`
    )
    .order('created_at', { ascending: false, referencedTable: 'messages' })
    .limit(30, { referencedTable: 'messages' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  // Sorted here (not via .order() in the query) by actual last-activity
  // rather than the conversation row's own created_at, so a thread that
  // just got a reply moves back to the top like a chat list should.
  const conversations = data
    .map((row) => normalizeConversation(row, currentUserId))
    .sort((a, b) => new Date(b._sortKey) - new Date(a._sortKey))
    .map(({ _sortKey, ...rest }) => rest);

  return { conversations, hasMore: data.length === limit };
}

// Removes the current user's membership in a conversation. This is a
// user-scoped "delete chat": it removes the chat from this account's list
// without deleting the other participants' conversation or message history.
// The database must permit users to delete only their own participant row;
// if RLS rejects the operation, surface the error rather than pretending it worked.
export async function deleteConversationForCurrentUser(conversationId) {
  if (!SUPABASE_ENABLED) return;

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const userId = authData?.user?.id;
  if (!userId) throw new Error('Sign in to delete a chat.');

  const { data, error } = await supabase
    .from('conversation_participants')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .select('conversation_id');

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('This chat could not be deleted. You may no longer be a participant.');
  }
}

// Called when ChatScreen gains focus — zeroes this conversation's
// unread count for the current user by advancing their own
// last_read_at, and (in a 1:1) is what the other person's "seen" tick
// is watching for via subscribeToParticipantUpdates below. Mock mode
// has nothing to persist this to, so it's a no-op there.
export async function markConversationRead(conversationId) {
  if (!SUPABASE_ENABLED) return;

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) return;

  const { error } = await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function toggleFavorite(conversationId, isFavorite) {
  if (!SUPABASE_ENABLED) return;

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) return;

  const { error } = await supabase
    .from('conversation_participants')
    .update({ is_favorite: isFavorite })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  if (error) throw error;
}

// Returns { [userId]: last_read_at } for everyone in a conversation —
// what ChatScreen uses to compute each of its own messages' "seen"
// state at render time. Only meaningful in a 1:1 today (a group's
// "seen by 4 of 6" is a real feature this doesn't attempt — see the
// backend README).
export async function fetchParticipantReadState(conversationId) {
  if (!SUPABASE_ENABLED) return {};

  const { data, error } = await supabase
    .from('conversation_participants')
    .select('user_id, last_read_at')
    .eq('conversation_id', conversationId);

  if (error) throw error;
  return Object.fromEntries(data.map((row) => [row.user_id, row.last_read_at]));
}

// Live "seen" ticks: fires whenever ANYONE's last_read_at in this
// conversation changes (including your own, which the caller just
// ignores) — the same postgres_changes mechanism subscribeToMessages
// uses, just watching UPDATE on a different table.
export function subscribeToParticipantUpdates(conversationId, onUpdate) {
  if (!SUPABASE_ENABLED) return () => {};

  const channel = supabase
    .channel(`participants:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversation_participants',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onUpdate(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
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
      isGroup: false,
      participant: participantProfile,
      lastMessage: '',
      lastMessageAt: '',
      unreadCount: 0,
    };
  }

  return {
    id: `new-${participantId}`,
    isGroup: false,
    participant: participantProfile,
    lastMessage: '',
    lastMessageAt: '',
    unreadCount: 0,
  };
}

// Same idea as createConversation but for 2+ other people plus a name —
// see zannychat-backend's POST /conversations/group. memberProfiles is
// only used to synthesize a reasonable local object in mock mode /
// before the group's own member list has been fetched; the real
// `participant` (group name/color) always comes from the server round
// trip once BACKEND_ENABLED && SUPABASE_ENABLED.
export async function createGroupConversation(participantIds, name, memberProfiles = []) {
  if (BACKEND_ENABLED && SUPABASE_ENABLED) {
    const conversation = await backendFetch('/conversations/group', {
      method: 'POST',
      body: JSON.stringify({ participantIds, name }),
    });
    return {
      ...conversation,
      isGroup: true,
      memberCount: participantIds.length + 1,
      participant: {
        name,
        avatarColor: GROUP_AVATAR_COLOR,
        avatarUrl: null,
        online: false,
      },
      lastMessage: '',
      lastMessageAt: '',
      unreadCount: 0,
    };
  }

  return {
    id: `new-group-${Date.now()}`,
    isGroup: true,
    memberCount: memberProfiles.length + 1,
    participant: {
      name,
      avatarColor: GROUP_AVATAR_COLOR,
      avatarUrl: null,
      online: false,
    },
    lastMessage: '',
    lastMessageAt: '',
    unreadCount: 0,
  };
}

// Resolves each message's replyToId into the actual quoted text
// (replyPreview) from within the same fetched batch — replies almost
// always quote something still in view. subscribeToMessages does the
// same resolution for realtime-delivered messages, against whatever's
// currently in ChatScreen's state. The sender join (disambiguated by
// column name, since messages has two FKs to profiles — sender_id and
// shared_user_id) is what makes group messages show "who" without a
// second query.
// Paginated since the Oct 2026 audit: loads the most recent `limit`
// messages (default 30), newest-first from the DB then flipped back to
// chronological for display. Pass `before` (the oldest currently-loaded
// message's createdAtRaw) to fetch the next older page. Returns
// { messages, hasMore } — hasMore=true means another older page likely
// exists.
//
// Resolves each message's replyToId into the actual quoted text
// (replyPreview) from within the fetched batch. A reply quoting a
// message older than the current page shows no preview until that page
// loads — a bounded, acceptable gap (previously the whole history was
// loaded so this never came up; pagination trades that away on
// purpose).
export async function fetchMessages(conversationId, { limit = 30, before = null } = {}) {
  if (!SUPABASE_ENABLED) {
    return { messages: mockMessageStore[conversationId] || [], hasMore: false };
  }

  let query = supabase
    .from('messages')
    .select('*, sender:profiles!sender_id(name)')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) query = query.lt('created_at', before);

  const { data, error } = await query;
  if (error) throw error;

  const normalized = (await Promise.all(data.map(normalizeMessageWithMedia))).reverse(); // back to chronological
  const byId = Object.fromEntries(normalized.map((m) => [m.id, m]));
  return {
    messages: normalized.map((m) => ({
      ...m,
      replyPreview: m.replyToId ? byId[m.replyToId]?.text : undefined,
    })),
    hasMore: data.length === limit,
  };
}

// Edit own message — the RLS policy from 0006 scopes this to the
// sender, so the client just does the update; the server enforces it.
export async function editMessage(messageId, text) {
  if (!SUPABASE_ENABLED) {
    for (const list of Object.values(mockMessageStore)) {
      const found = list.find((m) => m.id === messageId);
      if (found) {
        found.text = text;
        found.editedAt = new Date().toISOString();
      }
    }
    return;
  }

  const { error } = await supabase
    .from('messages')
    .update({ text, edited_at: new Date().toISOString() })
    .eq('id', messageId);
  if (error) throw error;
}

// Soft delete — sets deleted_at, the content stays in the DB (replies
// may quote it, reports may point at it) but every client renders a
// "message was deleted" tombstone instead.
export async function deleteMessage(messageId) {
  if (!SUPABASE_ENABLED) {
    for (const list of Object.values(mockMessageStore)) {
      const found = list.find((m) => m.id === messageId);
      if (found) found.deletedAt = new Date().toISOString();
    }
    return;
  }

  const { error } = await supabase
    .from('messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId);
  if (error) throw error;
}

function createMessageRequestId() {
  // UUID-shaped client identifier keeps a retry from creating a second copy
  // if the first insert reached Postgres but its response was lost.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

export async function sendMessage(conversationId, text, replyToId = null, requestId = null) {
  const messageText = typeof text === 'string' ? text.trim() : '';

  if (!conversationId) {
    throw new Error('Cannot send this message: the conversation ID is missing.');
  }

  if (!messageText) {
    throw new Error('Enter a message before sending.');
  }

  if (!SUPABASE_ENABLED || !supabase) {
    const message = {
      id: `local-${Date.now()}`,
      senderId: 'me',
      text: messageText,
      replyToId,
      createdAt: 'Now',
      createdAtRaw: new Date().toISOString(),
    };

    mockMessageStore[conversationId] = [
      ...(mockMessageStore[conversationId] || []),
      message,
    ];

    return message;
  }

  const {
    data: authData,
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(`Could not verify your sign-in: ${authError.message}`);
  }

  const userId = authData?.user?.id;

  if (!userId) {
    throw new Error('You are not signed in. Sign in again before sending.');
  }

  const payload = {
    id: requestId || createMessageRequestId(),
    conversation_id: conversationId,
    sender_id: userId,
    text: messageText,
  };

  if (replyToId) {
    payload.reply_to_id = replyToId;
  }

  let data;
  try {
    const result = await retryTransient(async () => {
      const response = await supabase
        .from('messages')
        .insert(payload)
        .select('*')
        .single();
      if (response.error) throw response.error;
      return response.data;
    }, { attempts: 3, delay: 300 });
    data = result;
  } catch (error) {
    // A timeout can happen after Postgres committed the insert. Since retries
    // reuse the same primary key, recover that committed row instead of asking
    // the user to retry and risking a duplicate message.
    if (error?.code === '23505') {
      const recovered = await supabase.from('messages').select('*').eq('id', payload.id).maybeSingle();
      if (!recovered.error && recovered.data) data = recovered.data;
    }
    if (!data) {
      console.error('[Messaging] Supabase insert failed:', {
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
      });
      throw new Error(`Message could not be saved (${error?.code || 'network/database error'}): ${error?.message || 'Please check your connection and try again.'}`);
    }
  }

  if (!data) throw new Error('Supabase did not return the saved message. Please retry.');
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
      (payload) => { normalizeMessageWithMedia(payload.new).then(onInsert); }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// --- Per-message delivery acknowledgements --------------------------------
// A receipt means the recipient's authenticated client fetched/received the
// message. It is not a read receipt; last_read_at remains the read source.
export async function markMessagesDelivered(conversationId, messages, userId) {
  if (!SUPABASE_ENABLED || !conversationId || !userId || !Array.isArray(messages)) return;
  const rows = messages
    .filter((message) => message?.id && !String(message.id).startsWith('temp-') && message.senderId && message.senderId !== userId)
    .map((message) => ({ message_id: message.id, conversation_id: conversationId, user_id: userId }));
  if (!rows.length) return;
  const { error } = await supabase.from('message_delivery_receipts')
    .upsert(rows, { onConflict: 'message_id,user_id', ignoreDuplicates: true });
  if (error) throw error;
}

// Returns { [messageId]: [recipientUserId, ...] } for this conversation.
export async function fetchMessageDeliveryState(conversationId, messageIds = []) {
  if (!SUPABASE_ENABLED || !conversationId || !Array.isArray(messageIds) || messageIds.length === 0) return {};
  const { data, error } = await supabase.from('message_delivery_receipts')
    .select('message_id, user_id').eq('conversation_id', conversationId).in('message_id', messageIds);
  if (error) throw error;
  return (data || []).reduce((state, row) => {
    (state[row.message_id] ||= []).push(row.user_id);
    return state;
  }, {});
}

export function subscribeToMessageDeliveryReceipts(conversationId, onReceipt) {
  if (!SUPABASE_ENABLED) return () => {};
  const channel = supabase.channel(`message-delivery:${conversationId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_delivery_receipts', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onReceipt?.(payload.new))
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// --- Reactions (persisted, synced) ---------------------------------------
// Backed by the message_reactions table from migration 0006 — the
// pre-upgrade handleReact only touched local state, so a reaction was
// invisible to the other person and gone on reopen. One reaction per
// user per message; re-reacting replaces it, re-tapping the same emoji
// removes it.

// Returns { [messageId]: [{ userId, emoji }] } for the given messages.
export async function fetchReactions(messageIds) {
  if (!SUPABASE_ENABLED || messageIds.length === 0) return {};

  const { data, error } = await supabase
    .from('message_reactions')
    .select('message_id, user_id, emoji')
    .in('message_id', messageIds);

  if (error) throw error;

  const byMessage = {};
  for (const row of data || []) {
    (byMessage[row.message_id] = byMessage[row.message_id] || []).push({
      userId: row.user_id,
      emoji: row.emoji,
    });
  }
  return byMessage;
}

// Toggles the current user's reaction on a message. `existing` is the
// emoji they currently have on it (if any) — same emoji removes the
// reaction, a different one replaces it.
export async function toggleReaction(messageId, emoji, existing = null) {
  if (!SUPABASE_ENABLED) return; // mock mode: reactions stay local to the screen

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) return;

  if (existing === emoji) {
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('message_reactions')
    .upsert(
      { message_id: messageId, user_id: userId, emoji },
      { onConflict: 'message_id,user_id' }
    );
  if (error) throw error;
}

// Live reaction sync — fires on any insert/update/delete of
// message_reactions. Not filtered server-side (the filter would need a
// join through messages); the callback gets the raw payload and the
// screen ignores rows for messages it isn't showing.
export function subscribeToReactions(onChange) {
  if (!SUPABASE_ENABLED) return () => {};

  const channel = supabase
    .channel('reactions:all')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'message_reactions' },
      (payload) => onChange(payload)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// --- Typing indicators ----------------------------------------------------
// Supabase Realtime broadcast (not the DB) — typing is ephemeral by
// nature, persisting it would be pure overhead. One channel per open
// conversation; both sides subscribe and send on the same topic.

const typingChannels = {};

export function subscribeToTyping(conversationId, onTyping) {
  if (!SUPABASE_ENABLED) return () => {};

  const channel = supabase.channel(`typing:${conversationId}`);
  channel
    .on('broadcast', { event: 'typing' }, (payload) => onTyping(payload.payload))
    .subscribe();
  typingChannels[conversationId] = channel;

  return () => {
    delete typingChannels[conversationId];
    supabase.removeChannel(channel);
  };
}

export async function sendTyping(conversationId) {
  const channel = typingChannels[conversationId];
  if (!channel) return;

  const { data } = await supabase.auth.getUser();
  const userId = data?.user?.id;
  if (!userId) return;

  channel.send({
    type: 'broadcast',
    event: 'typing',
    payload: { userId },
  });
}

// --- Mute / archive ---------------------------------------------------------
// Same shape as toggleFavorite — per-participant flags on your own
// conversation_participants row (0006 columns, 0004's UPDATE policy).
// Mute also suppresses push notifications from this conversation,
// enforced server-side in the backend's webhook (see internal.js).
export async function setConversationFlags(conversationId, flags) {
  if (!SUPABASE_ENABLED) return;

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) return;

  const update = {};
  if (flags.isMuted !== undefined) update.is_muted = flags.isMuted;
  if (flags.isArchived !== undefined) update.is_archived = flags.isArchived;
  if (Object.keys(update).length === 0) return;

  const { error } = await supabase
    .from('conversation_participants')
    .update(update)
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  if (error) throw error;
}

// --- Trust & safety (block / report) --------------------------------------
// Thin wrappers over the backend's /safety routes (see
// zannychat-backend/src/routes/safety.js). The backend enforces the
// actual semantics (RLS blocks message inserts server-side too — these
// routes exist so blocking also works atomically and is listable).

const mockBlockedUsers = [];

export async function blockUser(userId) {
  if (!BACKEND_ENABLED || !SUPABASE_ENABLED) {
    if (!mockBlockedUsers.includes(userId)) mockBlockedUsers.push(userId);
    return;
  }
  await backendFetch('/safety/block', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export async function unblockUser(userId) {
  if (!BACKEND_ENABLED || !SUPABASE_ENABLED) {
    const i = mockBlockedUsers.indexOf(userId);
    if (i >= 0) mockBlockedUsers.splice(i, 1);
    return;
  }
  await backendFetch('/safety/unblock', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export async function fetchBlockedUsers() {
  if (!BACKEND_ENABLED || !SUPABASE_ENABLED) {
    return mockBlockedUsers.map((id) => ({
      userId: id,
      profile: MOCK_CONTACTS.find((c) => c.id === id) || { id, name: 'Unknown' },
    }));
  }
  const result = await backendFetch('/safety/blocked');
  return result.blocked || [];
}

export async function reportUser({ reportedUserId, messageId = null, reason = '' }) {
  if (!BACKEND_ENABLED || !SUPABASE_ENABLED) return; // mock mode: nowhere to file it
  await backendFetch('/safety/report', {
    method: 'POST',
    body: JSON.stringify({ reportedUserId, messageId, reason }),
  });
}

// --- Attachments: images, files, voice notes, and shared contacts -------
// All funnel through sendAttachment() below. Images, files, and voice
// notes upload to Storage first (skipped in mock mode — the local file
// URI displays/plays fine on-device without a real upload); contacts
// never upload anything, they just reference another profile's id.

export async function uploadChatImage(conversationId, localUri, mimeType = 'image/jpeg') {
  if (!SUPABASE_ENABLED) return { url: localUri, name: 'photo' };

  const extension = mimeType.split('/')[1] || 'jpg';
  const path = `${conversationId}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${extension}`;

  const arrayBuffer = await (await fetch(localUri)).arrayBuffer();
  const { error } = await supabase.storage
    .from('chat-media')
    .upload(path, arrayBuffer, { contentType: mimeType });
  if (error) throw error;

  return { url: `storage://chat-media/${path}`, name: 'photo' };
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

  return { url: `storage://chat-media/${path}`, name: fileName, size };
}

export async function uploadVoiceNote(conversationId, localUri, durationSeconds) {
  if (!SUPABASE_ENABLED) return { url: localUri, duration: durationSeconds };

  const path = `${conversationId}/${Date.now()}-voice.m4a`;

  const arrayBuffer = await (await fetch(localUri)).arrayBuffer();
  const { error } = await supabase.storage
    .from('chat-media')
    .upload(path, arrayBuffer, { contentType: 'audio/m4a' });
  if (error) throw error;

  return { url: `storage://chat-media/${path}`, duration: durationSeconds };
}

// One insert path for every attachment type — image/file/voice
// (mediaUrl set) or a shared contact (sharedUserId set instead). text
// is optional in every case (a caption, or nothing).
export async function sendAttachment(conversationId, attachment) {
  const { mediaUrl, mediaType, mediaName, mediaSize, mediaDuration, sharedUserId, text = '' } = attachment;

  if (!SUPABASE_ENABLED) {
    const message = {
      id: `local-${Date.now()}`,
      senderId: 'me',
      text,
      mediaUrl,
      mediaType,
      mediaName,
      mediaSize,
      mediaDuration,
      sharedUserId,
      createdAt: 'Now',
    };
    mockMessageStore[conversationId] = [...(mockMessageStore[conversationId] || []), message];
    return message;
  }

  if (!conversationId) throw new Error('Cannot send this attachment: the conversation ID is missing.');
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(`Could not verify your sign-in: ${authError.message}`);
  const userId = authData?.user?.id;
  if (!userId) throw new Error('You are not signed in. Sign in again before sending.');

  const payload = {
    id: createMessageRequestId(),
    conversation_id: conversationId,
    sender_id: userId,
    text,
    media_url: mediaUrl,
    media_type: mediaType,
    media_name: mediaName,
    media_size: mediaSize,
    media_duration: mediaDuration,
    shared_user_id: sharedUserId,
  };
  let data;
  try {
    data = await retryTransient(async () => {
      const response = await supabase.from('messages').insert(payload).select().single();
      if (response.error) throw response.error;
      return response.data;
    }, { attempts: 3, delay: 300 });
  } catch (error) {
    if (error?.code === '23505') {
      const recovered = await supabase.from('messages').select('*').eq('id', payload.id).maybeSingle();
      if (!recovered.error && recovered.data) data = recovered.data;
    }
    if (!data) throw new Error(`Attachment could not be saved (${error?.code || 'network/database error'}): ${error?.message || 'Please check your connection and try again.'}`);
  }
  if (!data) throw new Error('Supabase did not return the saved attachment. Please retry.');
  return normalizeMessageWithMedia(data);
}

// --- Phase 3: AI features (smart replies, summaries) -------------------
// Both require the backend AND Supabase (same as createConversation —
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

// Returns null on any failure (no backend, blocked host, timeout,
// a page with no usable meta tags) rather than throwing — a message
// with a link that can't be previewed should just show as plain text,
// never a broken UI or a jarring error the sender didn't cause.
export async function fetchLinkPreview(url) {
  if (!BACKEND_ENABLED || !SUPABASE_ENABLED) return null;
  try {
    return await backendFetch(`/link-preview?url=${encodeURIComponent(url)}`);
  } catch (err) {
    return null;
  }
}


// Load a group roster through the authenticated backend. The backend checks
// membership before returning any profile information.
export async function fetchGroupMembers(conversationId) {
  if (!(BACKEND_ENABLED && SUPABASE_ENABLED)) {
    throw new Error('Group members require a connected account.');
  }
  if (!conversationId) throw new Error('A group is required.');
  return backendFetch(`/conversations/${encodeURIComponent(conversationId)}/members`);
}

// Group metadata is read only by members; server-side role checks protect edits.
export async function fetchGroupMetadata(conversationId) {
  if (!(BACKEND_ENABLED && SUPABASE_ENABLED)) throw new Error('Group settings require a connected account.');
  if (!conversationId) throw new Error('A group is required.');
  return backendFetch(`/conversations/${encodeURIComponent(conversationId)}/metadata`);
}

export async function updateGroupMetadata(conversationId, { name, topic, description, adminOnlyMessages }) {
  if (!(BACKEND_ENABLED && SUPABASE_ENABLED)) throw new Error('Group settings require a connected account.');
  if (!conversationId) throw new Error('A group is required.');
  const cleanName = typeof name === 'string' ? name.trim() : undefined;
  const cleanTopic = typeof topic === 'string' ? topic.trim() : '';
  const cleanDescription = typeof description === 'string' ? description.trim() : '';
  if (cleanName !== undefined && (!cleanName || cleanName.length > 80)) throw new Error('Group name must be between 1 and 80 characters.');
  if (cleanTopic.length > 80 || cleanDescription.length > 500) throw new Error('Topic must be at most 80 characters and description at most 500.');
  return backendFetch(`/conversations/${encodeURIComponent(conversationId)}/metadata`, {
    method: 'PATCH', body: JSON.stringify({ ...(cleanName === undefined ? {} : { name: cleanName }), topic: cleanTopic, description: cleanDescription, ...(typeof adminOnlyMessages === 'boolean' ? { adminOnlyMessages } : {}) }),
  });
}

// Group administration endpoints require a verified backend session. These
// helpers intentionally fail closed in mock/offline mode instead of pretending
// that a local-only role change has been saved to the server.
export async function setGroupMemberAdmin(conversationId, memberId, isAdmin) {
  if (!(BACKEND_ENABLED && SUPABASE_ENABLED)) {
    throw new Error('Group administration requires a connected account.');
  }
  if (!conversationId || !memberId || typeof isAdmin !== 'boolean') {
    throw new Error('A group, member, and valid admin setting are required.');
  }
  return backendFetch(`/conversations/${encodeURIComponent(conversationId)}/members/${encodeURIComponent(memberId)}/admin`, {
    method: 'PATCH',
    body: JSON.stringify({ isAdmin }),
  });
}

export async function removeGroupMember(conversationId, memberId) {
  if (!(BACKEND_ENABLED && SUPABASE_ENABLED)) {
    throw new Error('Group membership changes require a connected account.');
  }
  if (!conversationId || !memberId) throw new Error('A group and member are required.');
  return backendFetch(`/conversations/${encodeURIComponent(conversationId)}/members/${encodeURIComponent(memberId)}`, {
    method: 'DELETE',
  });
}


// Group invite links are generated and verified by the authenticated backend.
export async function createGroupInvite(conversationId, options = {}) {
  if (!(BACKEND_ENABLED && SUPABASE_ENABLED)) throw new Error('Group invites require a connected account.');
  if (!conversationId) throw new Error('A group is required.');
  const expiresInHours = options.expiresInHours ?? 168;
  const maxUses = options.maxUses ?? 25;
  return backendFetch(`/conversations/${encodeURIComponent(conversationId)}/invites`, {
    method: 'POST', body: JSON.stringify({ expiresInHours, maxUses }),
  });
}

export async function acceptGroupInvite(token) {
  if (!(BACKEND_ENABLED && SUPABASE_ENABLED)) throw new Error('Joining a group requires a connected account.');
  if (typeof token !== 'string' || !token.trim()) throw new Error('Enter a group invite token.');
  return backendFetch('/conversations/invites/accept', { method: 'POST', body: JSON.stringify({ token: token.trim() }) });
}

export async function fetchGroupInvites(conversationId) {
  if (!(BACKEND_ENABLED && SUPABASE_ENABLED)) throw new Error('Group invites require a connected account.');
  if (!conversationId) throw new Error('A group is required.');
  const result = await backendFetch(`/conversations/${encodeURIComponent(conversationId)}/invites`);
  return Array.isArray(result?.invites) ? result.invites : [];
}

export async function revokeGroupInvite(conversationId, inviteId) {
  if (!(BACKEND_ENABLED && SUPABASE_ENABLED)) throw new Error('Group invites require a connected account.');
  if (!conversationId || !inviteId) throw new Error('A group and invite are required.');
  return backendFetch(`/conversations/${encodeURIComponent(conversationId)}/invites/${encodeURIComponent(inviteId)}`, { method: 'DELETE' });
}

// Channel directory and broadcast-post APIs are mediated by the authenticated
// backend so channel ownership and subscription state cannot be forged by clients.
export async function listChannels(search = '') {
  const query = typeof search === 'string' ? search.trim().slice(0, 80) : '';
  const path = query ? `/channels?q=${encodeURIComponent(query)}` : '/channels';
  const result = await backendFetch(path);
  return Array.isArray(result?.channels) ? result.channels : [];
}

export async function createChannel({ title, description = '', isPrivate = false }) {
  const result = await backendFetch('/channels', { method: 'POST', body: JSON.stringify({ title, description, isPrivate: Boolean(isPrivate) }) });
  return result.channel;
}

export async function updateChannel(channelId, { title, description = '', isPrivate }) {
  const payload = { title, description };
  if (typeof isPrivate === 'boolean') payload.isPrivate = isPrivate;
  const result = await backendFetch(`/channels/${encodeURIComponent(channelId)}`, { method: 'PATCH', body: JSON.stringify(payload) });
  return result.channel;
}

export async function createChannelInvite(channelId, options = {}) {
  const result = await backendFetch(`/channels/${encodeURIComponent(channelId)}/invites`, { method: 'POST', body: JSON.stringify(options) });
  return result.invite;
}

export async function acceptChannelInvite(token) {
  const result = await backendFetch('/channels/invites/accept', { method: 'POST', body: JSON.stringify({ token }) });
  return result.channel;
}

export async function fetchChannelInvites(channelId) {
  const result = await backendFetch(`/channels/${encodeURIComponent(channelId)}/invites`);
  return Array.isArray(result?.invites) ? result.invites : [];
}

export async function revokeChannelInvite(channelId, inviteId) {
  return backendFetch(`/channels/${encodeURIComponent(channelId)}/invites/${encodeURIComponent(inviteId)}`, { method: 'DELETE' });
}

export async function subscribeToChannel(channelId) {
  return backendFetch(`/channels/${encodeURIComponent(channelId)}/subscribe`, { method: 'POST', body: '{}' });
}

export async function unsubscribeFromChannel(channelId) {
  return backendFetch(`/channels/${encodeURIComponent(channelId)}/subscribe`, { method: 'DELETE' });
}

export async function fetchChannelPosts(channelId, cursor = null) {
  const query = cursor?.created_at && cursor?.id
    ? `?beforeCreatedAt=${encodeURIComponent(cursor.created_at)}&beforeId=${encodeURIComponent(cursor.id)}`
    : '';
  return backendFetch(`/channels/${encodeURIComponent(channelId)}/posts${query}`);
}

export async function publishChannelPost(channelId, body) {
  const result = await backendFetch(`/channels/${encodeURIComponent(channelId)}/posts`, { method: 'POST', body: JSON.stringify({ body }) });
  return result.post;
}

export async function updateChannelPost(channelId, postId, body) {
  const result = await backendFetch(`/channels/${encodeURIComponent(channelId)}/posts/${encodeURIComponent(postId)}`, { method: 'PATCH', body: JSON.stringify({ body }) });
  return result.post;
}

export async function setChannelPostPinned(channelId, postId, pinned) {
  const result = await backendFetch(`/channels/${encodeURIComponent(channelId)}/posts/${encodeURIComponent(postId)}/pin`, { method: 'PUT', body: JSON.stringify({ pinned: Boolean(pinned) }) });
  return result.post;
}

export async function deleteChannelPost(channelId, postId) {
  return backendFetch(`/channels/${encodeURIComponent(channelId)}/posts/${encodeURIComponent(postId)}`, { method: 'DELETE' });
}

export async function setChannelPostReaction(channelId, postId, emoji) {
  const result = await backendFetch(`/channels/${encodeURIComponent(channelId)}/posts/${encodeURIComponent(postId)}/reaction`, { method: 'PUT', body: JSON.stringify({ emoji }) });
  return result;
}

export async function fetchChannelPostComments(channelId, postId) {
  const result = await backendFetch(`/channels/${encodeURIComponent(channelId)}/posts/${encodeURIComponent(postId)}/comments`);
  return Array.isArray(result?.comments) ? result.comments : [];
}

export async function publishChannelPostComment(channelId, postId, body) {
  const result = await backendFetch(`/channels/${encodeURIComponent(channelId)}/posts/${encodeURIComponent(postId)}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
  return result.comment;
}

export async function deleteChannelPostComment(channelId, postId, commentId) {
  return backendFetch(`/channels/${encodeURIComponent(channelId)}/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`, { method: 'DELETE' });
}

export async function deleteChannel(channelId) {
  return backendFetch(`/channels/${encodeURIComponent(channelId)}`, { method: 'DELETE' });
}

export async function fetchChannelModerators(channelId) {
  const result = await backendFetch(`/channels/${encodeURIComponent(channelId)}/moderators`);
  return Array.isArray(result?.members) ? result.members : [];
}

export async function appointChannelModerator(channelId, userId) {
  return backendFetch(`/channels/${encodeURIComponent(channelId)}/moderators`, { method: 'POST', body: JSON.stringify({ userId }) });
}

export async function removeChannelModerator(channelId, userId) {
  return backendFetch(`/channels/${encodeURIComponent(channelId)}/moderators/${encodeURIComponent(userId)}`, { method: 'DELETE' });
}


export async function reportChannelPost(channelId, postId, reason, details = '') {
  const result = await backendFetch(`/channels/${encodeURIComponent(channelId)}/posts/${encodeURIComponent(postId)}/reports`, { method: 'POST', body: JSON.stringify({ reason, details }) });
  return result.report;
}

export async function fetchChannelPostReports(channelId) {
  const result = await backendFetch(`/channels/${encodeURIComponent(channelId)}/reports`);
  return Array.isArray(result?.reports) ? result.reports : [];
}

export async function updateChannelPostReport(channelId, reportId, status) {
  return backendFetch(`/channels/${encodeURIComponent(channelId)}/reports/${encodeURIComponent(reportId)}`, { method: 'PATCH', body: JSON.stringify({ status }) });
}
