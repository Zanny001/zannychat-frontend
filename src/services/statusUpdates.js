import { supabase, SUPABASE_ENABLED } from './supabaseClient';
import { normalizeStatusText, statusExpiryFrom, STATUS_TEXT_LIMIT, normalizeStatusExpiryHours } from '../utils/statusRules';
import { filterVisibleStatusRows } from '../utils/statusVisibility';
import { normalizeStatusAudience } from '../utils/statusAudience';
import { assertStatusPrivacyDataAvailable } from '../utils/statusPrivacyData';
import { getSafeExpiredStatusMediaPaths } from '../utils/statusMediaCleanup';
import { isSafeStatusMediaPath } from '../utils/statusMediaPath';
export { normalizeStatusText, statusExpiryFrom, STATUS_TEXT_LIMIT, normalizeStatusExpiryHours };

export function subscribeToStatusChanges(onChange) {
  if (!SUPABASE_ENABLED || !supabase || typeof onChange !== 'function') return () => {};
  const channel = supabase.channel('status-updates-live-feed')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'status_updates' }, () => onChange())
    .subscribe();
  return () => { supabase.removeChannel(channel).catch(() => {}); };
}

async function cleanupExpiredOwnStatuses(userId) {
  // Bounded batches avoid a long startup pause while gradually clearing large backlogs.
  // Remove media before deleting rows: if storage cleanup fails, keep the expired row
  // so a later visit can retry rather than permanently orphaning its media object.
  const now = new Date().toISOString();
  const maxBatchesPerVisit = 10;
  for (let batch = 0; batch < maxBatchesPerVisit; batch += 1) {
    const { data: expired, error: expiredError } = await supabase.from('status_updates')
      .select('id,user_id,media_path').eq('user_id', userId).lte('expires_at', now).order('expires_at', { ascending: true }).limit(100);
    if (expiredError) {
      console.warn('Expired status lookup failed');
      return;
    }
    if (!expired?.length) return;
    // Only remove paths matching this owner's status ID and known media naming rules.
    // Malformed legacy metadata must never become an arbitrary storage deletion target.
    const paths = getSafeExpiredStatusMediaPaths(expired, userId);
    if (paths.length) {
      const { error: storageError } = await supabase.storage.from('status-media').remove(paths);
      if (storageError) {
        console.warn('Expired status media cleanup failed; rows retained for retry');
        return;
      }
    }
    const { error: deleteError } = await supabase.from('status_updates').delete()
      .eq('user_id', userId).in('id', expired.map((row) => row.id));
    if (deleteError) {
      console.warn('Expired status row cleanup failed; cleanup will retry on a later visit');
      return;
    }
    if (expired.length < 100) return;
  }
}

export async function listActiveStatuses() {
  if (!SUPABASE_ENABLED || !supabase) throw new Error('Status updates require a configured account connection.');
  const { data: auth } = await supabase.auth.getUser();
  if (auth?.user?.id) {
    try { await cleanupExpiredOwnStatuses(auth.user.id); }
    catch { console.warn('Expired status cleanup could not complete'); }
  }
  const { data, error } = await supabase.from('status_updates').select('id,user_id,text,audience,media_kind,media_path,created_at,expires_at').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false });
  if (error) throw error;
  const userId = auth?.user?.id;
  let selectedStatusIds = [];
  if (userId) {
    const { data: recipientRows, error: recipientError } = await supabase.from('status_audience_recipients').select('status_id').eq('recipient_id', userId);
    assertStatusPrivacyDataAvailable({ recipientError });
    selectedStatusIds = (recipientRows || []).map((row) => row.status_id);
  }
  let mutedOwners = new Set();
  if (userId) {
    const { data: mutedRows, error: mutedError } = await supabase.from('muted_status_users').select('muted_user_id').eq('user_id', userId);
    assertStatusPrivacyDataAvailable({ mutedError });
    mutedOwners = new Set((mutedRows || []).map((row) => row.muted_user_id));
  }
  let excludedOwners = new Set();
  if (userId) {
    const { data: excludedRows, error: excludedError } = await supabase.from('status_excluded_users').select('owner_id').eq('excluded_user_id', userId);
    assertStatusPrivacyDataAvailable({ excludedError });
    excludedOwners = new Set((excludedRows || []).map((row) => row.owner_id));
  }
  // Defense in depth: never render another user's private-only status even if a query/RLS policy is misconfigured.
  // Supabase RLS must still enforce this rule server-side; this filter is not a security boundary.
  const rows = filterVisibleStatusRows(data || [], userId, [...mutedOwners], [...excludedOwners], selectedStatusIds);
  const ownedIds = rows.filter((row) => row.user_id === userId).map((row) => row.id);
  const counts = new Map();
  // Aggregate receipts in PostgreSQL instead of downloading every viewer row.
  // Chunk IDs to keep RPC payloads bounded and avoid PostgREST row-cap undercounts.
  for (let offset = 0; offset < ownedIds.length; offset += 200) {
    const statusIds = ownedIds.slice(offset, offset + 200);
    const { data: viewCounts, error: viewCountsError } = await supabase.rpc('get_own_status_view_counts', { p_status_ids: statusIds });
    if (viewCountsError) {
      throw new Error('Could not load status view counts. Please refresh and try again.');
    }
    for (const item of viewCounts || []) {
      const count = Number(item.view_count);
      counts.set(item.status_id, Number.isSafeInteger(count) && count >= 0 ? count : 0);
    }
  }
  return Promise.all(rows.map(async (row) => {
    const isOwn = row.user_id === userId;
    const base = { ...row, is_own: isOwn, view_count: isOwn ? (counts.get(row.id) || 0) : undefined };
    if (!['image', 'video'].includes(row.media_kind) || !row.media_path) return base;
    // Never mint a signed URL for a path that does not belong to this exact status row.
    if (!isSafeStatusMediaPath(row)) return { ...base, media_url: null };
    const { data: signed, error: signError } = await supabase.storage.from('status-media').createSignedUrl(row.media_path, 300);
    return { ...base, media_url: signError ? null : signed?.signedUrl || null };
  }));
}


