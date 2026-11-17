import { normalizeEmail, parseRecoveryCallback } from '../utils/authValidation';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { getOAuthRedirectUrl, getPasswordRecoveryRedirectUrl } from '../utils/oauthRedirect';
import { getSafeMessageSendError } from '../utils/safeMessagingError';
import { retryTransient } from '../utils/retry';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearDraftsForUser } from './drafts';
import { clearPinnedMessagesForUser } from './pinnedMessages';
import { clearPendingMessagesForUser } from './messageOutbox';
import { clearPendingAttachmentsForUser } from './attachmentOutbox';
import { clearStatusDraft } from '../utils/statusDraftStorage';
import { clearChannelPostDraftsForUser } from '../utils/channelDraftStorage';
import { clearSavedMessagesForUser } from './savedMessages';
import { clearChatFoldersForUser } from './chatFolders';
import { clearMemberFavoritesForUser } from '../utils/memberFavorites';
import { supabase, SUPABASE_ENABLED, SUPABASE_URL } from './supabaseClient';
import { backendFetch, BACKEND_ENABLED } from './backendClient';
import { getActiveVoipPushToken, getActiveApnsAlertToken } from './voipPushTokenState';
import { isMissingRpcFunction } from './rpcErrors';
import { cleanupExpoPushTokensForSignOut } from './pushTokenCleanup';
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
    username: row.username || null,
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
  const myLastReadAt = row.my_last_read_at ? new Date(row.my_last_read_at) : null;
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

  const { data, error } = await supabase.rpc('get_my_profile');
  if (error) throw error;
  const profile = Array.isArray(data) ? data[0] : data;
  if (!profile) throw new Error('Your profile is still being set up. Please try again.');
  const [resolved] = await resolveProfileAvatarUrls([profile]);
  return normalizeProfile(resolved || profile);
}

// Edits made in mock mode persist on mockUser for the session but
// don't survive an app restart — same honesty tradeoff as everything
// else that's mock-backed.
export async function updateProfile({ name, status, username }) {
  const normalizedUsername = username === undefined
    ? undefined
    : typeof username === 'string'
      ? username.trim().replace(/^@/, '').toLowerCase()
      : '';
  if (normalizedUsername !== undefined && !/^[a-z0-9_]{3,24}$/.test(normalizedUsername)) {
    throw new Error('Choose a username using 3–24 letters, numbers or underscores.');
  }

  if (!SUPABASE_ENABLED) {
    if (name !== undefined) mockUser.name = name;
    if (status !== undefined) mockUser.status = status;
    if (normalizedUsername !== undefined) mockUser.username = normalizedUsername;
    return mockUser;
  }

  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user?.id) throw new Error('Sign in to update your profile.');
  const { error } = await supabase
    .from('profiles')
    .update({ ...(name !== undefined && { name }), ...(status !== undefined && { status }), ...(normalizedUsername !== undefined && { username: normalizedUsername }) })
    .eq('id', authData.user.id);

  if (error?.code === '23505') throw new Error('That username is already taken. Try another one.');
  if (error) throw error;
  const savedProfile = await getCurrentUser();
  const profileMismatch = (name !== undefined && String(savedProfile?.name ?? '') !== String(name ?? ''))
    || (status !== undefined && String(savedProfile?.status ?? '') !== String(status ?? ''))
    || (normalizedUsername !== undefined
      && String(savedProfile?.username || '').trim().toLowerCase() !== normalizedUsername);
  if (profileMismatch) {
    throw new Error('Your profile changes could not be confirmed as saved. Please try again.');
  }
  return savedProfile;
}

const PROFILE_DETAIL_DEFAULTS = Object.freeze({
  about: '', occupation: '', location: '', website: '', birthday: null, pronouns: '',
  cover_image_url: null, cover_path: null, profile_visibility: 'everyone', show_location: false,
  show_occupation: false, show_website: true, show_birthday: false, show_pronouns: true,
  show_last_seen: false, show_online_status: true, show_read_receipts: true,
  photo_visibility: 'everyone', group_invite_permission: 'everyone',
  call_permission: 'everyone', status_audience: 'contacts',
});

export async function getMyProfileDetails() {
  if (!SUPABASE_ENABLED) return { ...PROFILE_DETAIL_DEFAULTS };
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) throw new Error('Sign in to edit your profile.');
  const { data, error } = await supabase.from('profile_details').select('*').eq('user_id', authData.user.id).maybeSingle();
  if (error) throw error;
  const details = { ...PROFILE_DETAIL_DEFAULTS, ...(data || {}) };
  details.cover_image_url = details.cover_path
    ? await getPrivateProfileCoverUrl(authData.user.id)
    : null;
  return details;
}

