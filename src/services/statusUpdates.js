import { supabase, SUPABASE_ENABLED } from './supabaseClient';
import { normalizeStatusText, statusExpiryFrom, STATUS_TEXT_LIMIT } from '../utils/statusRules';
export { normalizeStatusText, statusExpiryFrom, STATUS_TEXT_LIMIT };

export function subscribeToStatusChanges(onChange) {
  if (!SUPABASE_ENABLED || !supabase || typeof onChange !== 'function') return () => {};
  const channel = supabase.channel('status-updates-live-feed')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'status_updates' }, () => onChange())
    .subscribe();
  return () => { supabase.removeChannel(channel).catch(() => {}); };
}

async function cleanupExpiredOwnStatuses(userId) {
  // Best-effort cleanup on app use; never let cleanup failure hide active statuses.
  const now = new Date().toISOString();
  const { data: expired, error: expiredError } = await supabase.from('status_updates')
    .select('id,media_path').eq('user_id', userId).lte('expires_at', now).limit(100);
  if (expiredError || !expired?.length) return;
  const paths = expired.map((row) => row.media_path).filter((path) => path && path !== 'pending');
  const { error: deleteError } = await supabase.from('status_updates').delete()
    .eq('user_id', userId).in('id', expired.map((row) => row.id));
  if (deleteError) return;
  if (paths.length) {
    const { error: storageError } = await supabase.storage.from('status-media').remove(paths);
    if (storageError) console.warn('Expired status media cleanup failed');
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
  let mutedOwners = new Set();
  if (userId) {
    const { data: mutedRows, error: mutedError } = await supabase.from('muted_status_users').select('muted_user_id').eq('user_id', userId);
    if (!mutedError) mutedOwners = new Set((mutedRows || []).map((row) => row.muted_user_id));
  }
  let excludedOwners = new Set();
  if (userId) {
    const { data: excludedRows, error: excludedError } = await supabase.from('status_excluded_users').select('owner_id').eq('excluded_user_id', userId);
    if (!excludedError) excludedOwners = new Set((excludedRows || []).map((row) => row.owner_id));
  }
  const rows = (data || []).filter((row) => row.user_id === userId || (!mutedOwners.has(row.user_id) && !excludedOwners.has(row.user_id)));
  const ownedIds = rows.filter((row) => row.user_id === userId).map((row) => row.id);
  const counts = new Map();
  if (ownedIds.length) {
    const { data: views, error: viewsError } = await supabase.from('status_views').select('status_id,viewer_id').in('status_id', ownedIds);
    if (!viewsError) for (const view of views || []) counts.set(view.status_id, (counts.get(view.status_id) || 0) + 1);
  }
  return Promise.all(rows.map(async (row) => {
    const isOwn = row.user_id === userId;
    const base = { ...row, is_own: isOwn, view_count: isOwn ? (counts.get(row.id) || 0) : undefined };
    if (!['image', 'video'].includes(row.media_kind) || !row.media_path) return base;
    const { data: signed, error: signError } = await supabase.storage.from('status-media').createSignedUrl(row.media_path, 300);
    return { ...base, media_url: signError ? null : signed?.signedUrl || null };
  }));
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

export async function publishTextStatus(text, audience = 'contacts') {
  const normalized = normalizeStatusText(text);
  if (!normalized) throw new Error('Write a status before publishing.');
  if (normalized.length > STATUS_TEXT_LIMIT) throw new Error(`Status must be ${STATUS_TEXT_LIMIT} characters or fewer.`);
  if (!['contacts', 'only_me'].includes(audience)) throw new Error('Choose a valid status audience.');
  if (!SUPABASE_ENABLED || !supabase) throw new Error('Status updates require a configured account connection.');
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user?.id) throw new Error('Sign in to publish a status.');
  const createdAt = new Date().toISOString();
  const { data, error } = await supabase.from('status_updates').insert({ user_id: auth.user.id, text: normalized, audience, created_at: createdAt, expires_at: statusExpiryFrom(createdAt) }).select('id,user_id,text,audience,media_kind,media_path,created_at,expires_at').single();
  if (error) throw error;
  return { ...data, is_own: true };
}

export async function publishPhotoStatus(asset, caption = '', audience = 'contacts') {
  if (!SUPABASE_ENABLED || !supabase) throw new Error('Status updates require a configured account connection.');
  if (!asset?.uri) throw new Error('Choose a photo first.');
  if (!['contacts', 'only_me'].includes(audience)) throw new Error('Choose a valid status audience.');
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user?.id) throw new Error('Sign in to publish a status.');
  const response = await fetch(asset.uri);
  const blob = await response.blob();
  if (!blob || blob.size < 1 || blob.size > 10 * 1024 * 1024) throw new Error('Photo must be smaller than 10 MB.');
  const mime = asset.mimeType || blob.type || 'image/jpeg';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) throw new Error('Choose a JPG, PNG, or WebP photo.');
  const createdAt = new Date().toISOString();
  const expiresAt = statusExpiryFrom(createdAt);
  const { data: row, error: insertError } = await supabase.from('status_updates').insert({
    user_id: auth.user.id, text: String(caption || '').trim().slice(0, STATUS_TEXT_LIMIT), audience,
    media_kind: 'image', media_path: 'pending', created_at: createdAt, expires_at: expiresAt,
  }).select('id,user_id,text,audience,media_kind,media_path,created_at,expires_at').single();
  if (insertError) throw insertError;
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const path = `${auth.user.id}/${row.id}/photo.${ext}`;
  // Replace the placeholder only after row creation; policy validates exact path.
  const { error: updateError } = await supabase.from('status_updates').update({ media_path: path }).eq('id', row.id).eq('user_id', auth.user.id);
  if (updateError) { await supabase.from('status_updates').delete().eq('id', row.id); throw updateError; }
  const bytes = await blob.arrayBuffer();
  const { error: uploadError } = await supabase.storage.from('status-media').upload(path, bytes, { contentType: mime, upsert: false });
  if (uploadError) { await supabase.from('status_updates').delete().eq('id', row.id); throw uploadError; }
  const { data: signed, error: signError } = await supabase.storage.from('status-media').createSignedUrl(path, 300);
  if (signError) { await supabase.storage.from('status-media').remove([path]); await supabase.from('status_updates').delete().eq('id', row.id); throw signError; }
  return { ...row, is_own: true, text: String(caption || '').trim().slice(0, STATUS_TEXT_LIMIT), media_path: path, media_url: signed.signedUrl };
}