export async function refreshStatusMediaUrl(statusId) {
  if (!SUPABASE_ENABLED || !supabase) throw new Error('Status updates require a configured account connection.');
  if (!statusId) throw new Error('Choose a valid status.');
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user?.id) throw new Error('Sign in to view status updates.');
  // Read through RLS first: the server must confirm this viewer can still access the active status.
  const { data: row, error: rowError } = await supabase.from('status_updates')
    .select('id,user_id,media_kind,media_path,expires_at')
    .eq('id', statusId).gt('expires_at', new Date().toISOString()).maybeSingle();
  if (rowError) throw rowError;
  if (!row || !isSafeStatusMediaPath(row)) {
    throw new Error('This status media is no longer available. Refresh the status feed and try again.');
  }
  const { data: signed, error: signError } = await supabase.storage.from('status-media').createSignedUrl(row.media_path, 300);
  if (signError || !signed?.signedUrl) throw new Error('Could not refresh this status media. Check your connection and try again.');
  return signed.signedUrl;
}

export async function recordStatusView(statusId) {
  if (!SUPABASE_ENABLED || !supabase) throw new Error('Status updates require a configured account connection.');
  if (!statusId) throw new Error('Choose a valid status.');
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user?.id) throw new Error('Sign in to view status updates.');
  const { error } = await supabase.from('status_views').insert({ status_id: statusId, viewer_id: auth.user.id });
  // Unique constraint means repeat opens count only once.
  if (error && error.code !== '23505') throw error;
}

function normalizeAudience(audience, selectedContactIds = []) {
  return normalizeStatusAudience(audience, selectedContactIds);
}

async function saveStatusAudienceRecipients(statusId, selectedContactIds, ownerId) {
  if (!selectedContactIds.length) return;
  const rows = selectedContactIds.map((recipient_id) => ({ status_id: statusId, owner_id: ownerId, recipient_id }));
  const { error } = await supabase.from('status_audience_recipients').insert(rows);
  if (error) {
    await supabase.from('status_updates').delete().eq('id', statusId).eq('user_id', ownerId);
    throw new Error('Could not save the selected audience. The status was not published. Please try again.');
  }
}

