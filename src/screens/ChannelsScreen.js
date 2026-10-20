import React, { useCallback, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Alert, Share, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../theme/ThemeContext';
import { acceptChannelInvite, appointChannelModerator, createChannel, createChannelInvite, deleteChannel, deleteChannelPost, deleteChannelPostComment, fetchChannelInvites, fetchChannelModerators, fetchChannelPostComments, fetchChannelPosts, getCurrentUser, listChannels, publishChannelPost, publishChannelPostComment, removeChannelModerator, revokeChannelInvite, reportChannelPost, fetchChannelPostReports, updateChannelPostReport, setChannelPostPinned, setChannelPostReaction, subscribeToChannel, unsubscribeFromChannel, updateChannel, updateChannelPost } from '../services/api';
import { normalizeChannelPost, validateChannel } from '../utils/channelValidation';
import { mergeChannelPostPages } from '../utils/channelPagination';
import { channelPostDraftKey, normalizeChannelPostDraft } from '../utils/channelDrafts';
import { clearChannelPostDraft, saveChannelPostDraft } from '../utils/channelDraftStorage';

const QUICK_COMPOSER_EMOJIS = ['😀', '😂', '🥰', '😍', '😊', '🙏', '👍', '👏', '❤️', '🔥', '🎉', '💯', '✨', '😢', '😮', '🇳🇬'];

function dateLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

export default function ChannelsScreen({ navigation }) {
  const { colors, spacing, radii, typography } = useTheme();
  const [channels, setChannels] = useState([]);
  const [channelSearch, setChannelSearch] = useState('');
  const channelSearchRef = useRef('');
  const [selected, setSelected] = useState(null);
  const [posts, setPosts] = useState([]);
  const [postsCursor, setPostsCursor] = useState(null);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [expandedComments, setExpandedComments] = useState({});
  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [moderatorMembers, setModeratorMembers] = useState([]);
  const [channelInvites, setChannelInvites] = useState([]);
  const [channelReports, setChannelReports] = useState([]);
  const [showReports, setShowReports] = useState(false);
  const [userId, setUserId] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivateDraft, setIsPrivateDraft] = useState(false);
  const [inviteTokenDraft, setInviteTokenDraft] = useState('');
  const [selectedIsPrivateDraft, setSelectedIsPrivateDraft] = useState(false);
  const [editingChannel, setEditingChannel] = useState(false);
  const [channelTitleDraft, setChannelTitleDraft] = useState('');
  const [channelDescriptionDraft, setChannelDescriptionDraft] = useState('');
  const [postText, setPostText] = useState('');
  const [editingPostId, setEditingPostId] = useState(null);
  const [editPostDraft, setEditPostDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [rows, user] = await Promise.all([listChannels(channelSearchRef.current), getCurrentUser()]);
      setChannels(rows);
      setUserId(user?.id || null);
      if (selected) {
        const latest = rows.find((item) => item.id === selected.id);
        if (latest) {
          const detail = await fetchChannelPosts(latest.id);
          setSelected(detail?.channel || latest);
          setChannelTitleDraft((detail?.channel || latest).title || ''); setChannelDescriptionDraft((detail?.channel || latest).description || ''); setSelectedIsPrivateDraft(Boolean((detail?.channel || latest).is_private));
          setPosts(Array.isArray(detail?.posts) ? detail.posts : []); setPostsCursor(detail?.nextCursor || null); setHasMorePosts(Boolean(detail?.hasMore));
          if (latest.owner_id === user?.id) {
            const [members, invites] = await Promise.all([fetchChannelModerators(latest.id), fetchChannelInvites(latest.id)]);
            setModeratorMembers(members); setChannelInvites(invites);
          } else { setModeratorMembers([]); setChannelInvites([]); }
        } else { setSelected(null); setPosts([]); setPostsCursor(null); setHasMorePosts(false); }
      }
    } catch (err) { setError(err?.message || 'Could not load channels. Check your connection and try again.'); }
    finally { setLoading(false); }
  }, [selected?.id]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const openChannel = async (channel) => {
    setBusy(true); setError('');
    try {
      const detail = await fetchChannelPosts(channel.id);
      const selectedChannel = detail?.channel || channel;
      setSelected(selectedChannel); setPosts(Array.isArray(detail?.posts) ? detail.posts : []); setPostsCursor(detail?.nextCursor || null); setHasMorePosts(Boolean(detail?.hasMore));
      try { setPostText(normalizeChannelPostDraft(await AsyncStorage.getItem(channelPostDraftKey(selectedChannel.id, userId)))); } catch { setPostText(''); }
      setChannelTitleDraft(selectedChannel.title || ''); setChannelDescriptionDraft(selectedChannel.description || ''); setSelectedIsPrivateDraft(Boolean(selectedChannel.is_private)); setEditingChannel(false);
      if (selectedChannel.owner_id === userId) {
        const [members, invites] = await Promise.all([fetchChannelModerators(channel.id), fetchChannelInvites(channel.id)]);
        setModeratorMembers(members); setChannelInvites(invites);
      } else { setModeratorMembers([]); setChannelInvites([]); }
    } catch (err) { setError(err?.message || 'Could not open this channel.'); }
    finally { setBusy(false); }
  };

  const create = async () => {
    const valid = validateChannel({ title, description });
    if (!valid.ok) { Alert.alert('Check channel details', valid.error); return; }
    setBusy(true); setError('');
    try {
      const item = await createChannel({ ...valid, isPrivate: isPrivateDraft });
      setChannels((old) => [item, ...old.filter((row) => row.id !== item.id)]);
      setTitle(''); setDescription(''); setIsPrivateDraft(false); setSelected(item); setSelectedIsPrivateDraft(Boolean(item.is_private)); setPosts([]); setPostsCursor(null); setHasMorePosts(false);
      Alert.alert('Channel created', 'You can now publish updates to your channel.');
    } catch (err) { setError(err?.message || 'Could not create channel.'); }
    finally { setBusy(false); }
  };

  const shareChannelInvite = async () => {
    if (!selected || !isOwner) return;
    setBusy(true); setError('');
    try {
      const invite = await createChannelInvite(selected.id, { maxUses: 50, expiresInDays: 7 });
      setChannelInvites((old) => [invite, ...old.filter((item) => item.id !== invite.id)]);
      await Share.share({ message: `Join my ZannyChat channel “${selected.title}” using this invitation token:\n${invite.token}\nExpires: ${new Date(invite.expires_at).toLocaleString()}` });
    } catch (err) { setError(err?.message || 'Could not create or share channel invitation.'); }
    finally { setBusy(false); }
  };

  const revokeInvite = (invite) => Alert.alert('Revoke invitation?', 'Anyone who has not joined with this token will no longer be able to use it.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Revoke', style: 'destructive', onPress: async () => {
      if (!selected) return;
      setBusy(true); setError('');
      try { await revokeChannelInvite(selected.id, invite.id); setChannelInvites((old) => old.map((item) => item.id === invite.id ? { ...item, revoked_at: new Date().toISOString() } : item)); }
      catch (err) { setError(err?.message || 'Could not revoke invitation.'); }
      finally { setBusy(false); }
    } },
  ]);

  const joinChannelInvite = async () => {
    const token = inviteTokenDraft.trim();
    if (!token) { Alert.alert('Invitation needed', 'Paste the invitation token you received.'); return; }
    setBusy(true); setError('');
    try {
      const channel = await acceptChannelInvite(token);
      setInviteTokenDraft('');
      await refresh();
      await openChannel(channel);
      Alert.alert('Joined channel', `You joined ${channel.title}.`);
    } catch (err) { setError(err?.message || 'Could not accept channel invitation.'); }
    finally { setBusy(false); }
  };

  const toggleSubscription = async (channel) => {
    setBusy(true); setError('');
    try {
      if (channel.subscribed) await unsubscribeFromChannel(channel.id);
      else await subscribeToChannel(channel.id);
      setChannels((old) => old.map((item) => item.id === channel.id ? { ...item, subscribed: !channel.subscribed, subscriberCount: Math.max(0, (item.subscriberCount || 0) + (channel.subscribed ? -1 : 1)) } : item));
      setSelected((old) => old?.id === channel.id ? { ...old, subscribed: !channel.subscribed } : old);
    } catch (err) { setError(err?.message || 'Could not update subscription.'); }
    finally { setBusy(false); }
  };

  const publish = async () => {
    const body = normalizeChannelPost(postText);
    if (!selected || !body) { Alert.alert('Write a post', 'Enter a message before publishing.'); return; }
    setBusy(true); setError('');
    try {
      const post = await publishChannelPost(selected.id, body);
      setPosts((old) => mergeChannelPostPages(old, [post])); setPostText('');
      try { await clearChannelPostDraft(AsyncStorage, channelPostDraftKey(selected.id, userId)); } catch { /* Keep publishing successful even if local draft cleanup fails. */ }
    } catch (err) { setError(err?.message || 'Could not publish post. Only the channel owner can publish.'); }
    finally { setBusy(false); }
  };

  const beginEditPost = (post) => { setEditingPostId(post.id); setEditPostDraft(post.body || ''); };

  const saveEditedPost = async (post) => {
    const body = normalizeChannelPost(editPostDraft);
    if (!selected || !body) { setError('Post text cannot be empty.'); return; }
    setBusy(true); setError('');
    try {
      const updated = await updateChannelPost(selected.id, post.id, body);
      setPosts((old) => old.map((item) => item.id === post.id ? { ...item, ...updated } : item));
      setEditingPostId(null); setEditPostDraft('');
    } catch (err) { setError(err?.message || 'Could not edit channel post.'); }
    finally { setBusy(false); }
  };

  const togglePinnedPost = async (post) => {
    if (!selected || !canModerate || busy) return;
    setBusy(true); setError('');
    try {
      const updated = await setChannelPostPinned(selected.id, post.id, !post.is_pinned);
      setPosts((old) => old.map((item) => item.id === post.id ? { ...item, ...updated } : item)
        .sort((a, b) => Number(Boolean(b.is_pinned)) - Number(Boolean(a.is_pinned)) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (err) { setError(err?.message || 'Could not update pinned post.'); }
    finally { setBusy(false); }
  };

  const removePost = (post) => Alert.alert('Delete post?', 'This removes the post and its comments and reactions.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      if (!selected) return;
      setBusy(true); setError('');
      try {
        await deleteChannelPost(selected.id, post.id);
        setPosts((old) => old.filter((item) => item.id !== post.id));
        setCommentsByPost((old) => { const next = { ...old }; delete next[post.id]; return next; });
        setExpandedComments((old) => { const next = { ...old }; delete next[post.id]; return next; });
      } catch (err) { setError(err?.message || 'Could not delete channel post.'); }
      finally { setBusy(false); }
    } },
  ]);

  const reactToPost = async (post, emoji) => {
    if (!selected || busy) return;
    const nextEmoji = post.myReaction === emoji ? null : emoji;
    setBusy(true); setError('');
    try {
      await setChannelPostReaction(selected.id, post.id, nextEmoji);
      const detail = await fetchChannelPosts(selected.id);
      setPosts((old) => { const incoming = Array.isArray(detail?.posts) ? detail.posts : []; const byId = new Map(incoming.map((item) => [item.id, item])); return old.map((item) => byId.get(item.id) || item); });
    } catch (err) { setError(err?.message || 'Could not save reaction.'); }
    finally { setBusy(false); }
  };

  const toggleComments = async (post) => {
    if (!selected) return;
    if (expandedComments[post.id]) {
      setExpandedComments((old) => ({ ...old, [post.id]: false }));
      return;
    }
    setExpandedComments((old) => ({ ...old, [post.id]: true }));
    if (commentsByPost[post.id]) return;
    try {
      const comments = await fetchChannelPostComments(selected.id, post.id);
      setCommentsByPost((old) => ({ ...old, [post.id]: comments }));
    } catch (err) { setError(err?.message || 'Could not load comments.'); }
  };

  const sendComment = async (post) => {
    if (!selected) return;
    const body = (commentDrafts[post.id] || '').trim();
    if (!body) return;
    if (!selected.subscribed && !isOwner) { setError('Subscribe to this channel before commenting.'); return; }
    setBusy(true); setError('');
    try {
      const comment = await publishChannelPostComment(selected.id, post.id, body);
      setCommentsByPost((old) => ({ ...old, [post.id]: [...(old[post.id] || []), comment] }));
      setCommentDrafts((old) => ({ ...old, [post.id]: '' }));
    } catch (err) { setError(err?.message || 'Could not publish comment.'); }
    finally { setBusy(false); }
  };

  const removeComment = (post, comment) => Alert.alert('Delete comment?', 'This comment will be removed from the channel post.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      if (!selected) return;
      setBusy(true);
      try {
        await deleteChannelPostComment(selected.id, post.id, comment.id);
        setCommentsByPost((old) => ({ ...old, [post.id]: (old[post.id] || []).filter((item) => item.id !== comment.id) }));
      } catch (err) { setError(err?.message || 'Could not delete comment.'); }
      finally { setBusy(false); }
    } },
  ]);

  const loadOlderPosts = async () => {
    if (!selected || !postsCursor || loadingMorePosts || !hasMorePosts) return;
    setLoadingMorePosts(true); setError('');
    try {
      const detail = await fetchChannelPosts(selected.id, postsCursor);
      const older = Array.isArray(detail?.posts) ? detail.posts : [];
      setPosts((old) => mergeChannelPostPages(old, older));
      setPostsCursor(detail?.nextCursor || null); setHasMorePosts(Boolean(detail?.hasMore));
    } catch (err) { setError(err?.message || 'Could not load older channel posts.'); }
    finally { setLoadingMorePosts(false); }
  };

  const saveChannelDetails = async () => {
    if (!selected || !isOwner || busy) return;
    const valid = validateChannel({ title: channelTitleDraft, description: channelDescriptionDraft });
    if (!valid.ok) { Alert.alert('Check channel details', valid.error); return; }
    setBusy(true); setError('');
    try {
      const updated = await updateChannel(selected.id, { ...valid, isPrivate: selectedIsPrivateDraft });
      const merged = { ...selected, ...updated };
      setSelected(merged);
      setChannels((old) => old.map((item) => item.id === merged.id ? { ...item, ...merged } : item));
      setChannelTitleDraft(merged.title); setChannelDescriptionDraft(merged.description || ''); setEditingChannel(false);
    } catch (err) { setError(err?.message || 'Could not update channel details.'); }
    finally { setBusy(false); }
  };

  const sharePost = async (post) => {
    const body = typeof post?.body === 'string' ? post.body.trim() : '';
    if (!body || !selected) { setError('This post has no text to share.'); return; }
    try {
      await Share.share({ title: selected.title || 'ZannyChat channel post', message: `${selected.title || 'ZannyChat'}\n\n${body}` });
    } catch (err) {
      setError(err?.message || 'Could not open the share menu.');
    }
  };

  const reportPost = (post) => Alert.alert('Report channel post', 'Choose the main reason for reporting this post.', [
    { text: 'Spam', onPress: () => submitPostReport(post, 'spam') },
    { text: 'Harassment', onPress: () => submitPostReport(post, 'harassment') },
    { text: 'Hate', onPress: () => submitPostReport(post, 'hate') },
    { text: 'Misinformation', onPress: () => submitPostReport(post, 'misinformation') },
    { text: 'Other', onPress: () => submitPostReport(post, 'other') },
    { text: 'Cancel', style: 'cancel' },
  ]);

  const submitPostReport = async (post, reason) => {
    if (!selected || busy) return;
    setBusy(true); setError('');
    try {
      await reportChannelPost(selected.id, post.id, reason);
      Alert.alert('Report submitted', 'Thank you. Channel moderators can review this report.');
    } catch (err) { setError(err?.message || 'Could not submit report.'); }
    finally { setBusy(false); }
  };

  const loadChannelReports = async () => {
    if (!selected || !canModerate) return;
    setBusy(true); setError('');
    try { setChannelReports(await fetchChannelPostReports(selected.id)); setShowReports(true); }
    catch (err) { setError(err?.message || 'Could not load channel reports.'); }
    finally { setBusy(false); }
  };

  const resolveChannelReport = async (report, status) => {
    if (!selected || !canModerate || busy) return;
    setBusy(true); setError('');
    try {
      await updateChannelPostReport(selected.id, report.id, status);
      setChannelReports((old) => old.filter((item) => item.id !== report.id));
    } catch (err) { setError(err?.message || 'Could not update report.'); }
    finally { setBusy(false); }
  };

  const toggleModerator = async (member) => {
    if (!selected || !isOwner || busy) return;
    setBusy(true); setError('');
    try {
      if (member.moderator) await removeChannelModerator(selected.id, member.userId);
      else await appointChannelModerator(selected.id, member.userId);
      setModeratorMembers((old) => old.map((row) => row.userId === member.userId ? { ...row, moderator: !member.moderator } : row));
    } catch (err) { setError(err?.message || 'Could not update channel moderator.'); }
    finally { setBusy(false); }
  };

  const remove = (channel) => Alert.alert('Delete channel?', 'This permanently removes the channel, its subscriptions, and its posts.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      setBusy(true);
      try { await deleteChannel(channel.id); setChannels((old) => old.filter((item) => item.id !== channel.id)); if (selected?.id === channel.id) { setSelected(null); setPosts([]); } }
      catch (err) { setError(err?.message || 'Could not delete channel.'); }
      finally { setBusy(false); }
    } },
  ]);

  const isOwner = Boolean(selected && userId && selected.owner_id === userId);
  const isModerator = Boolean(selected?.isModerator);
  const canModerate = isOwner || isModerator;
  const buttonStyle = (disabled = false) => ({ minHeight: 42, borderRadius: radii.md, backgroundColor: disabled ? colors.border : colors.primary, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.65 : 1 });
  const buttonText = [typography.bodyStrong, { color: colors.onPrimary || colors.background }];

  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <Header title="Channels" subtitle="Discover public updates and private channels" onBack={() => selected ? setSelected(null) : navigation.goBack()} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl || spacing.xl, gap: spacing.md }}>
      {error ? <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.xs }}><Text style={[typography.body, { color: colors.danger || '#D84C4C' }]}>{error}</Text><TouchableOpacity onPress={refresh}><Text style={[typography.bodyStrong, { color: colors.primary }]}>Try again</Text></TouchableOpacity></GlassCard> : null}
      {selected ? <>
        <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
          {editingChannel && isOwner ? <>
            <TextInput value={channelTitleDraft} onChangeText={(value) => setChannelTitleDraft(value.slice(0, 60))} maxLength={60} accessibilityLabel="Edit channel name" placeholder="Channel name" placeholderTextColor={colors.textSecondary} style={[typography.body, { color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md }]} />
            <TextInput value={channelDescriptionDraft} onChangeText={(value) => setChannelDescriptionDraft(value.slice(0, 500))} maxLength={500} multiline accessibilityLabel="Edit channel description" placeholder="Description" placeholderTextColor={colors.textSecondary} style={[typography.body, { minHeight: 64, textAlignVertical: 'top', color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md }]} />
            <TouchableOpacity onPress={() => setSelectedIsPrivateDraft((value) => !value)} accessibilityRole="checkbox" accessibilityState={{ checked: selectedIsPrivateDraft }} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs }}><Ionicons name={selectedIsPrivateDraft ? 'checkbox' : 'square-outline'} size={20} color={colors.primary} /><Text style={[typography.body, { color: colors.textPrimary }]}>Private channel (invitation required)</Text></TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}><TouchableOpacity disabled={busy} onPress={saveChannelDetails} style={[buttonStyle(busy), { flex: 1 }]}><Text style={buttonText}>{busy ? 'Please wait…' : 'Save details'}</Text></TouchableOpacity><TouchableOpacity disabled={busy} onPress={() => { setEditingChannel(false); setChannelTitleDraft(selected.title); setChannelDescriptionDraft(selected.description || ''); }} style={[buttonStyle(busy), { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}><Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Cancel</Text></TouchableOpacity></View>
          </> : <>
            <Text style={[typography.title, { color: colors.textPrimary }]}>{selected.is_private ? '🔒 ' : ''}{selected.title}</Text>
            {selected.description ? <Text style={[typography.body, { color: colors.textSecondary }]}>{selected.description}</Text> : null}
          </>}
          <Text style={[typography.caption, { color: colors.textSecondary }]}>{selected.subscriberCount || 0} subscribers</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
            {!isOwner ? <TouchableOpacity disabled={busy} onPress={() => toggleSubscription(selected)} style={buttonStyle(busy)}><Text style={buttonText}>{selected.subscribed ? 'Unsubscribe' : 'Subscribe'}</Text></TouchableOpacity> : null}
            {isOwner ? <TouchableOpacity disabled={busy} onPress={() => { setEditingChannel((value) => !value); setChannelTitleDraft(selected.title); setChannelDescriptionDraft(selected.description || ''); setSelectedIsPrivateDraft(Boolean(selected.is_private)); }} style={[buttonStyle(busy), { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}><Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{editingChannel ? 'Close settings' : 'Edit details'}</Text></TouchableOpacity> : null}
            {isOwner ? <TouchableOpacity disabled={busy} onPress={shareChannelInvite} style={[buttonStyle(busy), { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}><Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Create invite</Text></TouchableOpacity> : null}
            {isOwner ? <TouchableOpacity disabled={busy} onPress={() => remove(selected)} style={[buttonStyle(busy), { backgroundColor: colors.danger || '#D84C4C' }]}><Text style={buttonText}>Delete channel</Text></TouchableOpacity> : null}
            {canModerate ? <TouchableOpacity disabled={busy} onPress={showReports ? () => setShowReports(false) : loadChannelReports} style={[buttonStyle(busy), { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}><Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{showReports ? 'Hide reports' : 'Review reports'}</Text></TouchableOpacity> : null}
            <TouchableOpacity disabled={busy} onPress={() => setSelected(null)} style={[buttonStyle(busy), { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}><Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Directory</Text></TouchableOpacity>
          </View>
        </GlassCard>
        {isOwner ? <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
          <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Channel moderators</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Only subscribers can be moderators. Moderators can pin posts and remove posts/comments, but cannot publish or edit posts or delete the channel.</Text>
          {moderatorMembers.map((member) => <View key={member.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}><View style={{ flex: 1 }}><Text style={[typography.body, { color: colors.textPrimary }]}>{member.name}</Text><Text style={[typography.caption, { color: colors.textSecondary }]}>{member.moderator ? 'Moderator' : 'Subscriber'}</Text></View><TouchableOpacity disabled={busy} onPress={() => toggleModerator(member)} style={[buttonStyle(busy), { minHeight: 36 }]}><Text style={buttonText}>{member.moderator ? 'Remove role' : 'Make moderator'}</Text></TouchableOpacity></View>)}
          {!moderatorMembers.length ? <Text style={[typography.caption, { color: colors.textSecondary }]}>No subscribers available to appoint yet.</Text> : null}
        </GlassCard> : null}
        {isOwner ? <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
          <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Channel invitations</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Invitation tokens are shown only when created. Revoke a token if it was shared with the wrong person.</Text>
          {channelInvites.map((invite) => <View key={invite.id} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}><View style={{ flex: 1, gap: 2 }}><Text style={[typography.body, { color: colors.textPrimary }]}>{invite.revoked_at ? 'Revoked' : new Date(invite.expires_at).getTime() <= Date.now() ? 'Expired' : 'Active'} · {invite.use_count}/{invite.max_uses} uses</Text><Text style={[typography.caption, { color: colors.textSecondary }]}>Expires {dateLabel(invite.expires_at)}</Text></View>{!invite.revoked_at && new Date(invite.expires_at).getTime() > Date.now() ? <TouchableOpacity disabled={busy} onPress={() => revokeInvite(invite)} style={[buttonStyle(busy), { minHeight: 36, backgroundColor: colors.danger || '#D84C4C' }]}><Text style={buttonText}>Revoke</Text></TouchableOpacity> : null}</View>)}
          {!channelInvites.length ? <Text style={[typography.caption, { color: colors.textSecondary }]}>No invitations created yet. Use “Create invite” to share one.</Text> : null}
        </GlassCard> : null}
        {showReports && canModerate ? <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
          <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Open post reports</Text>
          {channelReports.map((report) => <View key={report.id} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, gap: spacing.xs }}><Text style={[typography.caption, { color: colors.textSecondary }]}>{report.reason.toUpperCase()} · {report.reporterName} · {dateLabel(report.created_at)}</Text><Text style={[typography.body, { color: colors.textPrimary }]} numberOfLines={4}>{report.postBody}</Text>{report.details ? <Text style={[typography.caption, { color: colors.textSecondary }]}>{report.details}</Text> : null}<View style={{ flexDirection: 'row', gap: spacing.sm }}><TouchableOpacity disabled={busy} onPress={() => resolveChannelReport(report, 'reviewed')} style={[buttonStyle(busy), { flex: 1 }]}><Text style={buttonText}>Mark reviewed</Text></TouchableOpacity><TouchableOpacity disabled={busy} onPress={() => resolveChannelReport(report, 'dismissed')} style={[buttonStyle(busy), { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}><Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Dismiss</Text></TouchableOpacity></View></View>)}
          {!channelReports.length ? <Text style={[typography.caption, { color: colors.textSecondary }]}>No open reports.</Text> : null}
        </GlassCard> : null}
        {isOwner ? <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
          <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Publish an update</Text>
          <View accessibilityLabel="Quick emojis for channel post" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>{QUICK_COMPOSER_EMOJIS.map((emoji) => <TouchableOpacity key={emoji} onPress={() => { const draft = normalizeChannelPostDraft(`${postText}${emoji}`); setPostText(draft); const key = channelPostDraftKey(selected.id, userId); if (key) saveChannelPostDraft(AsyncStorage, key, draft).catch(() => {}); }} accessibilityRole="button" accessibilityLabel={`Insert ${emoji} into channel post`} style={{ padding: spacing.xs, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border }}><Text>{emoji}</Text></TouchableOpacity>)}</View>
          <TextInput value={postText} onChangeText={(value) => { const draft = normalizeChannelPostDraft(value); setPostText(draft); const key = channelPostDraftKey(selected.id, userId); if (key) saveChannelPostDraft(AsyncStorage, key, draft).catch(() => {}); }} multiline maxLength={4000} placeholder="Write a channel post…" placeholderTextColor={colors.textSecondary} accessibilityLabel="Channel post text" style={[typography.body, { minHeight: 90, textAlignVertical: 'top', color: colors.textPrimary, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, padding: spacing.md }]} />
          <TouchableOpacity disabled={busy || !postText.trim()} onPress={publish} style={buttonStyle(busy || !postText.trim())}><Text style={buttonText}>{busy ? 'Please wait…' : 'Publish post'}</Text></TouchableOpacity>
        </GlassCard> : null}
        <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Recent posts</Text>
        {busy && !posts.length ? <ActivityIndicator color={colors.primary} /> : posts.map((post) => <GlassCard key={post.id} contentStyle={{ padding: spacing.md, gap: spacing.sm }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}><Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>{post.is_pinned ? '📌 Pinned · ' : ''}{dateLabel(post.created_at)}{post.edited_at ? ' · edited' : ''} · 👁 {post.viewCount || 0}</Text>{canModerate ? <><TouchableOpacity onPress={() => togglePinnedPost(post)} accessibilityRole="button" accessibilityLabel={post.is_pinned ? 'Unpin channel post' : 'Pin channel post'}><Ionicons name={post.is_pinned ? 'pin' : 'pin-outline'} size={18} color={post.is_pinned ? colors.primary : colors.textSecondary} /></TouchableOpacity>{isOwner ? <TouchableOpacity onPress={() => editingPostId === post.id ? (setEditingPostId(null), setEditPostDraft('')) : beginEditPost(post)} accessibilityRole="button" accessibilityLabel="Edit channel post"><Ionicons name={editingPostId === post.id ? 'close' : 'create-outline'} size={18} color={colors.primary} /></TouchableOpacity> : null}<TouchableOpacity onPress={() => removePost(post)} accessibilityRole="button" accessibilityLabel="Delete channel post"><Ionicons name="trash-outline" size={17} color={colors.danger || '#D84C4C'} /></TouchableOpacity></> : null}</View><View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}><TouchableOpacity onPress={() => sharePost(post)} accessibilityRole="button" accessibilityLabel="Share channel post" style={{ alignSelf: 'flex-start', paddingVertical: spacing.xs }}><Text style={[typography.caption, { color: colors.primary }]}>Share post</Text></TouchableOpacity><TouchableOpacity disabled={busy || post.author_id === userId} onPress={() => reportPost(post)} accessibilityRole="button" accessibilityLabel="Report channel post" style={{ alignSelf: 'flex-start', paddingVertical: spacing.xs }}><Text style={[typography.caption, { color: colors.textSecondary }]}>Report post</Text></TouchableOpacity></View>{editingPostId === post.id ? <><View accessibilityLabel="Quick emojis for editing channel post" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>{QUICK_COMPOSER_EMOJIS.slice(0, 12).map((emoji) => <TouchableOpacity key={emoji} onPress={() => setEditPostDraft((value) => `${value}${emoji}`.slice(0, 4000))} accessibilityRole="button" accessibilityLabel={`Insert ${emoji} into edited post`} style={{ padding: spacing.xs, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border }}><Text>{emoji}</Text></TouchableOpacity>)}</View><TextInput value={editPostDraft} onChangeText={(value) => setEditPostDraft(value.slice(0, 4000))} multiline maxLength={4000} accessibilityLabel="Edit channel post text" style={[typography.body, { minHeight: 80, textAlignVertical: 'top', color: colors.textPrimary, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, padding: spacing.sm }]} /><TouchableOpacity disabled={busy || !editPostDraft.trim()} onPress={() => saveEditedPost(post)} style={buttonStyle(busy || !editPostDraft.trim())}><Text style={buttonText}>{busy ? 'Please wait…' : 'Save changes'}</Text></TouchableOpacity></> : <><Text style={[typography.body, { color: colors.textPrimary }]}>{post.body}</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>{['👍', '❤️', '😂', '😮', '👏'].map((emoji) => { const count = post.reactionCounts?.[emoji] || 0; const active = post.myReaction === emoji; return <TouchableOpacity key={emoji} disabled={busy} onPress={() => reactToPost(post, emoji)} accessibilityRole="button" accessibilityLabel={`${emoji} reaction${count ? `, ${count}` : ''}`} style={{ borderRadius: radii.lg, borderWidth: 1, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.surface : 'transparent', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, flexDirection: 'row', alignItems: 'center', gap: 4 }}><Text>{emoji}</Text>{count > 0 ? <Text style={[typography.caption, { color: colors.textPrimary }]}>{count}</Text> : null}</TouchableOpacity>; })}</View><TouchableOpacity onPress={() => toggleComments(post)} accessibilityRole="button" accessibilityLabel={`${expandedComments[post.id] ? 'Hide' : 'View'} comments for post`} style={{ alignSelf: 'flex-start', paddingVertical: spacing.xs }}><Text style={[typography.bodyStrong, { color: colors.primary }]}>{expandedComments[post.id] ? 'Hide comments' : `Comments${post.commentCount ? ` (${post.commentCount})` : ''}`}</Text></TouchableOpacity>{expandedComments[post.id] ? <View style={{ gap: spacing.sm }}><Text style={[typography.caption, { color: colors.textSecondary }]}>Comments are available to channel subscribers.</Text>{(commentsByPost[post.id] || []).map((comment) => <View key={comment.id} style={{ borderLeftWidth: 2, borderLeftColor: colors.border, paddingLeft: spacing.sm, gap: 2 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}><Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>{comment.mine ? 'You' : comment.authorName} · {dateLabel(comment.created_at)}</Text>{(comment.mine || canModerate) ? <TouchableOpacity onPress={() => removeComment(post, comment)} accessibilityRole="button" accessibilityLabel="Delete comment"><Ionicons name="trash-outline" size={15} color={colors.danger || '#D84C4C'} /></TouchableOpacity> : null}</View><Text style={[typography.body, { color: colors.textPrimary }]}>{comment.body}</Text></View>)}{commentsByPost[post.id] && !commentsByPost[post.id].length ? <Text style={[typography.caption, { color: colors.textSecondary }]}>No comments yet.</Text> : null}{(selected.subscribed || isOwner) ? <><View accessibilityLabel="Quick emojis for comment" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>{QUICK_COMPOSER_EMOJIS.slice(0, 12).map((emoji) => <TouchableOpacity key={emoji} onPress={() => setCommentDrafts((old) => ({ ...old, [post.id]: `${old[post.id] || ''}${emoji}`.slice(0, 1000) }))} accessibilityRole="button" accessibilityLabel={`Insert ${emoji} into comment`} style={{ padding: spacing.xs, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border }}><Text>{emoji}</Text></TouchableOpacity>)}</View><TextInput value={commentDrafts[post.id] || ''} onChangeText={(value) => setCommentDrafts((old) => ({ ...old, [post.id]: value.slice(0, 1000) }))} maxLength={1000} multiline placeholder="Write a comment…" placeholderTextColor={colors.textSecondary} accessibilityLabel="Write a channel post comment" style={[typography.body, { minHeight: 48, textAlignVertical: 'top', color: colors.textPrimary, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, padding: spacing.sm }]} /><TouchableOpacity disabled={busy || !(commentDrafts[post.id] || '').trim()} onPress={() => sendComment(post)} style={buttonStyle(busy || !(commentDrafts[post.id] || '').trim())}><Text style={buttonText}>{busy ? 'Please wait…' : 'Comment'}</Text></TouchableOpacity></> : <TouchableOpacity onPress={() => toggleSubscription(selected)} disabled={busy} style={buttonStyle(busy)}><Text style={buttonText}>Subscribe to comment</Text></TouchableOpacity>}</View> : null}</>}</GlassCard>)}
        {!posts.length && !busy ? <Text style={[typography.body, { color: colors.textSecondary }]}>No posts yet.</Text> : null}
        {hasMorePosts ? <TouchableOpacity disabled={loadingMorePosts || busy} onPress={loadOlderPosts} style={buttonStyle(loadingMorePosts || busy)} accessibilityRole="button" accessibilityLabel="Load older channel posts"><Text style={buttonText}>{loadingMorePosts ? 'Loading older posts…' : 'Load older posts'}</Text></TouchableOpacity> : null}
      </> : <>
        <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
          <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Create a channel</Text>
          <TextInput value={title} onChangeText={setTitle} maxLength={60} placeholder="Channel name" placeholderTextColor={colors.textSecondary} accessibilityLabel="Channel name" style={[typography.body, { color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md }]} />
          <TextInput value={description} onChangeText={setDescription} maxLength={500} multiline placeholder="Description (optional)" placeholderTextColor={colors.textSecondary} accessibilityLabel="Channel description" style={[typography.body, { color: colors.textPrimary, minHeight: 64, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md }]} />
          <TouchableOpacity onPress={() => setIsPrivateDraft((value) => !value)} accessibilityRole="checkbox" accessibilityState={{ checked: isPrivateDraft }} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs }}><Ionicons name={isPrivateDraft ? 'checkbox' : 'square-outline'} size={20} color={colors.primary} /><Text style={[typography.body, { color: colors.textPrimary }]}>Private channel (invitation required)</Text></TouchableOpacity>
          <TouchableOpacity disabled={busy} onPress={create} style={buttonStyle(busy)}><Text style={buttonText}>{busy ? 'Please wait…' : 'Create channel'}</Text></TouchableOpacity>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Public channels appear in discovery. Private channels are hidden until you join by invitation. Only the owner can publish posts or delete the channel.</Text>
        </GlassCard>
        <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}><Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Join a private channel</Text><TextInput value={inviteTokenDraft} onChangeText={setInviteTokenDraft} autoCapitalize="none" autoCorrect={false} accessibilityLabel="Channel invitation token" placeholder="Paste invitation token" placeholderTextColor={colors.textSecondary} style={[typography.body, { color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md }]} /><TouchableOpacity disabled={busy || !inviteTokenDraft.trim()} onPress={joinChannelInvite} style={buttonStyle(busy || !inviteTokenDraft.trim())}><Text style={buttonText}>{busy ? 'Please wait…' : 'Join with invitation'}</Text></TouchableOpacity></GlassCard>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={[typography.bodyStrong, { color: colors.textPrimary, flex: 1 }]}>Discover channels</Text><TouchableOpacity onPress={refresh} accessibilityRole="button" accessibilityLabel="Refresh channels"><Ionicons name="refresh" size={20} color={colors.primary} /></TouchableOpacity></View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}><TextInput value={channelSearch} onChangeText={(value) => { channelSearchRef.current = value; setChannelSearch(value); }} onSubmitEditing={refresh} returnKeyType="search" maxLength={80} placeholder="Search channel names and descriptions" placeholderTextColor={colors.textSecondary} accessibilityLabel="Search channels" style={[typography.body, { flex: 1, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md }]} /><TouchableOpacity onPress={refresh} disabled={loading} accessibilityRole="button" accessibilityLabel="Search channels" style={buttonStyle(loading)}><Text style={buttonText}>Search</Text></TouchableOpacity>{channelSearch ? <TouchableOpacity onPress={() => { channelSearchRef.current = ''; setChannelSearch(''); refresh(); }} accessibilityRole="button" accessibilityLabel="Clear channel search"><Ionicons name="close-circle" size={20} color={colors.textSecondary} /></TouchableOpacity> : null}</View>
        {loading ? <ActivityIndicator color={colors.primary} /> : channels.map((channel) => <TouchableOpacity key={channel.id} onPress={() => openChannel(channel)} accessibilityRole="button" accessibilityLabel={`Open ${channel.title}`}><GlassCard style={{ marginBottom: spacing.sm }} contentStyle={{ padding: spacing.md, gap: spacing.xs }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ flex: 1 }}><Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{channel.is_private ? '🔒 ' : ''}{channel.title}</Text><Text style={[typography.caption, { color: colors.textSecondary }]}>{channel.is_private ? 'Private · ' : ''}{channel.subscriberCount || 0} subscribers{channel.subscribed ? ' · Subscribed' : ''}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.textSecondary} /></View>{channel.description ? <Text style={[typography.body, { color: colors.textSecondary }]} numberOfLines={2}>{channel.description}</Text> : null}</GlassCard></TouchableOpacity>)}
        {!loading && !channels.length ? <View style={{ padding: spacing.lg, alignItems: 'center' }}><Ionicons name="megaphone-outline" size={32} color={colors.textSecondary} /><Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>No channels yet. Create one to start sharing public updates.</Text></View> : null}
      </>}
    </ScrollView>
  </SafeAreaView>;
}