function getLegacyAvatarStoragePath(avatarUrl, userId) {
  if (typeof avatarUrl !== 'string' || !avatarUrl || !userId) return null;
  try {
    const parsed = new URL(avatarUrl);
    const marker = '/storage/v1/object/public/avatars/';
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex < 0) return null;
    const objectPath = decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length));
    if (!objectPath.startsWith(`${userId}/`) || objectPath.includes('..') || objectPath.includes('\\')) return null;
    return objectPath;
  } catch {
    return null;
  }
}

async function getOwnProfileRow() {
  const { data, error } = await supabase.rpc('get_my_profile');
  if (error) throw error;
  return Array.isArray(data) ? data[0] || null : data || null;
}

async function ensurePrivateAvatarCopy(userId, avatarUrl, currentAvatarPath) {
  if (typeof currentAvatarPath === 'string'
      && currentAvatarPath.startsWith(`${userId}/`)
      && !currentAvatarPath.includes('..')) {
    const { data: existingPrivateImage, error: privateReadError } = await supabase.storage.from('private-avatars').download(currentAvatarPath);
    if (!privateReadError && existingPrivateImage) return currentAvatarPath;
  }
  const legacyPath = getLegacyAvatarStoragePath(avatarUrl, userId);
  if (!legacyPath) {
    if (avatarUrl) throw new Error('Your existing profile photo could not be secured. Upload a new photo before changing its visibility.');
    return null;
  }
  const { data: image, error: downloadError } = await supabase.storage.from('avatars').download(legacyPath);
  if (downloadError || !image) throw downloadError || new Error('Could not prepare your existing profile photo for private access.');
  const { error: uploadError } = await supabase.storage.from('private-avatars').upload(legacyPath, image, {
    upsert: true,
    contentType: image.type || 'image/jpeg',
    cacheControl: '0',
  });
  if (uploadError) throw uploadError;
  const { error: detailsError } = await supabase.from('profile_details')
    .upsert({ user_id: userId, avatar_path: legacyPath }, { onConflict: 'user_id' });
  if (detailsError) throw detailsError;
  return legacyPath;
}

async function removeLegacyPublicAvatar(userId, avatarUrl) {
  const bucket = supabase.storage.from('avatars');
  const paths = new Set();
  const legacyPath = getLegacyAvatarStoragePath(avatarUrl, userId);
  if (legacyPath) paths.add(legacyPath);

  // Remove every legacy object owned by this profile, not only the current
  // pointer. Older uploads could otherwise remain publicly reachable.
  let offset = 0;
  while (true) {
    const { data, error } = await bucket.list(userId, { limit: 1000, offset });
    if (error) throw error;
    const entries = Array.isArray(data) ? data : [];
    for (const entry of entries) {
      if (entry?.id && typeof entry.name === 'string' && entry.name) {
        paths.add(`${userId}/${entry.name}`);
      }
    }
    if (entries.length < 1000) break;
    offset += entries.length;
  }

  const allPaths = [...paths];
  for (let start = 0; start < allPaths.length; start += 1000) {
    const { error } = await bucket.remove(allPaths.slice(start, start + 1000));
    if (error) throw error;
  }
  const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId);
  if (error) throw error;
}

async function ensureLegacyPublicAvatar(userId, avatarUrl, privatePath) {
  const existingPath = getLegacyAvatarStoragePath(avatarUrl, userId);
  if (existingPath) {
    const { data: existingImage, error: existingError } = await supabase.storage.from('avatars').download(existingPath);
    if (!existingError && existingImage) return avatarUrl;
  }
  if (!privatePath || !privatePath.startsWith(`${userId}/`) || privatePath.includes('..')) return null;
  const { data: image, error: downloadError } = await supabase.storage.from('private-avatars').download(privatePath);
  if (downloadError || !image) throw downloadError || new Error('Could not prepare your profile photo for public visibility.');
  const { error: uploadError } = await supabase.storage.from('avatars').upload(privatePath, image, {
    upsert: true,
    contentType: image.type || 'image/jpeg',
  });
  if (uploadError) throw uploadError;
  const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(privatePath);
  const publicUrl = publicUrlData?.publicUrl || null;
  if (!publicUrl) throw new Error('Could not create the public profile photo URL.');
  const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);
  if (updateError) throw updateError;
  return publicUrl;
}

