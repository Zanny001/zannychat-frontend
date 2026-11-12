import React, { useCallback, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Alert, Share, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../theme/ThemeContext';
import { backendFetch } from '../services/backendClient';
import { acceptChannelInvite, appointChannelModerator, createChannel, createChannelInvite, deleteChannel, deleteChannelPost, deleteChannelPostComment, fetchChannelInvites, fetchChannelModerators, fetchChannelPostComments, fetchChannelPosts, getCurrentUser, listChannels, publishChannelPost, publishChannelPostComment, removeChannelModerator, revokeChannelInvite, reportChannelPost, reportChannelPostComment, fetchChannelPostReports, updateChannelPostReport, setChannelPostPinned, setChannelPostReaction, setChannelPostCommentReaction, subscribeToChannel, unsubscribeFromChannel, updateChannel, updateChannelPost, updateChannelPostComment } from '../services/api';
import { normalizeChannelPost, validateChannel } from '../utils/channelValidation';
import { mergeChannelPostPages } from '../utils/channelPagination';
import { mergeChannelCommentPages } from '../utils/channelCommentPagination';
import { channelPostDraftKey, normalizeChannelPostDraft } from '../utils/channelDrafts';
import { clearChannelPostDraft, saveChannelPostDraft } from '../utils/channelDraftStorage';
import { clearChannelPublishRequest, getChannelPublishRequest, markChannelPublishRequestComplete } from '../utils/channelPublishRequest';
import { isCurrentChannelRequest } from '../utils/channelRequestGuard';
import { filterChannelDirectory, getChannelDirectoryCounts } from '../utils/channelDirectory';

const QUICK_COMPOSER_EMOJIS = ['😀', '😂', '🥰', '😍', '😊', '🙏', '👍', '👏', '❤️', '🔥', '🎉', '💯', '✨', '😢', '😮', '🇳🇬'];

function dateLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

export default function ChannelsScreen({ navigation }) {
  const { colors, spacing, radii, typography } = useTheme();
  const [channels, setChannels] = useState([]);
  const [liveStreams, setLiveStreams] = useState([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState('');
  const [channelSearch, setChannelSearch] = useState('');
  const [directoryFilter, setDirectoryFilter] = useState('all');
  const [recentChannelIds, setRecentChannelIds] = useState([]);
  const channelSearchRef = useRef('');
  const [selected, setSelected] = useState(null);
  const [posts, setPosts] = useState([]);
  const [postsCursor, setPostsCursor] = useState(null);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [expandedComments, setExpandedComments] = useState({});
  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentPaginationByPost, setCommentPaginationByPost] = useState({});
  const [loadingOlderCommentsByPost, setLoadingOlderCommentsByPost] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentDraft, setEditCommentDraft] = useState('');
  const [moderatorMembers, setModeratorMembers] = useState([]);
  const [channelInvites, setChannelInvites] = useState([]);
  const [channelReports, setChannelReports] = useState([]);
  const [channelReportsCursor, setChannelReportsCursor] = useState(null);
  const [channelReportsHasMore, setChannelReportsHasMore] = useState(false);
  const [loadingMoreReports, setLoadingMoreReports] = useState(false);
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
  const refreshRequestRef = useRef(0);
  const openChannelRequestRef = useRef(0);
  const publishRequestIdRef = useRef(null);
  const publishRequestBodyRef = useRef(null);
  const publishingRef = useRef(false);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editPostDraft, setEditPostDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const clearSelectedChannel = useCallback(() => {
    setSelected(null); setPosts([]); setPostsCursor(null); setHasMorePosts(false);
    setModeratorMembers([]); setChannelInvites([]); setChannelReports([]); setChannelReportsCursor(null); setChannelReportsHasMore(false); setLoadingMoreReports(false); setShowReports(false);
    setExpandedComments({}); setCommentsByPost({}); setCommentPaginationByPost({}); setLoadingOlderCommentsByPost({}); setCommentDrafts({}); setEditingCommentId(null); setEditCommentDraft('');
    setEditingChannel(false); setEditingPostId(null); setEditPostDraft(''); setPostText('');
  }, []);

  const refresh = useCallback(async () => {
    const requestId = ++refreshRequestRef.current;
    const requestedQuery = channelSearchRef.current;
    const isCurrent = () => isCurrentChannelRequest(requestId, refreshRequestRef.current, requestedQuery, channelSearchRef.current);
    setLoading(true); setError('');
    try {
      const [rows, user] = await Promise.all([listChannels(requestedQuery), getCurrentUser()]);
      if (!isCurrent()) return;
      const safeRows = Array.isArray(rows) ? rows : [];
      setChannels(safeRows);
      setUserId(user?.id || null);
      if (user?.id) {
        try {
          const savedRecent = await AsyncStorage.getItem(`zannychat:recent-channels:${user.id}`);
          const parsedRecent = savedRecent ? JSON.parse(savedRecent) : [];
          setRecentChannelIds(Array.isArray(parsedRecent) ? parsedRecent.filter((id) => typeof id === 'string').slice(0, 20) : []);
        } catch { setRecentChannelIds([]); }
      } else setRecentChannelIds([]);
      if (selected) {
        const latest = safeRows.find((item) => item.id === selected.id);
        if (latest) {
          const detail = await fetchChannelPosts(latest.id);
          if (!isCurrent()) return;
          setSelected(detail?.channel || latest);
          setChannelTitleDraft((detail?.channel || latest).title || ''); setChannelDescriptionDraft((detail?.channel || latest).description || ''); setSelectedIsPrivateDraft(Boolean((detail?.channel || latest).is_private));
          setPosts(Array.isArray(detail?.posts) ? detail.posts : []); setPostsCursor(detail?.nextCursor || null); setHasMorePosts(Boolean(detail?.hasMore));
          if (latest.owner_id === user?.id) {
            const [members, invites] = await Promise.all([fetchChannelModerators(latest.id), fetchChannelInvites(latest.id)]);
            if (!isCurrent()) return;
            setModeratorMembers(Array.isArray(members) ? members : []); setChannelInvites(Array.isArray(invites) ? invites : []);
          } else { setModeratorMembers([]); setChannelInvites([]); }
        } else {
          // A selected channel can disappear (for example, it was deleted or the search changed).
          // Clear every channel-scoped cache so private invite/moderator/report data cannot linger.
          clearSelectedChannel();
        }
      }
    } catch (err) { if (isCurrent()) setError(err?.message || 'Could not load channels. Check your connection and try again.'); }
    finally { if (isCurrent()) setLoading(false); }
  }, [selected?.id, clearSelectedChannel]);
  const refreshLive = useCallback(async () => {
    setLiveLoading(true);
    try {
      const result = await backendFetch('/live');
      setLiveStreams(Array.isArray(result?.streams) ? result.streams.slice(0, 4) : []);
      setLiveError('');
    } catch (err) {
      setLiveStreams([]);
      setLiveError(err?.message || 'LIVE discovery is temporarily unavailable.');
    } finally {
      setLiveLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    refresh();
    refreshLive();
  }, [refresh, refreshLive]));

  const joinLive = async (stream) => {
    if (!stream?.id || busy) return;
    setBusy(true);
    try {
      const connection = await backendFetch('/live/' + encodeURIComponent(stream.id) + '/join', { method: 'POST' });
      if (!connection?.stream?.id || !connection?.livekitUrl || !connection?.token) {
        throw new Error(connection?.message || 'The LIVE room connection is incomplete. Please try again.');
      }
      navigation.navigate('LiveStream', { connection, creatorMode: connection.role === 'creator' });
    } catch (err) {
      Alert.alert('Could not join LIVE', err?.message || 'This stream may have ended or requires an invitation.');
    } finally {
      setBusy(false);
    }
  };

  const openChannel = async (channel) => {
    if (userId && typeof channel?.id === 'string') {
      try {
        const key = `zannychat:recent-channels:${userId}`;
        const stored = await AsyncStorage.getItem(key);
        const prior = stored ? JSON.parse(stored) : recentChannelIds;
        const next = [channel.id, ...(Array.isArray(prior) ? prior : recentChannelIds).filter((id) => id !== channel.id && typeof id === 'string')].slice(0, 20);
        setRecentChannelIds(next);
        await AsyncStorage.setItem(key, JSON.stringify(next));
      } catch { /* Channel navigation remains available when local history cannot be saved. */ }
    }
    const requestId = ++openChannelRequestRef.current;
    const isCurrent = () => requestId === openChannelRequestRef.current;
    setBusy(true); setError('');
    try {
      const detail = await fetchChannelPosts(channel.id);
      if (!isCurrent()) return;
      const selectedChannel = detail?.channel || channel;
      setSelected(selectedChannel); setPosts(Array.isArray(detail?.posts) ? detail.posts : []); setPostsCursor(detail?.nextCursor || null); setHasMorePosts(Boolean(detail?.hasMore));
      try { setPostText(normalizeChannelPostDraft(await AsyncStorage.getItem(channelPostDraftKey(selectedChannel.id, userId)))); } catch { if (isCurrent()) setPostText(''); }
      if (!isCurrent()) return;
      setChannelTitleDraft(selectedChannel.title || ''); setChannelDescriptionDraft(selectedChannel.description || ''); setSelectedIsPrivateDraft(Boolean(selectedChannel.is_private)); setEditingChannel(false);
      if (selectedChannel.owner_id === userId) {
        const [members, invites] = await Promise.all([fetchChannelModerators(channel.id), fetchChannelInvites(channel.id)]);
        if (!isCurrent()) return;
        setModeratorMembers(Array.isArray(members) ? members : []); setChannelInvites(Array.isArray(invites) ? invites : []);
      } else { setModeratorMembers([]); setChannelInvites([]); }
    } catch (err) { if (isCurrent()) setError(err?.message || 'Could not open this channel.'); }
    finally { if (isCurrent()) setBusy(false); }
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
    if (publishingRef.current) return;
    if (!selected || !body) { Alert.alert('Write a post', 'Enter a message before publishing.'); return; }
    publishingRef.current = true;
    setBusy(true); setError('');
    const draftKey = channelPostDraftKey(selected.id, userId);
    const requestKey = draftKey ? `${draftKey}:publish-request:v1` : null;
    try {
      // Persist the idempotency key before the network call so retries after
      // a timeout or app restart cannot accidentally create duplicate posts.
      const requestId = await getChannelPublishRequest(AsyncStorage, requestKey, body);
      publishRequestIdRef.current = requestId;
      publishRequestBodyRef.current = body;
      const post = await publishChannelPost(selected.id, body, requestId);
      setPosts((old) => mergeChannelPostPages(old, [post])); setPostText('');
      publishRequestIdRef.current = null;
      publishRequestBodyRef.current = null;
      try { await markChannelPublishRequestComplete(AsyncStorage, requestKey); } catch { /* Completion marker is best effort; the successful response is authoritative. */ }
      try { await clearChannelPublishRequest(AsyncStorage, requestKey); } catch { /* The stored key is safe to keep; the next different body gets a new key. */ }
      try { await clearChannelPostDraft(AsyncStorage, draftKey); } catch { /* Keep publishing successful even if local draft cleanup fails. */ }
    } catch (err) { setError(err?.message || 'Could not publish post. Retry safely without creating a duplicate.'); }
    finally { publishingRef.current = false; setBusy(false); }
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
      const page = await fetchChannelPostComments(selected.id, post.id);
      setCommentsByPost((old) => ({ ...old, [post.id]: page.comments }));
      setCommentPaginationByPost((old) => ({ ...old, [post.id]: { nextCursor: page.nextCursor, hasMore: page.hasMore } }));
    } catch (err) { setError(err?.message || 'Could not load comments.'); }
  };

  const loadOlderComments = async (post) => {
    if (!selected || loadingOlderCommentsByPost[post.id]) return;
    const pagination = commentPaginationByPost[post.id];
    if (!pagination?.hasMore || !pagination.nextCursor) return;
    setLoadingOlderCommentsByPost((old) => ({ ...old, [post.id]: true }));
    setError('');
    try {
      const page = await fetchChannelPostComments(selected.id, post.id, pagination.nextCursor);
      setCommentsByPost((old) => ({
        ...old,
        [post.id]: mergeChannelCommentPages(old[post.id], page.comments),
      }));
      setCommentPaginationByPost((old) => ({ ...old, [post.id]: { nextCursor: page.nextCursor, hasMore: page.hasMore } }));
    } catch (err) { setError(err?.message || 'Could not load older comments.'); }
    finally { setLoadingOlderCommentsByPost((old) => ({ ...old, [post.id]: false })); }
  };

  const reactToComment = async (post, comment, emoji) => {
    if (!selected || busy) return;
    const nextEmoji = comment.myReaction === emoji ? null : emoji;
    setBusy(true); setError('');
    try {
      await setChannelPostCommentReaction(selected.id, post.id, comment.id, nextEmoji);
      const page = await fetchChannelPostComments(selected.id, post.id);
      setCommentsByPost((old) => ({ ...old, [post.id]: mergeChannelCommentPages(old[post.id], page.comments) }));
    } catch (err) { setError(err?.message || 'Could not save comment reaction.'); }
    finally { setBusy(false); }
  };

  const sendComment = async (post) => {
    if (!selected) return;
    const body = (commentDrafts[post.id] || '').trim();
    if (!body) return;
    if (!selected.subscribed && !isOwner) { setError('Subscribe to this channel before commenting.'); return; }
    setBusy(true); setError('');
    try {
      const comment = await publishChannelPostComment(selected.id, post.id, body);
      setCommentsByPost((old) => ({ ...old, [post.id]: mergeChannelCommentPages(old[post.id], [comment]) }));
      setCommentDrafts((old) => ({ ...old, [post.id]: '' }));
    } catch (err) { setError(err?.message || 'Could not publish comment.'); }
    finally { setBusy(false); }
  };

  const saveEditedComment = async (post, comment) => {
    if (!selected || !comment.mine || busy) return;
    const body = editCommentDraft.trim();
    if (!body) { setError('Comment cannot be empty.'); return; }
    setBusy(true); setError('');
    try {
      const updated = await updateChannelPostComment(selected.id, post.id, comment.id, body);
      setCommentsByPost((old) => ({ ...old, [post.id]: mergeChannelCommentPages(old[post.id], [updated]) }));
      setEditingCommentId(null); setEditCommentDraft('');
    } catch (err) { setError(err?.message || 'Could not edit comment.'); }
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

  const reportComment = (post, comment) => Alert.alert('Report channel comment', 'Choose the main reason for reporting this comment.', [
    { text: 'Spam', onPress: () => submitCommentReport(post, comment, 'spam') },
    { text: 'Harassment', onPress: () => submitCommentReport(post, comment, 'harassment') },
    { text: 'Hate', onPress: () => submitCommentReport(post, comment, 'hate') },
    { text: 'Misinformation', onPress: () => submitCommentReport(post, comment, 'misinformation') },
    { text: 'Other', onPress: () => submitCommentReport(post, comment, 'other') },
    { text: 'Cancel', style: 'cancel' },
  ]);

  const submitCommentReport = async (post, comment, reason) => {
    if (!selected || busy || comment.mine) return;
    setBusy(true); setError('');
    try {
      await reportChannelPostComment(selected.id, post.id, comment.id, reason);
      Alert.alert('Report submitted', 'Thank you. Channel moderators can review this report.');
    } catch (err) { setError(err?.message || 'Could not submit comment report.'); }
    finally { setBusy(false); }
  };

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
    try {
      const page = await fetchChannelPostReports(selected.id);
      setChannelReports(page.reports); setChannelReportsCursor(page.nextCursor); setChannelReportsHasMore(page.hasMore); setShowReports(true);
    } catch (err) { setError(err?.message || 'Could not load channel reports.'); }
    finally { setBusy(false); }
  };

  const loadMoreChannelReports = async () => {
    if (!selected || !canModerate || !channelReportsHasMore || !channelReportsCursor || loadingMoreReports) return;
    setLoadingMoreReports(true); setError('');
    try {
      const page = await fetchChannelPostReports(selected.id, channelReportsCursor);
      setChannelReports((old) => { const seen = new Set(old.map((item) => item.id)); return [...old, ...page.reports.filter((item) => !seen.has(item.id))]; });
      setChannelReportsCursor(page.nextCursor); setChannelReportsHasMore(page.hasMore);
    } catch (err) { setError(err?.message || 'Could not load more channel reports.'); }
    finally { setLoadingMoreReports(false); }
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
      try { await deleteChannel(channel.id); setChannels((old) => old.filter((item) => item.id !== channel.id)); if (selected?.id === channel.id) clearSelectedChannel(); }
      catch (err) { setError(err?.message || 'Could not delete channel.'); }
      finally { setBusy(false); }
    } },
  ]);

  const directoryCounts = getChannelDirectoryCounts(channels);
  const visibleChannels = filterChannelDirectory(channels, directoryFilter);
  const isOwner = Boolean(selected && userId && selected.owner_id === userId);
  const isModerator = Boolean(selected?.isModerator);
  const canModerate = isOwner || isModerator;
  const buttonStyle = (disabled = false) => ({ minHeight: 42, borderRadius: radii.md, backgroundColor: disabled ? colors.border : colors.primary, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.65 : 1 });
  const buttonText = [typography.bodyStrong, { color: colors.onPrimary || colors.background }];

  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <Header title={selected ? "Channel" : "Explore"} subtitle={selected ? selected.title : "LIVE, public channels and communities"} onBack={() => selected ? clearSelectedChannel() : navigation.goBack()} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl || spacing.xl, gap: spacing.md }}>
      <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ width: 42, height: 42, borderRadius: radii.md, backgroundColor: '#FCE8ED', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="radio" size={21} color="#D83A59" /></View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>ZannyChat LIVE</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Broadcast or watch live video with audience chat.</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('LiveHub')} accessibilityRole="button" accessibilityLabel="Open creator LIVE" style={[buttonStyle(false), { minHeight: 38 }]}><Text style={buttonText}>Open</Text></TouchableOpacity>
        </View>
      </GlassCard>
      {!selected ? (
        <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary, flex: 1 }]}>Live now</Text>
            <TouchableOpacity onPress={() => navigation.navigate('LiveHub')} accessibilityRole="button" accessibilityLabel="See all LIVE streams" style={{ minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing.xs }}>
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '800' }]}>See all</Text>
            </TouchableOpacity>
          </View>
          {liveLoading ? <ActivityIndicator color={colors.primary} /> : liveError ? (
            <View style={{ gap: spacing.xs }}>
              <Text accessibilityRole="alert" style={[typography.caption, { color: colors.textSecondary }]}>{liveError}</Text>
              <TouchableOpacity onPress={refreshLive} accessibilityRole="button" accessibilityLabel="Retry LIVE discovery" style={{ alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center' }}>
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '800' }]}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : liveStreams.length ? liveStreams.map((stream) => (
            <TouchableOpacity
              key={stream.id}
              disabled={busy}
              onPress={() => joinLive(stream)}
              accessibilityRole="button"
              accessibilityLabel={`Join LIVE: ${stream.title || 'Live broadcast'}`}
              style={{ minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.sm }}
            >
              <View style={{ width: 42, height: 42, borderRadius: radii.md, backgroundColor: '#E34D68' + '18', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="videocam" size={21} color="#E34D68" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={[typography.bodyStrong, { color: colors.textPrimary }]}>{stream.title || 'Live broadcast'}</Text>
                {!!stream.description ? <Text numberOfLines={1} style={[typography.caption, { color: colors.textSecondary }]}>{stream.description}</Text> : null}
                <Text style={[typography.small, { color: colors.success || colors.primary, marginTop: 2 }]}>● LIVE · Public</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )) : (
            <Text style={[typography.caption, { color: colors.textSecondary }]}>No public broadcasts right now. Check back soon or start your own LIVE.</Text>
          )}
        </GlassCard>
      ) : null}
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
            <TouchableOpacity disabled={busy} onPress={clearSelectedChannel} style={[buttonStyle(busy), { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}><Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Directory</Text></TouchableOpacity>
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
          <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Open channel reports</Text>
          {channelReports.map((report) => <View key={report.id} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, gap: spacing.xs }}><Text style={[typography.caption, { color: colors.textSecondary }]}>{(report.reportType === 'comment' ? 'COMMENT · ' : 'POST · ')}{report.reason.toUpperCase()} · {report.reporterName} · {dateLabel(report.created_at)}</Text><Text style={[typography.body, { color: colors.textPrimary }]} numberOfLines={4}>{report.postBody}</Text>{report.details ? <Text style={[typography.caption, { color: colors.textSecondary }]}>{report.details}</Text> : null}<View style={{ flexDirection: 'row', gap: spacing.sm }}><TouchableOpacity disabled={busy} onPress={() => resolveChannelReport(report, 'reviewed')} style={[buttonStyle(busy), { flex: 1 }]}><Text style={buttonText}>Mark reviewed</Text></TouchableOpacity><TouchableOpacity disabled={busy} onPress={() => resolveChannelReport(report, 'dismissed')} style={[buttonStyle(busy), { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}><Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Dismiss</Text></TouchableOpacity></View></View>)}
          {!channelReports.length ? <Text style={[typography.caption, { color: colors.textSecondary }]}>No open reports.</Text> : null}
          {channelReportsHasMore ? <TouchableOpacity disabled={loadingMoreReports || busy} onPress={loadMoreChannelReports} accessibilityRole="button" accessibilityLabel="Load more channel reports" style={buttonStyle(loadingMoreReports || busy)}><Text style={buttonText}>{loadingMoreReports ? 'Loading more reports…' : 'Load more reports'}</Text></TouchableOpacity> : null}
        </GlassCard> : null}
        {isOwner ? <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
          <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Publish an update</Text>
          <View accessibilityLabel="Quick emojis for channel post" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>{QUICK_COMPOSER_EMOJIS.map((emoji) => <TouchableOpacity key={emoji} onPress={() => { const draft = normalizeChannelPostDraft(`${postText}${emoji}`); setPostText(draft); const key = channelPostDraftKey(selected.id, userId); if (key) saveChannelPostDraft(AsyncStorage, key, draft).catch(() => {}); }} accessibilityRole="button" accessibilityLabel={`Insert ${emoji} into channel post`} style={{ padding: spacing.xs, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border }}><Text>{emoji}</Text></TouchableOpacity>)}</View>
          <TextInput value={postText} onChangeText={(value) => { const draft = normalizeChannelPostDraft(value); setPostText(draft); const key = channelPostDraftKey(selected.id, userId); if (key) saveChannelPostDraft(AsyncStorage, key, draft).catch(() => {}); }} multiline maxLength={4000} placeholder="Write a channel post…" placeholderTextColor={colors.textSecondary} accessibilityLabel="Channel post text" style={[typography.body, { minHeight: 90, textAlignVertical: 'top', color: colors.textPrimary, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, padding: spacing.md }]} />
          <TouchableOpacity disabled={busy || !postText.trim()} onPress={publish} style={buttonStyle(busy || !postText.trim())}><Text style={buttonText}>{busy ? 'Please wait…' : 'Publish post'}</Text></TouchableOpacity>
        </GlassCard> : null}
        <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Recent posts</Text>
        {busy && !posts.length ? <ActivityIndicator color={colors.primary} /> : posts.map((post) => <GlassCard key={post.id} contentStyle={{ padding: spacing.md, gap: spacing.sm }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}><Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>{post.is_pinned ? '📌 Pinned · ' : ''}{dateLabel(post.created_at)}{post.edited_at ? ' · edited' : ''} · 👁 {post.viewCount || 0}</Text>{canModerate ? <><TouchableOpacity onPress={() => togglePinnedPost(post)} accessibilityRole="button" accessibilityLabel={post.is_pinned ? 'Unpin channel post' : 'Pin channel post'}><Ionicons name={post.is_pinned ? 'pin' : 'pin-outline'} size={18} color={post.is_pinned ? colors.primary : colors.textSecondary} /></TouchableOpacity>{isOwner ? <TouchableOpacity onPress={() => editingPostId === post.id ? (setEditingPostId(null), setEditPostDraft('')) : beginEditPost(post)} accessibilityRole="button" accessibilityLabel="Edit channel post"><Ionicons name={editingPostId === post.id ? 'close' : 'create-outline'} size={18} color={colors.primary} /></TouchableOpacity> : null}<TouchableOpacity onPress={() => removePost(post)} accessibilityRole="button" accessibilityLabel="Delete channel post"><Ionicons name="trash-outline" size={17} color={colors.danger || '#D84C4C'} /></TouchableOpacity></> : null}</View><View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}><TouchableOpacity onPress={() => sharePost(post)} accessibilityRole="button" accessibilityLabel="Share channel post" style={{ alignSelf: 'flex-start', paddingVertical: spacing.xs }}><Text style={[typography.caption, { color: colors.primary }]}>Share post</Text></TouchableOpacity><TouchableOpacity disabled={busy || post.author_id === userId} onPress={() => reportPost(post)} accessibilityRole="button" accessibilityLabel="Report channel post" style={{ alignSelf: 'flex-start', paddingVertical: spacing.xs }}><Text style={[typography.caption, { color: colors.textSecondary }]}>Report post</Text></TouchableOpacity></View>{editingPostId === post.id ? <><View accessibilityLabel="Quick emojis for editing channel post" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>{QUICK_COMPOSER_EMOJIS.slice(0, 12).map((emoji) => <TouchableOpacity key={emoji} onPress={() => setEditPostDraft((value) => `${value}${emoji}`.slice(0, 4000))} accessibilityRole="button" accessibilityLabel={`Insert ${emoji} into edited post`} style={{ padding: spacing.xs, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border }}><Text>{emoji}</Text></TouchableOpacity>)}</View><TextInput value={editPostDraft} onChangeText={(value) => setEditPostDraft(value.slice(0, 4000))} multiline maxLength={4000} accessibilityLabel="Edit channel post text" style={[typography.body, { minHeight: 80, textAlignVertical: 'top', color: colors.textPrimary, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, padding: spacing.sm }]} /><TouchableOpacity disabled={busy || !editPostDraft.trim()} onPress={() => saveEditedPost(post)} style={buttonStyle(busy || !editPostDraft.trim())}><Text style={buttonText}>{busy ? 'Please wait…' : 'Save changes'}</Text></TouchableOpacity></> : <><Text style={[typography.body, { color: colors.textPrimary }]}>{post.body}</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>{['👍', '❤️', '😂', '😮', '👏'].map((emoji) => { const count = post.reactionCounts?.[emoji] || 0; const active = post.myReaction === emoji; return <TouchableOpacity key={emoji} disabled={busy} onPress={() => reactToPost(post, emoji)} accessibilityRole="button" accessibilityLabel={`${emoji} reaction${count ? `, ${count}` : ''}`} style={{ borderRadius: radii.lg, borderWidth: 1, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.surface : 'transparent', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, flexDirection: 'row', alignItems: 'center', gap: 4 }}><Text>{emoji}</Text>{count > 0 ? <Text style={[typography.caption, { color: colors.textPrimary }]}>{count}</Text> : null}</TouchableOpacity>; })}</View><TouchableOpacity onPress={() => toggleComments(post)} accessibilityRole="button" accessibilityLabel={`${expandedComments[post.id] ? 'Hide' : 'View'} comments for post`} style={{ alignSelf: 'flex-start', paddingVertical: spacing.xs }}><Text style={[typography.bodyStrong, { color: colors.primary }]}>{expandedComments[post.id] ? 'Hide comments' : `Comments${post.commentCount ? ` (${post.commentCount})` : ''}`}</Text></TouchableOpacity>{expandedComments[post.id] ? <View style={{ gap: spacing.sm }}><Text style={[typography.caption, { color: colors.textSecondary }]}>Comments are available to channel subscribers.</Text>{(commentsByPost[post.id] || []).map((comment) => <View key={comment.id} style={{ borderLeftWidth: 2, borderLeftColor: colors.border, paddingLeft: spacing.sm, gap: 2 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}><Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>{comment.mine ? 'You' : comment.authorName} · {dateLabel(comment.created_at)}</Text>{!comment.mine ? <TouchableOpacity disabled={busy} onPress={() => reportComment(post, comment)} accessibilityRole="button" accessibilityLabel="Report channel comment"><Ionicons name="flag-outline" size={15} color={colors.textSecondary} /></TouchableOpacity> : null}{(comment.mine || canModerate) ? <TouchableOpacity onPress={() => removeComment(post, comment)} accessibilityRole="button" accessibilityLabel="Delete comment"><Ionicons name="trash-outline" size={15} color={colors.danger || '#D84C4C'} /></TouchableOpacity> : null}</View>{editingCommentId === comment.id ? <><TextInput value={editCommentDraft} onChangeText={(value) => setEditCommentDraft(value.slice(0, 1000))} maxLength={1000} multiline accessibilityLabel="Edit your channel comment" style={[typography.body, { minHeight: 48, textAlignVertical: 'top', color: colors.textPrimary, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, padding: spacing.sm }]} /><View style={{ flexDirection: 'row', gap: spacing.sm }}><TouchableOpacity disabled={busy || !editCommentDraft.trim()} onPress={() => saveEditedComment(post, comment)} style={buttonStyle(busy || !editCommentDraft.trim())}><Text style={buttonText}>Save edit</Text></TouchableOpacity><TouchableOpacity onPress={() => { setEditingCommentId(null); setEditCommentDraft(''); }} style={{ padding: spacing.sm }}><Text style={[typography.caption, { color: colors.textSecondary }]}>Cancel</Text></TouchableOpacity></View></> : <Text style={[typography.body, { color: colors.textPrimary }]}>{comment.body}{comment.updated_at && comment.created_at && comment.updated_at !== comment.created_at ? ' · edited' : ''}</Text>}<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 3 }}>{['👍', '❤️', '😂', '😮', '👏'].map((emoji) => { const count = comment.reactionCounts?.[emoji] || 0; const active = comment.myReaction === emoji; return <TouchableOpacity key={emoji} disabled={busy} onPress={() => reactToComment(post, comment, emoji)} accessibilityRole="button" accessibilityLabel={`${emoji} comment reaction${count ? `, ${count}` : ''}`} style={{ borderRadius: radii.lg, borderWidth: 1, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.surface : 'transparent', paddingHorizontal: spacing.xs, paddingVertical: 2, flexDirection: 'row', alignItems: 'center', gap: 3 }}><Text>{emoji}</Text>{count > 0 ? <Text style={[typography.caption, { color: colors.textPrimary }]}>{count}</Text> : null}</TouchableOpacity>; })}</View>{comment.mine && editingCommentId !== comment.id ? <TouchableOpacity onPress={() => { setEditingCommentId(comment.id); setEditCommentDraft(comment.body || ''); }} accessibilityRole="button" accessibilityLabel="Edit your comment" style={{ alignSelf: 'flex-start', paddingVertical: 2 }}><Text style={[typography.caption, { color: colors.primary }]}>Edit</Text></TouchableOpacity> : null}</View>)}{commentPaginationByPost[post.id]?.hasMore ? <TouchableOpacity onPress={() => loadOlderComments(post)} disabled={Boolean(loadingOlderCommentsByPost[post.id])} accessibilityRole="button" accessibilityLabel="Load older channel comments" style={{ alignSelf: 'flex-start', paddingVertical: spacing.xs }}><Text style={[typography.caption, { color: colors.primary }]}>{loadingOlderCommentsByPost[post.id] ? 'Loading older comments…' : 'Load older comments'}</Text></TouchableOpacity> : null}{commentsByPost[post.id] && !commentsByPost[post.id].length ? <Text style={[typography.caption, { color: colors.textSecondary }]}>No comments yet.</Text> : null}{(selected.subscribed || isOwner) ? <><View accessibilityLabel="Quick emojis for comment" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>{QUICK_COMPOSER_EMOJIS.slice(0, 12).map((emoji) => <TouchableOpacity key={emoji} onPress={() => setCommentDrafts((old) => ({ ...old, [post.id]: `${old[post.id] || ''}${emoji}`.slice(0, 1000) }))} accessibilityRole="button" accessibilityLabel={`Insert ${emoji} into comment`} style={{ padding: spacing.xs, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border }}><Text>{emoji}</Text></TouchableOpacity>)}</View><TextInput value={commentDrafts[post.id] || ''} onChangeText={(value) => setCommentDrafts((old) => ({ ...old, [post.id]: value.slice(0, 1000) }))} maxLength={1000} multiline placeholder="Write a comment…" placeholderTextColor={colors.textSecondary} accessibilityLabel="Write a channel post comment" style={[typography.body, { minHeight: 48, textAlignVertical: 'top', color: colors.textPrimary, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, padding: spacing.sm }]} /><TouchableOpacity disabled={busy || !(commentDrafts[post.id] || '').trim()} onPress={() => sendComment(post)} style={buttonStyle(busy || !(commentDrafts[post.id] || '').trim())}><Text style={buttonText}>{busy ? 'Please wait…' : 'Comment'}</Text></TouchableOpacity></> : <TouchableOpacity onPress={() => toggleSubscription(selected)} disabled={busy} style={buttonStyle(busy)}><Text style={buttonText}>Subscribe to comment</Text></TouchableOpacity>}</View> : null}</>}</GlassCard>)}
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}><TextInput value={channelSearch} onChangeText={(value) => { refreshRequestRef.current += 1; setLoading(false); setError(''); channelSearchRef.current = value; setChannelSearch(value); }} onSubmitEditing={refresh} returnKeyType="search" maxLength={80} placeholder="Search channel names and descriptions" placeholderTextColor={colors.textSecondary} accessibilityLabel="Search channels" style={[typography.body, { flex: 1, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md }]} /><TouchableOpacity onPress={refresh} disabled={loading} accessibilityRole="button" accessibilityLabel="Search channels" style={buttonStyle(loading)}><Text style={buttonText}>Search</Text></TouchableOpacity>{channelSearch ? <TouchableOpacity onPress={() => { refreshRequestRef.current += 1; channelSearchRef.current = ''; setChannelSearch(''); refresh(); }} accessibilityRole="button" accessibilityLabel="Clear channel search"><Ionicons name="close-circle" size={20} color={colors.textSecondary} /></TouchableOpacity> : null}</View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs, paddingVertical: spacing.xs }} accessibilityLabel="Channel discovery filters">
          {[{ key: 'all', label: `✨ All (${directoryCounts.all})`, icon: 'apps-outline' }, { key: 'subscribed', label: `💜 Following (${directoryCounts.subscribed})`, icon: 'heart-outline' }, { key: 'popular', label: '🔥 Popular', icon: 'trending-up-outline' }, { key: 'newest', label: '🆕 Newest', icon: 'time-outline' }, { key: 'recent', label: `🕘 Recent (${directoryCounts.recent})`, icon: 'time-outline' }].map((item) => {
            const active = directoryFilter === item.key;
            return <TouchableOpacity key={item.key} onPress={() => setDirectoryFilter(item.key)} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={`Show ${item.key} channels`} style={{ minHeight: 44, borderRadius: radii.lg, paddingHorizontal: spacing.md, justifyContent: 'center', borderWidth: 1, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : colors.surface }}><Text style={[typography.caption, { fontWeight: active ? '700' : '500', color: active ? (colors.onPrimary || colors.background) : colors.textPrimary }]}>{item.label}</Text></TouchableOpacity>;
          })}
        </ScrollView>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{directoryFilter === 'popular' ? 'Sorted by subscriber count · ties keep their original order' : directoryFilter === 'newest' ? 'Newest channels first · based on channel creation date' : directoryFilter === 'subscribed' ? 'Channels you already follow' : directoryFilter === 'recent' ? 'Your recently opened channels, saved on this device' : 'Explore channels and find communities that match your interests'}</Text>
        {loading ? <ActivityIndicator color={colors.primary} /> : visibleChannels.map((channel) => <TouchableOpacity key={channel.id} onPress={() => openChannel(channel)} accessibilityRole="button" accessibilityLabel={`Open ${channel.title}`}><GlassCard style={{ marginBottom: spacing.sm }} contentStyle={{ padding: spacing.md, gap: spacing.xs }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ flex: 1 }}><Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{channel.is_private ? '🔒 ' : ''}{channel.title}</Text><Text style={[typography.caption, { color: colors.textSecondary }]}>{channel.is_private ? 'Private · ' : ''}{channel.subscriberCount || 0} subscribers{channel.subscribed ? ' · 💜 Following' : ''}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.textSecondary} /></View>{channel.description ? <Text style={[typography.body, { color: colors.textSecondary }]} numberOfLines={2}>{channel.description}</Text> : null}</GlassCard></TouchableOpacity>)}
        {!loading && !visibleChannels.length ? <View style={{ padding: spacing.lg, alignItems: 'center', gap: spacing.sm }}><Ionicons name={directoryFilter === 'subscribed' ? 'heart-outline' : directoryFilter === 'recent' ? 'time-outline' : 'megaphone-outline'} size={32} color={colors.textSecondary} /><Text style={[typography.bodyStrong, { color: colors.textPrimary, textAlign: 'center' }]}>{directoryFilter === 'subscribed' ? 'You are not following any channels yet' : directoryFilter === 'recent' ? 'No recently opened channels' : 'No channels match this view'}</Text><Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>{directoryFilter === 'subscribed' ? 'Explore all channels and subscribe to updates you enjoy.' : directoryFilter === 'recent' ? 'Open a channel and it will appear here for quick access next time.' : 'Try another filter or refresh the channel directory.'}</Text>{directoryFilter !== 'all' ? <TouchableOpacity onPress={() => setDirectoryFilter('all')} accessibilityRole="button" style={buttonStyle(false)}><Text style={buttonText}>Explore all channels</Text></TouchableOpacity> : null}</View> : null}
      </>}
    </ScrollView>
  </SafeAreaView>;
}