async function createStatusRecord(text, audience, mediaKind, expiryHours) {
  const { data, error } = await supabase.rpc('create_status_update', {
    p_text: text || null, p_audience: audience, p_media_kind: mediaKind || null,
    p_expiry_hours: normalizeStatusExpiryHours(expiryHours),
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) throw new Error('The status could not be created. Please try again.');
  return row;
}

async function readPickedStatusBlob(asset) {
  if (asset?.file && typeof asset.file.arrayBuffer === 'function') return asset.file;
  if (!asset?.uri) throw new Error('Choose a media file first.');
  const response = await fetch(asset.uri);
  if (!response.ok) throw new Error('Could not read the selected media file.');
  return response.blob();
}

export async function publishTextStatus(text, audience = 'contacts', selectedContactIds = [], expiryHours = 24) {
  const normalized = normalizeStatusText(text);
  if (!normalized) throw new Error('Write a status before publishing.');
  if (normalized.length > STATUS_TEXT_LIMIT) throw new Error(`Status must be ${STATUS_TEXT_LIMIT} characters or fewer.`);
  const selectedIds = normalizeAudience(audience, selectedContactIds);
  if (!SUPABASE_ENABLED || !supabase) throw new Error('Status updates require a configured account connection.');
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user?.id) throw new Error('Sign in to publish a status.');
  const row = await createStatusRecord(normalized, audience, null, expiryHours);
  await saveStatusAudienceRecipients(row.id, selectedIds, auth.user.id);
  return { ...row, is_own: true };
}

export async function publishPhotoStatus(asset, caption = '', audience = 'contacts', selectedContactIds = [], expiryHours = 24) {
  if (!SUPABASE_ENABLED || !supabase) throw new Error('Status updates require a configured account connection.');
  if (!asset?.uri && !asset?.file) throw new Error('Choose a photo first.');
  const selectedIds = normalizeAudience(audience, selectedContactIds);
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user?.id) throw new Error('Sign in to publish a status.');
  const blob = await readPickedStatusBlob(asset);
  if (!blob || blob.size < 1 || blob.size > 10 * 1024 * 1024) throw new Error('Photo must be smaller than 10 MB.');
  const mime = asset.mimeType || blob.type || 'image/jpeg';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) throw new Error('Choose a JPG, PNG, or WebP photo.');
  const captionText = String(caption || '').trim().slice(0, STATUS_TEXT_LIMIT);
  const row = await createStatusRecord(captionText, audience, 'image', expiryHours);
  await saveStatusAudienceRecipients(row.id, selectedIds, auth.user.id);
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const path = `${auth.user.id}/${row.id}/photo.${ext}`;
  const { error: updateError } = await supabase.from('status_updates').update({ media_path: path }).eq('id', row.id).eq('user_id', auth.user.id);
  if (updateError) { await supabase.from('status_updates').delete().eq('id', row.id); throw updateError; }
  const bytes = await blob.arrayBuffer();
  const { error: uploadError } = await supabase.storage.from('status-media').upload(path, bytes, { contentType: mime, upsert: false });
  if (uploadError) { await supabase.from('status_updates').delete().eq('id', row.id); throw uploadError; }
  const { data: signed, error: signError } = await supabase.storage.from('status-media').createSignedUrl(path, 300);
  if (signError) { await supabase.storage.from('status-media').remove([path]); await supabase.from('status_updates').delete().eq('id', row.id); throw signError; }
  return { ...row, is_own: true, text: captionText || null, media_path: path, media_url: signed.signedUrl };
}

export async function publishVideoStatus(asset, caption = '', audience = 'contacts', selectedContactIds = [], expiryHours = 24) {
  if (!SUPABASE_ENABLED || !supabase) throw new Error('Status updates require a configured account connection.');
  if (!asset?.uri && !asset?.file) throw new Error('Choose a video first.');
  const selectedIds = normalizeAudience(audience, selectedContactIds);
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user?.id) throw new Error('Sign in to publish a status.');
  const blob = await readPickedStatusBlob(asset);
  if (!blob || blob.size < 1 || blob.size > 50 * 1024 * 1024) throw new Error('Video must be smaller than 50 MB.');
  const mime = asset.mimeType || blob.type || 'video/mp4';
  if (mime !== 'video/mp4') throw new Error('Choose an MP4 video. Other video formats are not supported yet.');
  const captionText = String(caption || '').trim().slice(0, STATUS_TEXT_LIMIT);
  const row = await createStatusRecord(captionText, audience, 'video', expiryHours);
  await saveStatusAudienceRecipients(row.id, selectedIds, auth.user.id);
  const path = `${auth.user.id}/${row.id}/video.mp4`;
  const { error: updateError } = await supabase.from('status_updates').update({ media_path: path }).eq('id', row.id).eq('user_id', auth.user.id);
  if (updateError) { await supabase.from('status_updates').delete().eq('id', row.id); throw updateError; }
  const bytes = await blob.arrayBuffer();
  const { error: uploadError } = await supabase.storage.from('status-media').upload(path, bytes, { contentType: mime, upsert: false });
  if (uploadError) { await supabase.from('status_updates').delete().eq('id', row.id); throw uploadError; }
  const { data: signed, error: signError } = await supabase.storage.from('status-media').createSignedUrl(path, 300);
  if (signError) { await supabase.storage.from('status-media').remove([path]); await supabase.from('status_updates').delete().eq('id', row.id); throw signError; }
  return { ...row, is_own: true, text: captionText || null, media_path: path, media_url: signed.signedUrl };
}