async function syncAvatarVisibility(userId, nextProfileVisibility, nextPhotoVisibility) {
  const [profile, detailsResult] = await Promise.all([
    getOwnProfileRow(),
    supabase.from('profile_details').select('avatar_path').eq('user_id', userId).maybeSingle(),
  ]);
  if (detailsResult.error) throw detailsResult.error;
  const currentAvatarPath = detailsResult.data?.avatar_path || null;
  const needsPrivate = nextProfileVisibility !== 'everyone' || nextPhotoVisibility !== 'everyone';
  if (needsPrivate) {
    await ensurePrivateAvatarCopy(userId, profile?.avatar_url, currentAvatarPath);
    await removeLegacyPublicAvatar(userId, profile?.avatar_url);
    return;
  }
  await ensureLegacyPublicAvatar(userId, profile?.avatar_url, currentAvatarPath);
}

export async function updateMyProfileDetails(details = {}) {
  if (!SUPABASE_ENABLED) return { ...PROFILE_DETAIL_DEFAULTS, ...details };
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) throw new Error('Sign in to edit your profile.');
  // cover_image_url is a temporary signed URL for rendering only.
  // Persist only cover_path; never write a signed or public URL to the row.
  const allowed = Object.keys(PROFILE_DETAIL_DEFAULTS).filter((key) => key !== 'cover_image_url');
  const row = { user_id: authData.user.id };
  for (const key of allowed) if (Object.prototype.hasOwnProperty.call(details, key)) row[key] = details[key];
  if (typeof row.website === 'string' && row.website.trim()) {
    const candidate = /^[a-z][a-z0-9+.-]*:/i.test(row.website.trim()) ? row.website.trim() : `https://${row.website.trim()}`;
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) throw new Error('Enter a valid website URL.');
    row.website = parsed.href;
  }
  if (row.birthday === '') row.birthday = null;
  for (const key of ['profile_visibility', 'photo_visibility']) {
    if (row[key] !== undefined && !['everyone', 'contacts', 'nobody'].includes(row[key])) {
      throw new Error('Choose a valid profile visibility setting.');
    }
  }
  const { data: currentDetails, error: currentDetailsError } = await supabase
    .from('profile_details')
    .select('profile_visibility,photo_visibility')
    .eq('user_id', authData.user.id)
    .maybeSingle();
  if (currentDetailsError) throw currentDetailsError;
  const currentProfileVisibility = currentDetails?.profile_visibility ?? 'everyone';
  const currentPhotoVisibility = currentDetails?.photo_visibility ?? 'everyone';
  const nextProfileVisibility = row.profile_visibility ?? currentProfileVisibility;
  const nextPhotoVisibility = row.photo_visibility ?? currentPhotoVisibility;
  const visibilityChanged = nextProfileVisibility !== currentProfileVisibility
    || nextPhotoVisibility !== currentPhotoVisibility;
  const needsPrivateAvatar = nextProfileVisibility !== 'everyone' || nextPhotoVisibility !== 'everyone';

  // Public storage objects are removed before a private transition. The
  // database RPC then verifies the private copy and blocks legacy direct writes.
  if (needsPrivateAvatar) {
    await syncAvatarVisibility(authData.user.id, nextProfileVisibility, nextPhotoVisibility);
  }

  const rowToSave = { ...row };
  if (visibilityChanged) {
    delete rowToSave.profile_visibility;
    delete rowToSave.photo_visibility;
  }
  const { data, error } = await supabase.from('profile_details').upsert(rowToSave, { onConflict: 'user_id' }).select('*').single();
  if (error) throw error;

  if (visibilityChanged) {
    const { error: visibilityError } = await supabase.rpc('update_my_profile_visibility', {
      p_profile_visibility: nextProfileVisibility,
      p_photo_visibility: nextPhotoVisibility,
    });
    if (visibilityError) throw visibilityError;
  }

  // For a public transition, make the preference public before creating the
  // public object. A failed copy leaves no public URL or object to expose.
  if (!needsPrivateAvatar) {
    await syncAvatarVisibility(authData.user.id, nextProfileVisibility, nextPhotoVisibility);
  }
  const saved = {
    ...PROFILE_DETAIL_DEFAULTS,
    ...data,
    profile_visibility: nextProfileVisibility,
    photo_visibility: nextPhotoVisibility,
  };
  saved.cover_image_url = saved.cover_path
    ? await getPrivateProfileCoverUrl(authData.user.id)
    : null;
  return saved;
}