export async function publishVideoStatus(asset, caption = '', audience = 'contacts') {
  if (!SUPABASE_ENABLED || !supabase) throw new Error('Status updates require a configured account connection.');
  if (!asset?.uri) throw new Error('Choose a video first.');
  if (!['contacts', 'only_me'].includes(audience)) throw new Error('Choose a valid status audience.');
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user?.id) throw new Error('Sign in to publish a status.');
  const response = await fetch(asset.uri);
  const blob = await response.blob();
  if (!blob || blob.size < 1 || blob.size > 50 * 1024 * 1024) throw new Error('Video must be smaller than 50 MB.');
  const mime = asset.mimeType || blob.type || 'video/mp4';
  if (mime !== 'video/mp4') throw new Error('Choose an MP4 video.');
  const createdAt = new Date().toISOString();
  const expiresAt = statusExpiryFrom(createdAt);
  const captionText = String(caption || '').trim().slice(0, STATUS_TEXT_LIMIT);
  const { data: row, error: insertError } = await supabase.from('status_updates').insert({
    user_id: auth.user.id, text: captionText || null, audience,
    media_kind: 'video', media_path: 'pending', created_at: createdAt, expires_at: expiresAt,
  }).select('id,user_id,text,audience,media_kind,media_path,created_at,expires_at').single();
  if (insertError) throw insertError;
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
  const { data: row, error: readError } = await supabase.from('status_updates').select('media_path').eq('id', statusId).maybeSingle();
  if (readError) throw readError;
  const { error } = await supabase.from('status_updates').delete().eq('id', statusId);
  if (error) throw error;
  if (row?.media_path && row.media_path !== 'pending') { const { error: mediaError } = await supabase.storage.from('status-media').remove([row.media_path]); if (mediaError) console.warn('Status media cleanup failed'); }
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


export async function listStatusReplies(statusId) {
  if (!SUPABASE_ENABLED || !supabase) throw new Error('Status updates require a configured account connection.');
  if (!statusId) throw new Error('Choose a valid status.');
  const { data, error } = await supabase.from('status_replies').select('id,status_id,sender_id,body,created_at').eq('status_id', statusId).order('created_at', { ascending: true }).limit(100);
  if (error) throw error;
  return data || [];
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