export async function deleteStatus(statusId) {
  if (!SUPABASE_ENABLED || !supabase) throw new Error('Status updates require a configured account connection.');
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user?.id) throw new Error('Sign in to delete a status.');
  const { data: row, error: readError } = await supabase.from('status_updates')
    .select('id,user_id,media_kind,media_path').eq('id', statusId).eq('user_id', auth.user.id).maybeSingle();
  if (readError) throw readError;
  if (!row) throw new Error('This status is unavailable or you do not have permission to delete it.');
  const safeMediaPath = isSafeStatusMediaPath(row) ? row.media_path : null;
  // For a validated object, clean storage first. If storage rejects the removal,
  // retain the row so the user can retry instead of silently orphaning media.
  // Invalid legacy paths are never used as deletion targets.
  if (safeMediaPath) {
    const { error: mediaError } = await supabase.storage.from('status-media').remove([safeMediaPath]);
    if (mediaError) throw new Error('Could not remove this status media. The status was kept so you can retry.');
  }
  const { error } = await supabase.from('status_updates').delete().eq('id', statusId).eq('user_id', auth.user.id);
  if (error) throw error;
}

export const STATUS_REACTIONS = ['❤️', '😂', '😮', '😢', '👏', '🔥'];

export async function listStatusReactions(statusIds) {
  if (!SUPABASE_ENABLED || !supabase) throw new Error('Status updates require a configured account connection.');
  const ids = [...new Set((statusIds || []).filter(Boolean))];
  if (!ids.length) return {};
  const { data: auth } = await supabase.auth.getUser();
  const viewerId = auth?.user?.id;
  const { data, error } = await supabase.from('status_reactions').select('status_id,viewer_id,reaction').in('status_id', ids);
  if (error) throw error;
  const result = {};
  for (const row of data || []) {
    const item = result[row.status_id] || { counts: {}, mine: null };
    item.counts[row.reaction] = (item.counts[row.reaction] || 0) + 1;
    if (row.viewer_id === viewerId) item.mine = row.reaction;
    result[row.status_id] = item;
  }
  return result;
}

export async function reactToStatus(statusId, reaction) {
  if (!SUPABASE_ENABLED || !supabase) throw new Error('Status updates require a configured account connection.');
  if (!statusId || !STATUS_REACTIONS.includes(reaction)) throw new Error('Choose a valid status reaction.');
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user?.id) throw new Error('Sign in to react to a status.');
  const { error } = await supabase.from('status_reactions').upsert({ status_id: statusId, viewer_id: auth.user.id, reaction, updated_at: new Date().toISOString() }, { onConflict: 'status_id,viewer_id' });
  if (error) throw error;
}

export async function removeStatusReaction(statusId) {
  if (!SUPABASE_ENABLED || !supabase) throw new Error('Status updates require a configured account connection.');
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user?.id) throw new Error('Sign in to remove a reaction.');
  const { error } = await supabase.from('status_reactions').delete().eq('status_id', statusId).eq('viewer_id', auth.user.id);
  if (error) throw error;
}


export async function listStatusReplies(statusId, { before = null, limit = 30 } = {}) {
  if (!SUPABASE_ENABLED || !supabase) throw new Error('Status updates require a configured account connection.');
  if (!statusId) throw new Error('Choose a valid status.');
  const pageSize = Number.isSafeInteger(limit) ? Math.max(1, Math.min(limit, 50)) : 30;
  let query = supabase.from('status_replies').select('id,status_id,sender_id,body,created_at')
    .eq('status_id', statusId).order('created_at', { ascending: false }).limit(pageSize + 1);
  if (before) {
    const cursorDate = new Date(before);
    if (Number.isNaN(cursorDate.getTime())) throw new Error('Invalid status reply pagination cursor.');
    query = query.lt('created_at', cursorDate.toISOString());
  }
  const { data, error } = await query;
  if (error) throw error;
  const newestFirst = data || [];
  const hasMore = newestFirst.length > pageSize;
  const page = newestFirst.slice(0, pageSize).reverse();
  return { rows: page, hasMore, nextBefore: page[0]?.created_at || null };
}

