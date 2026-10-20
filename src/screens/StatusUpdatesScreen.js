import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../theme/ThemeContext';
import { deleteStatus, listActiveStatuses, listStatusReactions, normalizeStatusText, publishPhotoStatus, publishVideoStatus, publishTextStatus, recordStatusView, reactToStatus, removeStatusReaction, listStatusReplies, sendStatusReply, listMutedStatusUsers, muteStatusUser, unmuteStatusUser, listStatusContacts, listStatusExclusions, setStatusExcludedUser, resolveStatusUserNames, subscribeToStatusChanges, STATUS_REACTIONS, STATUS_TEXT_LIMIT } from '../services/statusUpdates';

function StatusVideo({ uri, height = '65%' }) {
  const player = useVideoPlayer(uri, (instance) => { instance.loop = true; instance.play(); });
  return <VideoView player={player} nativeControls contentFit="contain" style={{ width: '100%', height }} />;
}

function ageLabel(value) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return 'Recently';
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  return minutes < 1 ? 'Just now' : minutes < 60 ? `${minutes}m ago` : `${Math.floor(minutes / 60)}h ago`;
}

export default function StatusUpdatesScreen({ navigation }) {
  const { colors, spacing, radii, typography } = useTheme();
  const [text, setText] = useState('');
  const [audience, setAudience] = useState('contacts');
  const [photo, setPhoto] = useState(null);
  const [video, setVideo] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState(null);
  const [reactions, setReactions] = useState({});
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [mutedUsers, setMutedUsers] = useState([]);
  const [statusUserNames, setStatusUserNames] = useState({});
  const [privacyContacts, setPrivacyContacts] = useState([]);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [excludedUsers, setExcludedUsers] = useState([]);
  const [privacyBusy, setPrivacyBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try { const rows = await listActiveStatuses(); setStatuses(rows); try { setReactions(await listStatusReactions(rows.map((row) => row.id))); } catch { setReactions({}); } try { const muted = await listMutedStatusUsers(); setMutedUsers(muted); try { const excluded = await listStatusExclusions(); setExcludedUsers(excluded); } catch { setExcludedUsers([]); } const names = await resolveStatusUserNames([...muted.map((row) => row.muted_user_id), ...rows.filter((row) => !row.is_own).map((row) => row.user_id)]); setStatusUserNames((old) => ({ ...old, ...names })); } catch { setMutedUsers([]); } }
    catch (e) { setError(e?.message || 'Could not load status updates.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => {
    refresh();
    let refreshTimer = null;
    const unsubscribe = subscribeToStatusChanges(() => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => { refreshTimer = null; refresh(); }, 350);
    });
    return () => { if (refreshTimer) clearTimeout(refreshTimer); unsubscribe(); };
  }, [refresh]));

  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Photo access needed', 'Allow photo library access to share a status photo.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 });
    if (!result.canceled && result.assets?.[0]) { setPhoto(result.assets[0]); setVideo(null); }
  };

  const chooseVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Media access needed', 'Allow media library access to share a video status.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsEditing: false, videoMaxDuration: 30 });
    if (!result.canceled && result.assets?.[0]) { setVideo(result.assets[0]); setPhoto(null); }
  };

  const publish = async () => {
    const normalized = normalizeStatusText(text);
    if (!normalized && !photo && !video) { Alert.alert('Add a status', 'Write a few words or choose a photo or video before publishing.'); return; }
    setSaving(true);
    try { const item = photo ? await publishPhotoStatus(photo, normalized, audience) : video ? await publishVideoStatus(video, normalized, audience) : await publishTextStatus(normalized, audience); setStatuses((old) => [item, ...old]); setText(''); setPhoto(null); setVideo(null); Alert.alert('Status published', 'This status expires automatically within 24 hours.'); }
    catch (e) { Alert.alert('Could not publish status', e?.message || 'Please try again.'); }
    finally { setSaving(false); }
  };

  const openStatus = async (item) => {
    setViewing(item); setReplyText(''); setReplies([]);
    if (!item.is_own) {
      try { await recordStatusView(item.id); }
      catch (e) { console.warn('Status view receipt could not be recorded'); }
    } else {
      try { const rows = await listStatusReplies(item.id); setReplies(rows); try { const names = await resolveStatusUserNames(rows.map((reply) => reply.sender_id)); setStatusUserNames((old) => ({ ...old, ...names })); } catch { /* Keep the ID fallback if profile lookup is unavailable. */ } }
      catch (e) { console.warn('Status replies could not be loaded'); }
    }
  };

  const submitReply = async () => {
    if (!viewing || viewing.is_own || !replyText.trim()) return;
    setSendingReply(true);
    try { await sendStatusReply(viewing.id, replyText); setReplyText(''); Alert.alert('Reply sent', 'Your reply was sent privately to the status owner.'); }
    catch (e) { Alert.alert('Could not send reply', e?.message || 'Please try again.'); }
    finally { setSendingReply(false); }
  };

  const muteOwner = (item) => Alert.alert('Mute this account’s statuses?', 'Their statuses will be hidden from your list until you unmute them. This does not block messages.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Mute statuses', onPress: async () => { try { await muteStatusUser(item.user_id); setMutedUsers((old) => old.some((row) => row.muted_user_id === item.user_id) ? old : [{ muted_user_id: item.user_id, created_at: new Date().toISOString() }, ...old]); setStatuses((old) => old.filter((row) => row.user_id !== item.user_id)); } catch (e) { Alert.alert('Could not mute statuses', e?.message || 'Please try again.'); } } },
  ]);

  const unmuteOwner = async (userId) => { try { await unmuteStatusUser(userId); setMutedUsers((old) => old.filter((row) => row.muted_user_id !== userId)); await refresh(); } catch (e) { Alert.alert('Could not unmute statuses', e?.message || 'Please try again.'); } };

  const loadPrivacyContacts = async () => {
    setPrivacyModalOpen(true);
    setPrivacyBusy(true);
    try { const [contacts, excluded] = await Promise.all([listStatusContacts(), listStatusExclusions()]); setPrivacyContacts(contacts); setExcludedUsers(excluded); }
    catch (e) { Alert.alert('Could not load privacy contacts', e?.message || 'Please try again.'); }
    finally { setPrivacyBusy(false); }
  };

  const toggleExcluded = async (contact) => {
    const currentlyExcluded = excludedUsers.some((row) => row.excluded_user_id === contact.id);
    try { await setStatusExcludedUser(contact.id, !currentlyExcluded); setExcludedUsers((old) => currentlyExcluded ? old.filter((row) => row.excluded_user_id !== contact.id) : [{ excluded_user_id: contact.id, created_at: new Date().toISOString() }, ...old]); await refresh(); }
    catch (e) { Alert.alert('Could not update Story privacy', e?.message || 'Please try again.'); }
  };

  const remove = (item) => Alert.alert('Delete status?', 'This removes your status immediately.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { try { await deleteStatus(item.id); setStatuses((old) => old.filter((s) => s.id !== item.id)); } catch (e) { Alert.alert('Could not delete status', e?.message || 'Please try again.'); } } },
  ]);

  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <Header title="Status updates" subtitle="Text updates · expire after 24 hours" onBack={() => navigation.goBack()} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl || spacing.xl }}>
      <GlassCard style={{ marginBottom: spacing.md }} contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
        <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Share a text status</Text>
        <TextInput value={text} onChangeText={(v) => setText(v.slice(0, STATUS_TEXT_LIMIT))} placeholder="What would you like to share?" placeholderTextColor={colors.textSecondary} multiline maxLength={STATUS_TEXT_LIMIT} accessibilityLabel="Status text" style={[typography.body, { color: colors.textPrimary, minHeight: 92, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md }]} />
        <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'right' }]}>{text.length}/{STATUS_TEXT_LIMIT}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <TouchableOpacity onPress={choosePhoto} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.sm, minHeight: 42 }}><Ionicons name="image-outline" size={18} color={colors.primary} /><Text style={[typography.small, { color: colors.textPrimary }]}>{photo ? 'Change photo' : 'Add photo'}</Text></TouchableOpacity>
          {photo || video ? <TouchableOpacity onPress={() => { setPhoto(null); setVideo(null); }} accessibilityRole="button"><Text style={[typography.small, { color: colors.textSecondary }]}>Remove media</Text></TouchableOpacity> : null}
          <TouchableOpacity onPress={chooseVideo} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.sm, minHeight: 42 }}><Ionicons name="videocam-outline" size={18} color={colors.primary} /><Text style={[typography.small, { color: colors.textPrimary }]}>{video ? 'Change video' : 'Add video'}</Text></TouchableOpacity>
        </View>
        {photo ? <Image source={{ uri: photo.uri }} accessibilityLabel="Selected status photo preview" style={{ width: '100%', height: 190, borderRadius: radii.md }} resizeMode="cover" /> : null}
        {video ? <View style={{ padding: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border }}><Ionicons name="videocam" size={24} color={colors.primary} /><Text style={[typography.small, { color: colors.textPrimary, marginTop: 5 }]}>{video.fileName || 'Video selected'} · maximum 30 seconds / 50 MB</Text></View> : null}
        <Text style={[typography.small, { color: colors.textSecondary }]}>Who can see it?</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {[{ value: 'contacts', label: 'My contacts', icon: 'people-outline' }, { value: 'only_me', label: 'Only me', icon: 'lock-closed-outline' }].map((option) => <TouchableOpacity key={option.value} onPress={() => setAudience(option.value)} accessibilityRole="radio" accessibilityState={{ checked: audience === option.value }} style={{ flex: 1, minHeight: 44, borderRadius: radii.md, borderWidth: 1, borderColor: audience === option.value ? colors.primary : colors.border, backgroundColor: audience === option.value ? `${colors.primary}18` : colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs }}><Ionicons name={option.icon} size={16} color={audience === option.value ? colors.primary : colors.textSecondary} /><Text style={[typography.small, { color: colors.textPrimary, marginLeft: 6 }]}>{option.label}</Text></TouchableOpacity>)}
        </View>
        <TouchableOpacity onPress={publish} disabled={saving || (!text.trim() && !photo && !video)} accessibilityRole="button" style={{ minHeight: 48, borderRadius: radii.md, backgroundColor: saving || (!text.trim() && !photo && !video) ? colors.border : colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
          {saving ? <ActivityIndicator color={colors.background} /> : <Ionicons name="paper-plane-outline" size={17} color={colors.background} />}
          <Text style={[typography.bodyStrong, { color: colors.background }]}>{saving ? 'Publishing…' : 'Publish status'}</Text>
        </TouchableOpacity>
      </GlassCard>
      {mutedUsers.length ? <GlassCard style={{ marginBottom: spacing.md }} contentStyle={{ padding: spacing.md, gap: spacing.sm }}><Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Muted status accounts ({mutedUsers.length})</Text>{mutedUsers.map((entry) => <View key={entry.muted_user_id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}><Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>{statusUserNames[entry.muted_user_id] || `${String(entry.muted_user_id).slice(0, 8)}…`}</Text><TouchableOpacity onPress={() => unmuteOwner(entry.muted_user_id)} accessibilityRole="button"><Text style={[typography.small, { color: colors.primary }]}>Unmute</Text></TouchableOpacity></View>)}</GlassCard> : null}<GlassCard style={{ marginBottom: spacing.md }} contentStyle={{ padding: spacing.md, gap: spacing.sm }}><Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Story privacy</Text><Text style={[typography.caption, { color: colors.textSecondary }]}>Exclude specific conversation contacts from all your contact-visible statuses. This does not block messages.</Text><TouchableOpacity onPress={loadPrivacyContacts} disabled={privacyBusy} accessibilityRole="button" style={{ minHeight: 42, justifyContent: 'center' }}><Text style={[typography.small, { color: colors.primary }]}>{privacyBusy ? 'Loading contacts…' : 'Manage excluded contacts'}</Text></TouchableOpacity>{excludedUsers.map((entry) => <View key={entry.excluded_user_id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}><Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>{statusUserNames[entry.excluded_user_id] || `${String(entry.excluded_user_id).slice(0, 8)}…`}</Text><TouchableOpacity onPress={async () => { const contact = privacyContacts.find((item) => item.id === entry.excluded_user_id) || { id: entry.excluded_user_id }; await toggleExcluded(contact); }} accessibilityRole="button"><Text style={[typography.small, { color: colors.primary }]}>Allow</Text></TouchableOpacity></View>)}</GlassCard><Text style={[typography.bodyStrong, { color: colors.textPrimary, marginBottom: spacing.sm }]}>Recent statuses</Text>
      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>Contact visibility is restricted by database policy to people who share a conversation with you. Photo statuses are private and visible only to you or eligible conversation contacts. A view is recorded when you open a status; repeat views by the same account count once.</Text>
      {loading ? <View style={{ padding: spacing.xl, alignItems: 'center' }}><ActivityIndicator color={colors.primary} /></View> : error ? <View style={{ padding: spacing.md }}><Text style={[typography.body, { color: colors.textSecondary }]}>{error}</Text><TouchableOpacity onPress={refresh} style={{ paddingVertical: spacing.md }}><Text style={[typography.bodyStrong, { color: colors.primary }]}>Try again</Text></TouchableOpacity></View> : statuses.map((item) => <GlassCard key={item.id} style={{ marginBottom: spacing.sm }} contentStyle={{ padding: spacing.md, gap: spacing.sm }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ flex: 1 }}><Text style={[typography.caption, { color: colors.textSecondary }]}>{ageLabel(item.created_at)} · {item.audience === 'only_me' ? 'Only me' : 'My contacts'}</Text></View>{item.is_own ? <TouchableOpacity onPress={() => remove(item)} accessibilityRole="button" accessibilityLabel="Delete status" hitSlop={10}><Ionicons name="trash-outline" size={18} color={colors.textSecondary} /></TouchableOpacity> : null}{!item.is_own ? <TouchableOpacity onPress={() => muteOwner(item)} accessibilityRole="button" accessibilityLabel="Mute this account’s statuses" hitSlop={10}><Ionicons name="volume-mute-outline" size={18} color={colors.textSecondary} /></TouchableOpacity> : null}</View>{item.media_kind === 'video' && item.media_url ? <TouchableOpacity onPress={() => openStatus(item)} accessibilityRole="button" style={{ minHeight: 70, borderRadius: radii.md, backgroundColor: '#111111', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="play-circle" size={42} color="#FFFFFF" /><Text style={{ color: '#FFFFFF' }}>Video status</Text></TouchableOpacity> : null}{item.media_kind === 'image' && item.media_url ? <Image source={{ uri: item.media_url }} accessibilityLabel="Status photo" style={{ width: '100%', height: 220, borderRadius: radii.md }} resizeMode="cover" /> : null}{item.text ? <Text style={[typography.body, { color: colors.textPrimary }]}>{item.text}</Text> : null}{item.media_kind === 'image' && !item.media_url ? <Text style={[typography.caption, { color: colors.textSecondary }]}>Photo unavailable or access expired. Refresh to try again.</Text> : null}{item.is_own ? <Text style={[typography.caption, { color: colors.textSecondary }]}><Ionicons name="eye-outline" size={13} color={colors.textSecondary} /> {item.view_count || 0} {item.view_count === 1 ? 'view' : 'views'}</Text> : null}<TouchableOpacity onPress={() => openStatus(item)} accessibilityRole="button" style={{ minHeight: 38, justifyContent: 'center' }}><Text style={[typography.small, { color: colors.primary }]}>{item.is_own ? 'View status' : 'Open status'}</Text></TouchableOpacity><Text style={[typography.caption, { color: colors.textSecondary }]}>Expires {new Date(item.expires_at).toLocaleString()}</Text></GlassCard>)}
      {!loading && !error && statuses.length === 0 ? <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}><Ionicons name="aperture-outline" size={34} color={colors.textSecondary} /><Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>No active statuses yet. Publish a short update above.</Text></View> : null}
    </ScrollView>
    <Modal visible={privacyModalOpen} transparent animationType="slide" onRequestClose={() => setPrivacyModalOpen(false)}>
      <View style={{ flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' }}><View style={{ maxHeight: '75%', backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.md }}><View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}><Text style={[typography.bodyStrong, { color: colors.textPrimary, flex: 1 }]}>Exclude contacts from statuses</Text><TouchableOpacity onPress={() => setPrivacyModalOpen(false)} accessibilityRole="button"><Ionicons name="close" size={24} color={colors.textPrimary} /></TouchableOpacity></View><Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>Excluded people cannot read your contact-visible status media or text. Changes apply to existing active statuses too.</Text><ScrollView>{privacyContacts.map((contact) => { const excluded = excludedUsers.some((row) => row.excluded_user_id === contact.id); return <TouchableOpacity key={contact.id} onPress={() => toggleExcluded(contact)} accessibilityRole="checkbox" accessibilityState={{ checked: excluded }} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}><Text style={[typography.body, { color: colors.textPrimary, flex: 1 }]}>{contact.name}</Text><Ionicons name={excluded ? 'checkbox' : 'square-outline'} size={22} color={excluded ? colors.primary : colors.textSecondary} /></TouchableOpacity>; })}{privacyContacts.length === 0 ? <Text style={[typography.body, { color: colors.textSecondary }]}>No conversation contacts found.</Text> : null}</ScrollView></View></View>
    </Modal>
    <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
      <View style={{ flex: 1, backgroundColor: '#000000E8', justifyContent: 'center', padding: spacing.md }}>
        <TouchableOpacity onPress={() => setViewing(null)} accessibilityRole="button" accessibilityLabel="Close status viewer" style={{ alignSelf: 'flex-end', padding: spacing.md }}><Ionicons name="close" size={28} color="#FFFFFF" /></TouchableOpacity>
        {viewing?.media_kind === 'video' && viewing?.media_url ? <StatusVideo uri={viewing.media_url} /> : null}
        {viewing?.media_kind === 'image' && viewing?.media_url ? <Image source={{ uri: viewing.media_url }} accessibilityLabel="Opened status photo" resizeMode="contain" style={{ width: '100%', height: '65%' }} /> : null}
        {viewing?.text ? <Text style={[typography.body, { color: '#FFFFFF', textAlign: 'center', marginTop: spacing.md }]}>{viewing.text}</Text> : null}
        {viewing && !viewing.is_own ? <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 10, marginTop: spacing.lg }}>{STATUS_REACTIONS.map((emoji) => { const mine = reactions[viewing.id]?.mine === emoji; const count = reactions[viewing.id]?.counts?.[emoji] || 0; return <TouchableOpacity key={emoji} accessibilityRole="button" accessibilityLabel={`React ${emoji}${count ? `, ${count} reactions` : ''}`} onPress={async () => { try { if (mine) await removeStatusReaction(viewing.id); else await reactToStatus(viewing.id, emoji); setReactions(await listStatusReactions(statuses.map((row) => row.id))); } catch (e) { Alert.alert('Could not react', e?.message || 'Please try again.'); } }} style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: mine ? '#FFFFFF' : '#777777', backgroundColor: mine ? '#FFFFFF22' : 'transparent' }}><Text style={{ color: '#FFFFFF', fontSize: 18 }}>{emoji}{count ? ` ${count}` : ''}</Text></TouchableOpacity>; })}</View> : null}
        {viewing && !viewing.is_own ? <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.lg }}><TextInput value={replyText} onChangeText={(v) => setReplyText(v.slice(0, 1000))} placeholder="Reply privately…" placeholderTextColor="#BBBBBB" accessibilityLabel="Private status reply" multiline style={{ flex: 1, color: '#FFFFFF', borderWidth: 1, borderColor: '#777777', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, maxHeight: 90 }} /><TouchableOpacity onPress={submitReply} disabled={sendingReply || !replyText.trim()} accessibilityRole="button" accessibilityLabel="Send status reply" style={{ alignSelf: 'flex-end', padding: 12, opacity: sendingReply || !replyText.trim() ? 0.45 : 1 }}><Ionicons name="send" size={20} color="#FFFFFF" /></TouchableOpacity></View> : null}
        {viewing?.is_own && replies.length ? <ScrollView style={{ maxHeight: 150, marginTop: spacing.md }}><Text style={{ color: '#FFFFFF', fontWeight: '600', marginBottom: 6 }}>Private replies</Text>{replies.map((reply) => <View key={reply.id} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#555555' }}><Text style={{ color: '#FFFFFF' }}>{reply.body}</Text><Text style={{ color: '#BBBBBB', fontSize: 11, marginTop: 3 }}>{statusUserNames[reply.sender_id] || String(reply.sender_id).slice(0, 8)} · {new Date(reply.created_at).toLocaleString()}</Text></View>)}</ScrollView> : null}
        <Text style={[typography.caption, { color: '#FFFFFF', textAlign: 'center', marginTop: spacing.md }]}>{viewing ? ageLabel(viewing.created_at) : ''} · expires {viewing ? new Date(viewing.expires_at).toLocaleString() : ''}</Text>
      </View>
    </Modal>
  </SafeAreaView>;
}