export async function getPublicProfileDetails(userId) {
  if (!SUPABASE_ENABLED || !userId) return {};
  const { data, error } = await supabase.rpc('get_public_profile_details', { p_user_id: userId });
  if (error) throw error;
  return data || {};
}

async function readUploadArrayBuffer(source) {
  if (source && typeof source !== 'string' && typeof source.arrayBuffer === 'function') return source.arrayBuffer();
  if (typeof source !== 'string' || !source) throw new Error('The selected media file is unavailable.');
  const response = await fetch(source);
  if (!response.ok) throw new Error('Could not read the selected media file.');
  return response.arrayBuffer();
}

const MAX_PROFILE_MEDIA_BYTES = 10 * 1024 * 1024;

function assertProfileMediaSize(arrayBuffer) {
  if (arrayBuffer?.byteLength > MAX_PROFILE_MEDIA_BYTES) {
    const error = new Error('Profile pictures and covers must be 10 MiB or smaller.');
    error.code = 'FILE_TOO_LARGE';
    throw error;
  }
}

export async function uploadProfileCover(localUri, mimeType = 'image/jpeg') {
  if (!SUPABASE_ENABLED) return { path: null, url: localUri };
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) throw new Error('Not signed in');
  const extension = (mimeType.split('/')[1] || 'jpg').replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'jpg';
  const objectPath = `${userId}/cover-${Date.now()}.${extension}`;
  const arrayBuffer = await readUploadArrayBuffer(localUri);
  assertProfileMediaSize(arrayBuffer);
  const { error: uploadError } = await supabase.storage
    .from('private-avatars')
    .upload(objectPath, arrayBuffer, { contentType: mimeType, upsert: true });
  if (uploadError) throw uploadError;
  const { data: signed, error: signError } = await supabase.storage
    .from('private-avatars')
    .createSignedUrl(objectPath, 3600);
  if (signError) throw signError;
  return { path: objectPath, url: signed?.signedUrl || null };
}

// Uploads a picked photo to the "avatars" bucket and points the
// profile at it. mimeType comes from whatever picked the file
// (expo-image-picker) — api.js stays free of Expo-specific APIs so
// screens are the only place that import them.
export async function uploadAvatar(localUri, mimeType = 'image/jpeg') {
  if (!SUPABASE_ENABLED) {
    mockUser.avatarUrl = localUri;
    return localUri;
  }

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) throw new Error('Not signed in');
  const safeMimeType = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(String(mimeType).toLowerCase())
    ? String(mimeType).toLowerCase()
    : 'image/jpeg';
  const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif' })[safeMimeType];
  const path = `${userId}/avatar-${Date.now()}.${extension}`;
  const arrayBuffer = await readUploadArrayBuffer(localUri);
  assertProfileMediaSize(arrayBuffer);
  const [profile, detailsResult] = await Promise.all([
    getOwnProfileRow(),
    supabase.from('profile_details').select('profile_visibility,photo_visibility').eq('user_id', userId).maybeSingle(),
  ]);
  if (detailsResult.error) throw detailsResult.error;
  const needsPrivate = (detailsResult.data?.profile_visibility || 'everyone') !== 'everyone'
    || (detailsResult.data?.photo_visibility || 'everyone') !== 'everyone';
  const { error: privateUploadError } = await supabase.storage.from('private-avatars')
    .upload(path, arrayBuffer, { contentType: safeMimeType, upsert: true });
  if (privateUploadError) throw privateUploadError;

  let avatarUrl = null;
  if (!needsPrivate) {
    const { error: legacyUploadError } = await supabase.storage.from('avatars')
      .upload(path, arrayBuffer, { contentType: safeMimeType, upsert: true, cacheControl: '0' });
    if (legacyUploadError) throw legacyUploadError;
    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
    avatarUrl = publicUrlData?.publicUrl || null;
    if (!avatarUrl) throw new Error('Could not create the public profile photo URL.');
  } else {
    await removeLegacyPublicAvatar(userId, profile?.avatar_url);
  }

  const { error: detailsError } = await supabase.from('profile_details')
    .upsert({ user_id: userId, avatar_path: path }, { onConflict: 'user_id' });
  if (detailsError) throw detailsError;
  const { error: updateError } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId);
  if (updateError) throw updateError;

  if (avatarUrl) return avatarUrl;
  return await getPrivateProfileAvatarUrl(userId);
}