export async function sendStatusReply(statusId, body) {
  if (!SUPABASE_ENABLED || !supabase) throw new Error('Status updates require a configured account connection.');
  const normalized = String(body || '').trim();
  if (!statusId || !normalized || normalized.length > 1000) throw new Error('Write a reply of 1–1000 characters.');
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user?.id) throw new Error('Sign in to reply to a status.');
  const { data, error } = await supabase.from('status_replies').insert({ status_id: statusId, sender_id: auth.user.id, body: normalized }).select('id,status_id,sender_id,body,created_at').single();
  if (error) throw error;
  return data;
}


export async function listMutedStatusUsers() {
  if (!SUPABASE_ENABLED || !supabase) throw new Error('Status updates require a configured account connection.');
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user?.id) throw new Error('Sign in to manage muted statuses.');
  const { data, error } = await supabase.from('muted_status_users').select('muted_user_id,created_at').eq('user_id', auth.user.id).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function muteStatusUser(userId) {
  if (!SUPABASE_ENABLED || !supabase) throw new Error('Status updates require a configured account connection.');
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user?.id) throw new Error('Sign in to mute statuses.');
  if (!userId || userId === auth.user.id) throw new Error('Choose another account to mute.');
  const { error } = await supabase.from('muted_status_users').upsert({ user_id: auth.user.id, muted_user_id: userId }, { onConflict: 'user_id,muted_user_id' });
  if (error) throw error;
}

export async function unmuteStatusUser(userId) {
  if (!SUPABASE_ENABLED || !supabase) throw new Error('Status updates require a configured account connection.');
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user?.id) throw new Error('Sign in to manage muted statuses.');
  const { error } = await supabase.from('muted_status_users').delete().eq('user_id', auth.user.id).eq('muted_user_id', userId);
  if (error) throw error;
}



export async function listStatusContacts() {
  if (!SUPABASE_ENABLED || !supabase) throw new Error('Status updates require a configured account connection.');
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user?.id) throw new Error('Sign in to manage status privacy.');
  const { data: mine, error: mineError } = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', auth.user.id);
  if (mineError) throw mineError;
  const conversationIds = [...new Set((mine || []).map((row) => row.conversation_id).filter(Boolean))];
  if (!conversationIds.length) return [];
  const { data: peers, error: peersError } = await supabase.from('conversation_participants').select('user_id').in('conversation_id', conversationIds).neq('user_id', auth.user.id);
  if (peersError) throw peersError;
  const ids = [...new Set((peers || []).map((row) => row.user_id).filter(Boolean))];
  if (!ids.length) return [];
  const { data: profiles, error: profilesError } = await supabase.from('profiles').select('id,name').in('id', ids).order('name');
  if (profilesError) throw profilesError;
  return (profiles || []).map((profile) => ({ id: profile.id, name: String(profile.name || 'ZannyChat user').trim() || 'ZannyChat user' }));
}

export async function listStatusExclusions() {
  if (!SUPABASE_ENABLED || !supabase) throw new Error('Status updates require a configured account connection.');
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user?.id) throw new Error('Sign in to manage status privacy.');
  const { data, error } = await supabase.from('status_excluded_users').select('excluded_user_id,created_at').eq('owner_id', auth.user.id).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function setStatusExcludedUser(userId, excluded) {
  if (!SUPABASE_ENABLED || !supabase) throw new Error('Status updates require a configured account connection.');
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user?.id) throw new Error('Sign in to manage status privacy.');
  if (!userId || userId === auth.user.id) throw new Error('Choose another account.');
  const query = supabase.from('status_excluded_users');
  const result = excluded
    ? await query.upsert({ owner_id: auth.user.id, excluded_user_id: userId }, { onConflict: 'owner_id,excluded_user_id' })
    : await query.delete().eq('owner_id', auth.user.id).eq('excluded_user_id', userId);
  if (result.error) throw result.error;
}

// Resolve only the profile fields needed to label status replies and mute preferences.
export async function resolveStatusUserNames(userIds) {
  if (!SUPABASE_ENABLED || !supabase) return {};
  const ids = [...new Set((userIds || []).filter((id) => typeof id === 'string' && id))];
  if (!ids.length) return {};
  const { data, error } = await supabase.from('profiles').select('id,name').in('id', ids);
  if (error) throw error;
  return Object.fromEntries((data || []).map((profile) => [profile.id, String(profile.name || 'ZannyChat user').trim() || 'ZannyChat user']));
}