// Resolves a private cover only after the database checks profile visibility,
// photo visibility, contact relationship and bidirectional blocks.
export async function getPrivateProfileCoverUrl(userId, expiresIn = 3600) {
  if (!SUPABASE_ENABLED || !userId) return null;
  const { data: coverPath, error } = await supabase.rpc(
    'get_visible_profile_cover_path',
    { p_user_id: userId },
  );
  if (error) throw error;
  if (!coverPath || typeof coverPath !== 'string'
      || !coverPath.startsWith(`${userId}/`) || coverPath.includes('..')) return null;
  const { data: signed, error: signError } = await supabase.storage
    .from('private-avatars')
    .createSignedUrl(coverPath, expiresIn);
  if (signError) throw signError;
  return signed?.signedUrl || null;
}

// Resolves a private avatar only after Storage RLS evaluates the viewer's
// photo_visibility/contact/block relationship. The public legacy URL remains
// the fallback until every client has completed the staged cutover.
export async function getPrivateProfileAvatarUrl(userId, expiresIn = 3600) {
  if (!SUPABASE_ENABLED || !userId) return null;
  const { data: avatarPath, error } = await supabase.rpc('get_visible_profile_avatar_path', { p_user_id: userId });
  if (error) throw error;
  if (!avatarPath || typeof avatarPath !== 'string' || !avatarPath.startsWith(`${userId}/`) || avatarPath.includes('..')) return null;
  const { data: signed, error: signError } = await supabase.storage.from('private-avatars').createSignedUrl(avatarPath, expiresIn);
  if (signError) throw signError;
  return signed?.signedUrl || null;
}

// Resolves avatars in one bounded authorization query and one Storage signing
// request. A hidden profile never falls back to a public legacy URL.
export async function resolveProfileAvatarUrls(profiles = [], expiresIn = 3600) {
  if (!SUPABASE_ENABLED || !Array.isArray(profiles) || profiles.length === 0) return profiles || [];
  const ids = [...new Set(profiles.map((profile) => profile?.id).filter(Boolean))];
  if (!ids.length) return profiles;
  const accessRows = [];
  for (let start = 0; start < ids.length; start += 500) {
    const { data, error } = await supabase.rpc('get_visible_profile_avatar_paths', { p_user_ids: ids.slice(start, start + 500) });
    if (error) {
      if (isMissingRpcFunction(error, 'get_visible_profile_avatar_paths')) {
        // Fail closed during an incomplete backend rollout: public legacy URLs
        // cannot prove that the current viewer is allowed to see the photo.
        return profiles.map((profile) => ({ ...profile, avatar_url: null, avatarUrl: null }));
      }
      throw error;
    }
    accessRows.push(...(Array.isArray(data) ? data : []));
  }
  const accessById = new Map(accessRows.map((entry) => [entry.user_id, entry]));
  const pathEntries = accessRows.filter((entry) =>
    entry?.can_view && typeof entry.avatar_path === 'string'
    && entry.avatar_path.startsWith(`${entry.user_id}/`)
    && !entry.avatar_path.includes('..')
  );
  const paths = [...new Set(pathEntries.map((entry) => entry.avatar_path))];
  let signedByPath = new Map();
  if (paths.length) {
    const { data: signedRows, error: signError } = await supabase.storage.from('private-avatars').createSignedUrls(paths, expiresIn);
    if (signError) throw signError;
    signedByPath = new Map((signedRows || []).filter((entry) => entry?.signedUrl).map((entry) => [entry.path, entry.signedUrl]));
  }
  return profiles.map((profile) => {
    const access = accessById.get(profile?.id);
    if (!access?.can_view) return { ...profile, avatar_url: null, avatarUrl: null };
    const signedUrl = access.avatar_path ? signedByPath.get(access.avatar_path) : null;
    const legacyUrl = access.requires_private ? null : (profile.avatar_url || profile.avatarUrl || null);
    const avatarUrl = signedUrl || legacyUrl;
    return { ...profile, avatar_url: avatarUrl, avatarUrl };
  });
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
    options: { data: { name }, emailRedirectTo: getOAuthRedirectUrl() },
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
  const { error } = await supabase.auth.resend({ type: 'signup', email: normalizedEmail, options: { emailRedirectTo: getOAuthRedirectUrl() } });
  if (error) throw error;
  return { requested: true };
}

export async function requestPasswordReset(email) {
  if (!SUPABASE_ENABLED) return { mock: true };
  const normalizedEmail = normalizeEmail(email);
  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    // Add the hosted web origin and native scheme to Supabase Auth's redirect
    // allowlist. The browser callback is required for desktop recovery links.
    redirectTo: getPasswordRecoveryRedirectUrl(),
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
  // On web, Supabase JS consumes the PKCE code from the hosted callback URL
  // during client initialization. Verify that this is our same-origin recovery
  // route and then update only through the currently authenticated recovery session.
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    let parsedWebCallback = null;
    try { parsedWebCallback = new URL(callbackUrl); } catch (_) {}
    const isSameOriginRecovery = parsedWebCallback
      && parsedWebCallback.origin === window.location.origin
      && parsedWebCallback.searchParams.get('reset-password') === '1';
    if (isSameOriginRecovery) {
      const { data: currentSession, error: currentSessionError } = await supabase.auth.getSession();
      if (currentSessionError || !currentSession?.session) throw new Error('The recovery link is expired or invalid. Request a new one.');
      const { error: webUpdateError } = await supabase.auth.updateUser({ password: newPassword });
      if (webUpdateError) throw webUpdateError;
      return { updated: true };
    }
  }
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


// Permanently delete the authenticated account. Email/password users can
// reauthenticate with their password; OAuth users reauthenticate with their
// provider first. The backend independently enforces a fresh JWT auth_time.
export async function deleteAccount(currentPassword) {
  if (!SUPABASE_ENABLED || !BACKEND_ENABLED) {
    throw new Error('Account deletion requires a configured Supabase project and backend.');
  }
  if (currentPassword != null && typeof currentPassword !== 'string') {
    throw new Error('The password verification value is invalid.');
  }
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user?.email) {
    throw new Error('Your session has expired. Sign in again before deleting your account.');
  }
  if (currentPassword) {
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(userData.user.email),
      password: currentPassword,
    });
    if (reauthError) throw new Error('Password verification failed. Check your password and try again.');
  }

  try {
    await backendFetch('/account/delete', {
      method: 'POST',
      body: JSON.stringify({ confirmation: 'DELETE' }),
    });
  } catch (error) {
    if (/verify your password again|verify your password/i.test(error?.message || '')) {
      throw new Error('Your session is no longer recent enough. Re-verify with your sign-in provider, return here, and confirm deletion within five minutes.');
    }
    throw error;
  }
  // Account is already removed server-side. Clear this account's drafts,
  // pins, saved messages, folders, status/channel drafts and pending outbox records before dropping
  // the local session. Cleanup is best-effort, but its result is reported so
  // the user can clear app storage if the device storage adapter failed.
  const cleanupResults = await Promise.all([
    clearDraftsForUser(userData.user.id),
    clearPinnedMessagesForUser(userData.user.id),
    clearPendingMessagesForUser(userData.user.id),
    clearPendingAttachmentsForUser(userData.user.id),
    clearStatusDraft(AsyncStorage, userData.user.id),
    clearChannelPostDraftsForUser(AsyncStorage, userData.user.id),
    clearSavedMessagesForUser(userData.user.id),
    clearChatFoldersForUser(userData.user.id),
    clearMemberFavoritesForUser(AsyncStorage, userData.user.id),
  ].map((cleanup) => cleanup.catch(() => false)));
  const localCleanupComplete = cleanupResults.every(Boolean);
  let localSessionCleared = true;
  try {
    const signOutResult = await supabase.auth.signOut({ scope: 'local' });
    localSessionCleared = !signOutResult?.error;
  } catch {
    localSessionCleared = false;
  }
  return { deleted: true, localCleanupComplete: localCleanupComplete && localSessionCleared };
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

async function removeExpoPushTokensBeforeSignOut(scope) {
  if (!SUPABASE_ENABLED || !supabase) return;
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    const userId = authData?.user?.id;
    if (!userId) return;

    await cleanupExpoPushTokensForSignOut({
      supabase,
      storage: AsyncStorage,
      userId,
      scope,
      resolveExpoPushToken: async () => {
        // Migration fallback for older app installs that predate the local
        // token cache. Never broaden local cleanup if resolution fails.
        if (!Device.isDevice) return null;
        const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
        if (!projectId) return null;
        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
        return token || null;
      },
    });
  } catch (error) {
    // Keep the local token cache on failure so a later sign-out can retry.
    // Never fall back to deleting all devices for a local sign-out.
    console.warn('[push] Expo token cleanup during sign-out failed:', error?.message || error);
  }
}

