import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { countReadersForMessage, resolveMessageDeliveryStatus, countDeliveredRecipients } from '../utils/readReceipts';
import { buildGroupReceiptDetails } from '../utils/groupReceiptDetails';
import {
  View,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useAudioRecorder, useAudioRecorderState, AudioModule, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import ChatBubble, { QUICK_REACTIONS } from '../components/ChatBubble';
import InputBar from '../components/InputBar';
import ActionSheet from '../components/ActionSheet';
import { hexToRgba } from '../utils/color';
import { savePendingMessage, loadPendingMessages, removePendingMessage, recordMessageRetryFailure, isMessageRetryDue } from '../services/messageOutbox';
import { savePendingAttachment, loadPendingAttachments, removePendingAttachment, recordAttachmentRetryFailure } from '../services/attachmentOutbox';
import { getAttachmentNextRetryAt, isAttachmentRetryDue } from '../utils/attachmentRetryPolicy';
import { preserveAttachmentForRetry, removePreservedAttachment } from '../utils/attachmentFileRecovery';
import {
  fetchMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  subscribeToMessages,
  fetchSmartReplies,
  summarizeConversation,
  fetchContacts,
  fetchConversations,
  createConversation,
  getCurrentUser,
  uploadChatImage,
  uploadChatFile,
  uploadVoiceNote,
  sendAttachment,
  markConversationRead,
  fetchParticipantReadState,
  subscribeToParticipantUpdates,
  markMessagesDelivered,
  fetchMessageDeliveryState,
  subscribeToMessageDeliveryReceipts,
  fetchGroupMembers,
  fetchReactions,
  toggleReaction,
  subscribeToReactions,
  subscribeToTyping,
  sendTyping,
  setConversationFlags,
  blockUser,
  reportUser,
} from '../services/api';
import { subscribePresence } from '../services/presence';
import { SUPABASE_ENABLED } from '../services/supabaseClient';
import { searchMessages } from '../utils/searchMessages';
import { resolvePhotoUploadQuality } from '../utils/mediaQuality';
import { loadMediaPreferences } from '../services/mediaPreferences';
import { loadChatCanvas } from '../services/chatAppearance';
import { saveMessageLocally } from '../services/savedMessages';
import { loadPinnedMessages, pinMessageLocally, unpinMessageLocally } from '../services/pinnedMessages';
import { isMessagePinned } from '../utils/pinnedMessages';
import { makeDraftKey } from '../utils/drafts';
import { resolveChatCanvas } from '../utils/chatAppearance';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB — enforced server-side too since 0006 (storage.buckets.file_size_limit)
const MESSAGE_PAGE_SIZE = 30;

const DAY_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "Today" / "Yesterday" / "Oct 5" — deliberately not Intl (see
// formatTimestamp in api.js for the Hermes reasoning).
function dayLabel(isoDay) {
  if (!isoDay) return '';
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const date = new Date(`${isoDay}T12:00:00`); // noon avoids DST edge flipping the day
  if (date.toDateString() === today) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return `${DAY_MONTHS[date.getMonth()]} ${date.getDate()}`;
}

export default function ChatScreen({ route, navigation }) {
  const { conversation } = route.params;
  const targetMessageId = route.params?.targetMessageId ? String(route.params.targetMessageId) : null;
  const { colors, spacing, radii, typography } = useTheme();
  const [messages, setMessages] = useState([]);
  const [chatCanvasKey, setChatCanvasKey] = useState('theme');
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editing, setEditing] = useState(null); // { id, text } while editing own message
  const [reactions, setReactions] = useState({}); // messageId -> [{ userId, emoji }]
  const [suggestions, setSuggestions] = useState([]);
  const [sendError, setSendError] = useState('');
  const [pendingOutbox, setPendingOutbox] = useState([]);
  const [retryingOutbox, setRetryingOutbox] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [retryingAttachments, setRetryingAttachments] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  // Backfilled when this screen is opened from a push notification tap,
  // which only carries a conversation id — see notifications.js. Until
  // that resolves, `display` falls back to whatever the navigator was
  // given (usually complete, from the chat list).
  const [resolved, setResolved] = useState(null);
  const display = resolved || conversation;
  const [participantReadState, setParticipantReadState] = useState({}); // userId -> last_read_at
  const [messageDeliveryState, setMessageDeliveryState] = useState({}); // messageId -> recipient user IDs
  // Per-participant flags (0006) — initialized from whatever the
  // navigator passed, updated locally on toggle. Muted conversations
  // also stop pushing to this device (enforced server-side).
  const [flags, setFlags] = useState({ isMuted: Boolean(conversation.isMuted), isArchived: Boolean(conversation.isArchived) });
  const [myUserId, setMyUserId] = useState(null);
  useEffect(() => { let active = true; Promise.all([loadPendingMessages(myUserId, conversation?.id), loadPendingAttachments(myUserId, conversation?.id)]).then(([messages, attachments]) => { if (active) { setPendingOutbox(messages); setPendingAttachments(attachments); } }); return () => { active = false; }; }, [myUserId, conversation?.id]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [peerTyping, setPeerTyping] = useState(false);
  const [onlineIds, setOnlineIds] = useState(new Set());
  // Which sheet is open: null | 'attach' | 'overflow' | { message } —
  // all three render through the same branded ActionSheet component,
  // replacing the native Alert.alert lists the audit called out as the
  // one visible break in the design system.
  const [activeSheet, setActiveSheet] = useState(null);
  const [deleteMessageTarget, setDeleteMessageTarget] = useState(null);
  const [deletingMessage, setDeletingMessage] = useState(false);
  const [deleteMessageError, setDeleteMessageError] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const listRef = useRef(null);
  const stickToBottom = useRef(true);
  const lastSuggestedFor = useRef(null);
  const senderNamesRef = useRef({}); // senderId -> name, for group message labels
  const typingTimeoutRef = useRef(null);
  const lastTypingSentRef = useRef(0);
  const handledTargetMessageRef = useRef(null);
  const targetLookupForRef = useRef(null);
  const targetLookupPagesRef = useRef(0);
  const automaticRetryInFlightRef = useRef(false);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 200);

  // The audit missed this one, but it's real: this screen used to
  // compare senderId against the mock-mode literal 'me', so in live
  // mode EVERY message rendered as "theirs". The fix is knowing the
  // actual signed-in user id and comparing against both.
  useEffect(() => {
    getCurrentUser().then((u) => setMyUserId(u?.id || 'me'));
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToMessageDeliveryReceipts(conversation.id, (receipt) => {
      if (!receipt?.message_id || !receipt?.user_id) return;
      setMessageDeliveryState((prev) => ({
        ...prev,
        [receipt.message_id]: [...new Set([...(prev[receipt.message_id] || []), receipt.user_id])],
      }));
    });
    return unsubscribe;
  }, [conversation.id]);

  useEffect(() => {
    if (!myUserId) return;
    loadPinnedMessages(myUserId).then(setPinnedMessages).catch(() => setPinnedMessages([]));
  }, [myUserId, conversation.id]);

  const isMineMessage = useCallback(
    (m) => m.senderId === 'me' || (myUserId && m.senderId === myUserId),
    [myUserId]
  );

  useEffect(() => {
    if (display.participant?.name) return;
    fetchConversations().then(({ conversations: list }) => {
      const match = list.find((c) => c.id === conversation.id);
      if (match) {
        setResolved(match);
        setFlags({ isMuted: Boolean(match.isMuted), isArchived: Boolean(match.isArchived) });
      }
    });
    // conversation.id is stable for the screen's lifetime; display is
    // deliberately excluded so this doesn't loop against its own update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  const load = useCallback(async () => {
    const { messages: data, hasMore: more } = await fetchMessages(conversation.id, { limit: MESSAGE_PAGE_SIZE });
    data.forEach((m) => {
      if (m.senderName) senderNamesRef.current[m.senderId] = m.senderName;
    });
    setMessages(data);
    fetchMessageDeliveryState(conversation.id, data.map((message) => message.id))
      .then((state) => setMessageDeliveryState((prev) => ({ ...prev, ...state }))).catch(() => {});
    markMessagesDelivered(conversation.id, data, myUserId).catch(() => {});
    setHasMore(more);
    stickToBottom.current = true;
    // Reactions ride along with the initial page — one query for all
    // visible messages, then Realtime keeps them current.
    fetchReactions(data.map((m) => m.id)).then(setReactions).catch(() => {});
  }, [conversation.id, myUserId]);

  // Older-history pagination: explicit "load earlier" affordance rather
  // than scroll-position-triggered fetching, so reading old messages
  // never yanks the list under your thumb.
  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore || messages.length === 0) return;
    setLoadingOlder(true);
    stickToBottom.current = false;
    try {
      const oldest = messages[0]?.createdAtRaw;
      const { messages: older, hasMore: more } = await fetchMessages(conversation.id, {
        limit: MESSAGE_PAGE_SIZE,
        before: oldest,
      });
      older.forEach((m) => {
        if (m.senderName) senderNamesRef.current[m.senderId] = m.senderName;
      });
      fetchMessageDeliveryState(conversation.id, older.map((message) => message.id))
        .then((state) => setMessageDeliveryState((prev) => ({ ...prev, ...state }))).catch(() => {});
      markMessagesDelivered(conversation.id, older, myUserId).catch(() => {});
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        return [...older.filter((m) => !seen.has(m.id)), ...prev];
      });
      setHasMore(more);
      fetchReactions(older.map((m) => m.id))
        .then((more) => setReactions((prev) => ({ ...prev, ...more })))
        .catch(() => {});
    } catch (err) {
      // A failed older-page fetch shouldn't take the screen down — the
      // button just stays available for another attempt.
    } finally {
      setLoadingOlder(false);
    }
  }, [conversation.id, hasMore, loadingOlder, messages, myUserId]);

  // Realtime subscription lives here (mount/unmount only) so it's
  // never torn down and recreated on every focus. Initial loading and
  // refresh-on-return are handled by useFocusEffect below.
  useEffect(() => {
    const unsubscribe = subscribeToMessages(conversation.id, (newMessage) => {
      if (newMessage?.senderId && newMessage.senderId !== myUserId) markMessagesDelivered(conversation.id, [newMessage], myUserId).catch(() => {});
      setMessages((prev) => {
        // Realtime doesn't exclude the sender — our own message, already
        // placed by handleSend's own resolution, would otherwise show up
        // a second time when this event arrives moments later.
        if (prev.some((m) => m.id === newMessage.id)) return prev;
        // Resolves replyPreview the same way fetchMessages does for an
        // initial load — this message wasn't in that batch, so it needs
        // its own lookup against what's currently on screen. Realtime
        // payloads also don't carry the sender-name join fetchMessages
        // uses, so that's backfilled from senderNamesRef — built from
        // everyone we've already seen post in this conversation. The one
        // gap: a group's very first-ever message arriving live before
        // anyone's posted before will show unlabeled until the screen
        // is reopened. Real limitation, not worth a second network
        // round-trip to close for that one case.
        const replyPreview = newMessage.replyToId
          ? prev.find((m) => m.id === newMessage.replyToId)?.text
          : undefined;
        const senderName = newMessage.senderName || senderNamesRef.current[newMessage.senderId];
        if (senderName) senderNamesRef.current[newMessage.senderId] = senderName;
        return [...prev, { ...newMessage, replyPreview, senderName }];
      });
      stickToBottom.current = true;
    });
    return unsubscribe;
  }, [conversation.id, myUserId]);

  // Live reactions: one channel for the whole app (the table is small
  // and RLS-scoped), applying changes only to messages currently on
  // screen. replica identity full (0006) is what makes DELETE events
  // carry message_id/user_id at all.
  useEffect(() => {
    const unsubscribe = subscribeToReactions((payload) => {
      const row = payload.new || payload.old;
      if (!row?.message_id) return;
      setReactions((prev) => {
        if (!(row.message_id in prev) && payload.eventType !== 'INSERT') return prev;
        const list = [...(prev[row.message_id] || [])];
        if (payload.eventType === 'DELETE') {
          return { ...prev, [row.message_id]: list.filter((r) => r.userId !== row.user_id) };
        }
        const i = list.findIndex((r) => r.userId === row.user_id);
        if (i >= 0) list[i] = { userId: row.user_id, emoji: row.emoji };
        else list.push({ userId: row.user_id, emoji: row.emoji });
        return { ...prev, [row.message_id]: list };
      });
    });
    return unsubscribe;
  }, []);

  // Typing indicators — broadcast-only (ephemeral by nature), showing
  // "typing…" for a few seconds after the peer's last keystroke event.
  useEffect(() => {
    const unsubscribe = subscribeToTyping(conversation.id, ({ userId }) => {
      if (!userId || userId === myUserId) return;
      setPeerTyping(true);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setPeerTyping(false), 4000);
    });
    return () => {
      clearTimeout(typingTimeoutRef.current);
      unsubscribe();
    };
  }, [conversation.id, myUserId]);

  // Real presence (Supabase Presence) — the header's online state comes
  // from who's actually connected right now, not a column nothing used
  // to update.
  useEffect(() => subscribePresence(setOnlineIds), []);

  // Fetches who's read up to where, then keeps that live — when the
  // other participant opens this conversation, their last_read_at
  // updates, Realtime pushes it here, and the affected bubbles' ticks
  // flip to "read" without needing a refresh.
  useEffect(() => {
    fetchParticipantReadState(conversation.id).then(setParticipantReadState);
    const unsubscribe = subscribeToParticipantUpdates(conversation.id, (updated) => {
      setParticipantReadState((prev) => ({ ...prev, [updated.user_id]: updated.last_read_at }));
    });
    return unsubscribe;
  }, [conversation.id]);

  // Marks this conversation read on every focus (not just mount) — the
  // case that matters is leaving and coming back to a conversation that
  // got new messages while you were away; the chat list's unread badge
  // needs that same last_read_at update to clear.
  useFocusEffect(
    useCallback(() => {
      markConversationRead(conversation.id).catch(() => {});
    }, [conversation.id])
  );

  // Reloads on every focus, separate from the mount effect above — the
  // case this actually matters for is coming back from sharing a
  // contact (NewChatScreen, "share" mode), which in mock mode has no
  // realtime to push the new message here any other way.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Recover queued text sends when the chat regains focus / the app returns
  // to the foreground. Stable request IDs preserve server-side idempotency;
  // bounded exponential backoff prevents a bad connection from being hammered.
  const retryQueuedTextMessages = useCallback(async () => {
    if (!myUserId || !conversation?.id || automaticRetryInFlightRef.current || AppState.currentState !== 'active') return;
    automaticRetryInFlightRef.current = true;
    try {
      const queued = await loadPendingMessages(myUserId, conversation.id);
      setPendingOutbox(queued);
      for (const item of queued) {
        if (!isMessageRetryDue(item)) continue;
        try {
          const confirmed = await sendMessage(conversation.id, item.text, item.replyToId, item.requestId);
          await removePendingMessage(myUserId, conversation.id, item.requestId);
          setPendingOutbox((items) => items.filter((entry) => entry.requestId !== item.requestId));
          setMessages((items) => items.some((entry) => entry.id === confirmed.id) ? items : [...items, confirmed]);
          stickToBottom.current = true;
        } catch (error) {
          await recordMessageRetryFailure(myUserId, conversation.id, item.requestId, error);
          // Do not alert on every background retry; the queued-message banner
          // remains visible and the user can still retry manually.
        }
      }
      setPendingOutbox(await loadPendingMessages(myUserId, conversation.id));
    } finally { automaticRetryInFlightRef.current = false; }
  }, [myUserId, conversation?.id]);

  useFocusEffect(
    useCallback(() => {
      retryQueuedTextMessages();
      const interval = setInterval(() => retryQueuedTextMessages(), 15000);
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') retryQueuedTextMessages();
      });
      return () => { clearInterval(interval); subscription.remove(); };
    }, [retryQueuedTextMessages])
  );

  // Smart replies only make sense when the other person spoke last —
  // suggesting replies to your own message is backwards. Guarded by
  // lastSuggestedFor so a re-render doesn't re-fire the request for a
  // message already suggested against.
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || isMineMessage(last) || last.id === lastSuggestedFor.current) {
      return;
    }
    lastSuggestedFor.current = last.id;
    fetchSmartReplies(conversation.id).then(setSuggestions);
  }, [messages, conversation.id, isMineMessage]);

  async function handleSend(text, existingRequestId = null, existingReplyToId = undefined) {
    if (editing) {
      // Editing reuses the same input bar — the send path here updates
      // the existing row instead of inserting a new one.
      const target = editing;
      try {
        await editMessage(target.id, text);
        setMessages((prev) =>
          prev.map((m) => (m.id === target.id ? { ...m, text, editedAt: new Date().toISOString() } : m))
        );
        setEditing(null);
        return true;
      } catch (err) {
        Alert.alert("Couldn't edit message", err.message || 'Please try again.');
        return false;
      }
    }

    const replyTarget = existingReplyToId !== undefined ? (existingReplyToId ? { id: existingReplyToId } : null) : replyingTo;
    const requestId = existingRequestId || `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (char) => { const random = Math.floor(Math.random() * 16); return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16); });
    setSendError('');
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      senderId: myUserId || 'me',
      text,
      createdAt: 'Now',
      createdAtRaw: new Date().toISOString(),
      replyPreview: replyTarget?.text,
    };
    setMessages((prev) => [...prev, optimistic]);
    setReplyingTo(null);
    setSuggestions([]);
    stickToBottom.current = true;
    try {
      const confirmed = await sendMessage(conversation.id, text, replyTarget?.id, requestId);
      await removePendingMessage(myUserId, conversation.id, requestId);
      setPendingOutbox((items) => items.filter((item) => item.requestId !== requestId));
      // Swaps the optimistic echo for the real, server-confirmed message
      // (real id, real timestamp) — without this, Realtime would also
      // deliver this same insert back to us (it doesn't exclude the
      // sender), and it'd show up a second time next to the temp one.
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...confirmed, replyPreview: optimistic.replyPreview } : m))
      );
      return true;
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setReplyingTo(replyTarget);
      const pending = { requestId, text, replyToId: replyTarget?.id || null, createdAt: new Date().toISOString() };
      await savePendingMessage(myUserId, conversation.id, pending);
      setPendingOutbox((items) => [...items.filter((item) => item.requestId !== requestId), pending]);
      console.error('[ChatScreen] Message send failed:', err);
      setSendError(err?.message || String(err) || 'Please try again.');
      const blocked = /row-level security/i.test(err.message || '');
      Alert.alert(
        'Message not sent',
        blocked ? 'You can no longer send messages in this conversation.' : err.message || 'Please try again.'
      );
      return false;
    }
  }

  function handleTyping() {
    // Typing events are throttled client-side — one broadcast per 1.5s
    // at most, no matter how fast the keystrokes come.
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1500) return;
    lastTypingSentRef.current = now;
    sendTyping(conversation.id);
  }

  async function handleSummarize() {
    setSummarizing(true);
    try {
      const summary = await summarizeConversation(conversation.id);
      Alert.alert(`Summary of your chat with ${display.participant.name}`, summary);
    } catch (err) {
      Alert.alert("Couldn't summarize", err.message || 'Please try again.');
    } finally {
      setSummarizing(false);
    }
  }

  // --- Message actions (long-press) -----------------------------------

  function applyLocalReaction(messageId, userId, emoji) {
    setReactions((prev) => {
      const list = [...(prev[messageId] || [])].filter((r) => r.userId !== userId);
      if (emoji) list.push({ userId, emoji });
      return { ...prev, [messageId]: list };
    });
  }

  function handlePickReaction(message, emoji) {
    const mine = (reactions[message.id] || []).find((r) => r.userId === myUserId);
    const next = mine?.emoji === emoji ? null : emoji;
    applyLocalReaction(message.id, myUserId, next);
    toggleReaction(message.id, emoji, mine?.emoji || null).catch(() => {});
  }

  async function performDeleteMessage(message) {
    if (!message || deletingMessage) return;

    setDeletingMessage(true);
    setDeleteMessageError('');

    try {
      await deleteMessage(message.id);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id
            ? { ...m, deletedAt: new Date().toISOString() }
            : m
        )
      );
      setDeleteMessageTarget(null);
    } catch (err) {
      const messageText = err?.message || 'Please try again.';
      setDeleteMessageError(messageText);
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert("Couldn't delete message: " + messageText);
      }
    } finally {
      setDeletingMessage(false);
    }
  }

  function confirmDeleteMessage(message) {
    if (!message) return;

    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      const confirmed = window.confirm(
        'Delete message? This removes the message for everyone in the chat. This action cannot be undone.'
      );
      if (confirmed) void performDeleteMessage(message);
      return;
    }

    setDeleteMessageError('');
    setDeleteMessageTarget(message);
  }

  async function handleConfirmDeleteMessage() {
    await performDeleteMessage(deleteMessageTarget);
  }

  function openMessageActions(message) {
    setActiveSheet({ message });
  }

  async function handleShowGroupReceiptDetails(message) {
    setActiveSheet(null);
    try {
      const roster = await fetchGroupMembers(conversation.id);
      const details = buildGroupReceiptDetails({
        message,
        members: Array.isArray(roster?.members) ? roster.members : [],
        senderId: myUserId,
        participantReadState,
        deliveryState: messageDeliveryState,
      });
      if (!details.length) {
        Alert.alert('Message status', 'Receipt details are not available for this message yet.');
        return;
      }
      const visible = details.slice(0, 12).map((item) => `${item.name}: ${item.status}`);
      if (details.length > visible.length) visible.push(`…and ${details.length - visible.length} more members`);
      Alert.alert('Message status', visible.join('\n'));
    } catch (err) {
      Alert.alert('Could not load message status', err?.message || 'Please try again.');
    }
  }

  async function handleSaveMessage(message) {
    setActiveSheet(null);
    try {
      const user = await getCurrentUser();
      await saveMessageLocally(user?.id || 'me', message, { ...display, id: conversation.id });
      Alert.alert('Message saved', 'Added to your on-device Saved messages collection. This bookmark does not sync to other devices.');
    } catch (err) {
      Alert.alert('Could not save message', err.message || 'Please try again.');
    }
  }

  async function handleTogglePinnedMessage(message) {
    setActiveSheet(null);
    try {
      const user = await getCurrentUser();
      const userId = user?.id || 'me';
      const conversationRecord = { ...display, id: conversation.id };
      if (isMessagePinned(pinnedMessages, conversation.id, message.id)) {
        const pinId = `${String(conversation.id)}:${String(message.id)}`;
        setPinnedMessages(await unpinMessageLocally(userId, pinId));
        Alert.alert('Message unpinned', 'Removed from your pinned messages. If this was a shared pin, other members will no longer see it.');
      } else {
        setPinnedMessages(await pinMessageLocally(userId, message, conversationRecord));
        Alert.alert('Message pinned', 'Added to your pinned messages. When connected to your account, this pin is shared with other members of the conversation and syncs across devices.');
      }
    } catch (err) {
      Alert.alert('Could not update pin', err.message || 'Please try again.');
    }
  }

  // --- Conversation-level actions (overflow menu) ---------------------

  async function handleToggleMute() {
    const next = !flags.isMuted;
    setFlags((prev) => ({ ...prev, isMuted: next }));
    setConversationFlags(conversation.id, { isMuted: next }).catch(() => {});
  }

  async function handleToggleArchive() {
    const next = !flags.isArchived;
    setFlags((prev) => ({ ...prev, isArchived: next }));
    setConversationFlags(conversation.id, { isArchived: next }).catch(() => {});
    if (next) navigation.goBack(); // archived chats leave the main list — going back shows that immediately
  }

  function handleBlockUser() {
    const peer = display.participant;
    if (!peer?.id) return;
    Alert.alert(`Block ${peer.name}?`, "They won't be able to message you, and you won't see theirs.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          try {
            await blockUser(peer.id);
            navigation.goBack();
          } catch (err) {
            Alert.alert("Couldn't block", err.message || 'Please try again.');
          }
        },
      },
    ]);
  }

  function handleReportUser(messageId = null) {
    const peer = display.participant;
    if (!peer?.id) return;
    reportUser({ reportedUserId: peer.id, messageId, reason: '' })
      .then(() => Alert.alert('Report received', 'Thanks — our team will review it.'))
      .catch((err) => Alert.alert("Couldn't send report", err.message || 'Please try again.'));
  }

  // --- Attachments ------------------------------------------------------

  function makeAttachmentOutboxItem(kind, uri, details = {}) {
    return { id: `attachment-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, kind, uri, ...details, createdAt: new Date().toISOString() };
  }

  async function queueAttachmentRetry(item, error) {
    const recovery = await preserveAttachmentForRetry(FileSystem, item, myUserId, conversation.id);
    const queuedItem = recovery.item;
    const saved = await savePendingAttachment(myUserId, conversation.id, queuedItem);
    if (!saved && recovery.preserved) await removePreservedAttachment(FileSystem, queuedItem);
    if (saved) setPendingAttachments((items) => [...items.filter((entry) => entry.id !== queuedItem.id), queuedItem].slice(-20));
    Alert.alert(
      saved ? 'Attachment waiting to retry' : 'Could not save retry',
      saved ? `The ${item.kind} upload failed. ${recovery.preserved ? 'A recovery copy was saved in app storage for retries after restarting the app.' : 'The original file must remain available on this device; a durable recovery copy could not be created.'} ${error?.message || ''}`.trim() : 'The upload failed and this device could not save a retry record. Please select the attachment again.'
    );
  }

  async function handlePickedImage(asset) {
    if (!asset) return;
    const item = makeAttachmentOutboxItem('image', asset.uri, { mimeType: asset.mimeType || 'image/jpeg' });
    setUploading(true);
    try {
      let uploaded;
      try { uploaded = await uploadChatImage(conversation.id, item.uri, item.mimeType); }
      catch (err) { await queueAttachmentRetry(item, err); return; }
      const sent = await sendAttachment(conversation.id, { mediaUrl: uploaded.url, mediaType: 'image' });
      setMessages((prev) => [...prev, sent]);
      stickToBottom.current = true;
    } catch (err) {
      Alert.alert("Couldn't send photo", err.message || 'Please try again.');
    } finally { setUploading(false); }
  }

  function discardPendingAttachment(item) {
    const label = item.name || (item.kind === 'image' ? 'photo' : item.kind === 'voice' ? 'voice note' : 'file');
    Alert.alert('Remove queued attachment?', `“${label}” will be removed from this device's retry queue. This cannot be undone.`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          const removed = await removePendingAttachment(myUserId, conversation.id, item.id);
          if (!removed) throw new Error('The local retry queue could not be updated.');
          await removePreservedAttachment(FileSystem, item);
          setPendingAttachments((items) => items.filter((entry) => entry.id !== item.id));
        } catch (error) {
          Alert.alert('Could not remove attachment', error?.message || 'Please try again.');
        }
      } },
    ]);
  }

  async function retryPendingAttachments(attachmentId = null) {
    if (retryingAttachments) return;
    const candidates = attachmentId
      ? pendingAttachments.filter((item) => item.id === attachmentId)
      : pendingAttachments;
    const retryable = candidates.filter((item) => isAttachmentRetryDue(item));
    if (!retryable.length) {
      Alert.alert('Uploads are waiting', attachmentId ? 'This attachment is still in its retry waiting period.' : 'Please wait before retrying these attachments.');
      return;
    }
    setRetryingAttachments(true);
    try {
      for (const item of retryable) {
        let uploaded;
        try {
          if (item.kind === 'image') uploaded = await uploadChatImage(conversation.id, item.uri, item.mimeType || 'image/jpeg');
          else if (item.kind === 'file') uploaded = await uploadChatFile(conversation.id, item.uri, item.name, item.mimeType, item.size);
          else uploaded = await uploadVoiceNote(conversation.id, item.uri, item.durationSeconds);
        } catch (error) {
          await recordAttachmentRetryFailure(myUserId, conversation.id, item.id, error);
          setPendingAttachments((items) => items.map((entry) => entry.id === item.id ? {
            ...entry,
            attempts: Math.min(100, (Number.isInteger(entry.attempts) ? entry.attempts : 0) + 1),
            lastAttemptAt: new Date().toISOString(),
            nextRetryAt: getAttachmentNextRetryAt(Math.min(100, (Number.isInteger(entry.attempts) ? entry.attempts : 0) + 1)),
            lastError: String(error?.message || error || 'Upload failed').slice(0, 240),
          } : entry));
          Alert.alert('Attachment still waiting', error?.message || 'The file may no longer be available. Select it again if needed.');
          break;
        }
        // Remove from the retry queue before creating a message record. If the
        // insert response is lost, we must not blindly create a duplicate.
        const removedFromQueue = await removePendingAttachment(myUserId, conversation.id, item.id);
        if (!removedFromQueue) {
          Alert.alert('Upload succeeded; retry record remains', 'The media uploaded, but the local retry record could not be cleared. Check the conversation before retrying to avoid duplicates.');
          break;
        }
        await removePreservedAttachment(FileSystem, item);
        setPendingAttachments((items) => items.filter((entry) => entry.id !== item.id));
        try {
          const sent = await sendAttachment(conversation.id, {
            mediaUrl: uploaded.url,
            mediaType: item.kind,
            mediaName: uploaded.name || item.name,
            mediaSize: uploaded.size || item.size,
            mediaDuration: uploaded.duration || item.durationSeconds,
          });
          setMessages((prev) => [...prev, sent]);
          stickToBottom.current = true;
        } catch (error) {
          Alert.alert('Upload succeeded; message status uncertain', 'The media uploaded, but saving the message failed. Check the conversation before sending it again to avoid duplicates.');
          break;
        }
      }
    } finally { setRetryingAttachments(false); }
  }

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo library access in Settings to send images.');
      return;
    }

    const mediaPrefs = await loadMediaPreferences();
    const quality = resolvePhotoUploadQuality(mediaPrefs);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality });
    if (result.canceled) return;
    await handlePickedImage(result.assets?.[0]);
  }

  // Camera capture — the audit noted only the gallery was wired up,
  // though launchCameraAsync was one call away. Separate iOS/Android
  // permission, separate picker call.
  async function handleTakePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Allow camera access in Settings to take a photo.');
      return;
    }

    const mediaPrefs = await loadMediaPreferences();
    const quality = resolvePhotoUploadQuality(mediaPrefs);
    const result = await ImagePicker.launchCameraAsync({ quality });
    if (result.canceled) return;
    await handlePickedImage(result.assets?.[0]);
  }

  async function handlePickFile() {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;

    if (asset.size && asset.size > MAX_FILE_SIZE) {
      Alert.alert('File too large', 'Files are limited to 25MB for now.');
      return;
    }

    const item = makeAttachmentOutboxItem('file', asset.uri, { name: asset.name, mimeType: asset.mimeType, size: asset.size });
    setUploading(true);
    try {
      let uploaded;
      try { uploaded = await uploadChatFile(conversation.id, asset.uri, asset.name, asset.mimeType, asset.size); }
      catch (err) { await queueAttachmentRetry(item, err); return; }
      const sent = await sendAttachment(conversation.id, { mediaUrl: uploaded.url, mediaType: 'file', mediaName: uploaded.name, mediaSize: uploaded.size });
      setMessages((prev) => [...prev, sent]);
      stickToBottom.current = true;
    } catch (err) {
      Alert.alert("Couldn't send file", err.message || 'Please try again.');
    } finally { setUploading(false); }
  }

  async function handleStartRecording() {
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Microphone access needed', 'Allow microphone access in Settings to send voice messages.');
      return;
    }
    try {
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (err) {
      Alert.alert("Couldn't start recording", err.message || 'Please try again.');
    }
  }

  async function handleStopRecording() {
    const durationSeconds = Math.round((recorderState.durationMillis || 0) / 1000);
    let uri;
    try {
      await audioRecorder.stop();
      uri = audioRecorder.uri;
    } catch (err) {
      Alert.alert("Couldn't finish recording", err.message || 'Please try again.');
      return;
    }
    // A near-instant tap-release is almost always an accidental press,
    // not a 1-second voice note someone meant to send — discard quietly
    // rather than sending a near-empty clip.
    if (!uri || durationSeconds < 1) return;

    const item = makeAttachmentOutboxItem('voice', uri, { durationSeconds });
    setUploading(true);
    try {
      let uploaded;
      try { uploaded = await uploadVoiceNote(conversation.id, uri, durationSeconds); }
      catch (err) { await queueAttachmentRetry(item, err); return; }
      const sent = await sendAttachment(conversation.id, { mediaUrl: uploaded.url, mediaType: 'voice', mediaDuration: uploaded.duration });
      setMessages((prev) => [...prev, sent]);
      stickToBottom.current = true;
    } catch (err) {
      Alert.alert("Couldn't send voice message", err.message || 'Please try again.');
    } finally { setUploading(false); }
  }

  async function handleCancelRecording() {
    try {
      await audioRecorder.stop();
    } catch (err) {
      // Already stopped or never started — nothing to clean up.
    }
  }

  async function handleOpenFile(url) {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert("Couldn't open file", 'No app on this device can open that link.');
    }
  }

  // Opens (or starts) a conversation with a contact shared inside this
  // chat. Uses push, not navigate — navigate to a screen already on the
  // stack (we're already on "Chat") would just update this screen's
  // params instead of opening a new one.
  async function handleOpenContact(sharedUserId, name) {
    if (!sharedUserId) return;
    try {
      const contacts = await fetchContacts();
      const profile = contacts.find((c) => c.id === sharedUserId) || {
        id: sharedUserId,
        name: name || 'Contact',
        avatarColor: '#6C5CE7',
      };
      const newConversation = await createConversation(sharedUserId, profile);
      navigation.push('Chat', { conversation: newConversation });
    } catch (err) {
      Alert.alert("Couldn't open contact", err.message || 'Please try again.');
    }
  }

  // 'read' is only ever computed for a 1:1 — a group's "seen by 4 of 6"
  // is a real, separate feature this doesn't attempt (see the backend
  // README). A still-optimistic message (no confirmed timestamp yet)
  // is always 'pending' regardless of anyone's read state.
  function computeStatus(message) {
    return resolveMessageDeliveryStatus({
      message,
      isGroup: Boolean(display.isGroup),
      peerId: display.participant?.id,
      deliveryState: messageDeliveryState,
      participantReadState,
    });
  }

  function computeGroupSeenCount(message) {
    if (!display.isGroup || !isMineMessage(message) || message.id.startsWith('temp-')) return 0;
    return countReadersForMessage({
      messageCreatedAt: message.createdAtRaw,
      participantReadState,
      senderId: myUserId,
    });
  }

  function computeGroupDeliveredCount(message) {
    if (!display.isGroup || !isMineMessage(message) || message.id.startsWith('temp-')) return 0;
    const participantIds = Object.keys(participantReadState);
    if (!participantIds.length) return 0;
    return countDeliveredRecipients({
      messageId: message.id,
      participantIds,
      deliveryState: messageDeliveryState,
      senderId: myUserId,
    });
  }

  // Date separators: the FlatList renders a mixed array — day markers
  // interleaved with messages whenever the calendar day changes. Mock
  // messages carry display strings ("09:41", "Yesterday") rather than
  // ISO timestamps, so in mock mode separators are simply skipped
  // rather than mis-grouped by label text.
  const listItems = useMemo(() => {
    const items = [];
    let lastDayKey = null;
    for (const m of messages) {
      const dayKey = m.createdAtRaw ? m.createdAtRaw.slice(0, 10) : null;
      if (dayKey && dayKey !== lastDayKey) {
        items.push({ id: `day-${dayKey}`, type: 'day', label: dayLabel(dayKey) });
        lastDayKey = dayKey;
      }
      items.push(m);
    }
    return items;
  }, [messages]);

  // Search is intentionally local over messages already loaded into this
  // conversation. It never makes a broad server query that could bypass the
  // conversation's existing authorization boundary. Users can load earlier
  // messages first, then search that loaded history too.
  const searchMatches = useMemo(() => searchMessages(messages, searchQuery), [messages, searchQuery]);
  const normalizedSearchIndex = searchMatches.length ? activeSearchIndex % searchMatches.length : 0;
  const activeSearchMessage = searchMatches.length
    ? messages.find((message) => message.id === searchMatches[normalizedSearchIndex]?.id)
    : null;

  useEffect(() => {
    if (!searchOpen || !activeSearchMessage) return;
    const targetIndex = listItems.findIndex((item) => item.id === activeSearchMessage.id);
    if (targetIndex < 0) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: targetIndex, animated: true, viewPosition: 0.5 });
    });
  }, [activeSearchMessage, listItems, searchOpen]);

  // Pinned/saved-message deep links try a bounded amount of older history
  // before reporting that the target is unavailable. This avoids fetching an
  // entire large conversation just to open one local bookmark.
  useEffect(() => {
    if (targetLookupForRef.current !== targetMessageId) {
      targetLookupForRef.current = targetMessageId;
      targetLookupPagesRef.current = 0;
      handledTargetMessageRef.current = null;
    }
    if (!targetMessageId || handledTargetMessageRef.current === targetMessageId || !messages.length) return;
    const targetIndex = listItems.findIndex((item) => item.id === targetMessageId);
    if (targetIndex >= 0) {
      handledTargetMessageRef.current = targetMessageId;
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index: targetIndex, animated: true, viewPosition: 0.5 });
      });
      return;
    }
    if (loadingOlder) return;
    if (hasMore && targetLookupPagesRef.current < 8) {
      targetLookupPagesRef.current += 1;
      loadOlder();
      return;
    }
    handledTargetMessageRef.current = targetMessageId;
    Alert.alert('Message not found in loaded history', 'The message may have been deleted or is older than the history checked. You can still use “Load earlier messages” in the conversation.');
  }, [targetMessageId, messages, listItems, loadingOlder, hasMore, loadOlder]);

  function toggleSearch() {
    if (searchOpen) {
      setSearchOpen(false);
      setSearchQuery('');
      setActiveSearchIndex(0);
    } else {
      setSearchOpen(true);
      setActiveSearchIndex(0);
    }
  }

  function moveSearchResult(direction) {
    if (!searchMatches.length) return;
    setActiveSearchIndex((current) => (current + direction + searchMatches.length) % searchMatches.length);
  }

  const peerOnline = !display.isGroup && display.participant?.id ? onlineIds.has(display.participant.id) : false;
  const subtitle = peerTyping
    ? 'typing…'
    : display.isGroup
    ? `${display.memberCount || ''} members`.trim()
    : SUPABASE_ENABLED
    ? peerOnline
      ? 'Online'
      : 'Offline'
    : display.participant?.online
    ? 'Online'
    : 'Offline';

  // --- Sheet option lists -------------------------------------------------

  const attachOptions = [
    { key: 'photo', label: 'Photo library', icon: 'images-outline', onPress: () => { setActiveSheet(null); handlePickImage(); } },
    { key: 'camera', label: 'Take a photo', icon: 'camera-outline', onPress: () => { setActiveSheet(null); handleTakePhoto(); } },
    { key: 'file', label: 'File', icon: 'document-outline', onPress: () => { setActiveSheet(null); handlePickFile(); } },
    {
      key: 'contact',
      label: 'Contact',
      icon: 'person-outline',
      onPress: () => {
        setActiveSheet(null);
        navigation.navigate('NewChat', { shareToConversationId: conversation.id });
      },
    },
  ];

  const overflowOptions = [
    { key: 'polls', label: 'Polls', icon: 'bar-chart-outline', onPress: () => { setActiveSheet(null); navigation.navigate('Polls', { conversation: display }); } },
    { key: 'events', label: 'Events', icon: 'calendar-outline', onPress: () => { setActiveSheet(null); navigation.navigate('Events', { conversation: display }); } },
    {
      key: 'shared-media',
      label: 'Shared media, files & links',
      icon: 'albums-outline',
      onPress: () => { setActiveSheet(null); navigation.navigate('SharedMedia', { conversation: display }); },
    },
    {
      key: 'pinned-messages',
      label: 'Pinned messages',
      icon: 'pin-outline',
      onPress: () => { setActiveSheet(null); navigation.navigate('PinnedMessages', { conversation: display }); },
    },
    {
      key: 'mute',
      label: flags.isMuted ? 'Unmute conversation' : 'Mute conversation',
      icon: flags.isMuted ? 'volume-high-outline' : 'volume-mute-outline',
      onPress: () => { setActiveSheet(null); handleToggleMute(); },
    },
    {
      key: 'archive',
      label: flags.isArchived ? 'Unarchive conversation' : 'Archive conversation',
      icon: 'archive-outline',
      onPress: () => { setActiveSheet(null); handleToggleArchive(); },
    },
    ...(!display.isGroup && display.participant?.id
      ? [
          {
            key: 'report',
            label: `Report ${display.participant.name}`,
            icon: 'flag-outline',
            onPress: () => { setActiveSheet(null); handleReportUser(); },
          },
          {
            key: 'block',
            label: `Block ${display.participant.name}`,
            icon: 'remove-circle-outline',
            destructive: true,
            onPress: () => { setActiveSheet(null); handleBlockUser(); },
          },
        ]
      : []),
  ];

  const sheetMessage = activeSheet?.message || null;
  const messageOptions = sheetMessage
    ? [
        {
          key: 'reply',
          label: 'Reply',
          icon: 'arrow-undo-outline',
          onPress: () => { setReplyingTo(sheetMessage); setActiveSheet(null); },
        },
        ...(!sheetMessage.deletedAt
          ? [{ key: 'save', label: 'Save message', icon: 'bookmark-outline', onPress: () => handleSaveMessage(sheetMessage) }]
          : []),
        ...(!sheetMessage.deletedAt
          ? [{ key: 'pin', label: isMessagePinned(pinnedMessages, conversation.id, sheetMessage.id) ? 'Unpin message' : 'Pin message', icon: isMessagePinned(pinnedMessages, conversation.id, sheetMessage.id) ? 'pin' : 'pin-outline', onPress: () => handleTogglePinnedMessage(sheetMessage) }]
          : []),
        ...(isMineMessage(sheetMessage) && !sheetMessage.mediaType && !sheetMessage.deletedAt
          ? [
              {
                key: 'edit',
                label: 'Edit',
                icon: 'pencil-outline',
                onPress: () => { setEditing({ id: sheetMessage.id, text: sheetMessage.text }); setActiveSheet(null); },
              },
            ]
          : []),
        ...(!sheetMessage.deletedAt && !sheetMessage.mediaType && typeof sheetMessage.text === 'string' && sheetMessage.text.trim()
          ? [
              {
                key: 'forward',
                label: 'Forward',
                icon: 'arrow-redo-outline',
                onPress: () => {
                  const messageText = sheetMessage.text;
                  setActiveSheet(null);
                  navigation.navigate('ForwardMessage', { messageText, sourceConversationId: conversation.id });
                },
              },
            ]
          : []),
        ...(display.isGroup && isMineMessage(sheetMessage) && !sheetMessage.deletedAt && !String(sheetMessage.id).startsWith('temp-')
          ? [{ key: 'receipts', label: 'View message status', icon: 'people-outline', onPress: () => handleShowGroupReceiptDetails(sheetMessage) }]
          : []),
        ...(isMineMessage(sheetMessage) && !sheetMessage.deletedAt
          ? [
              {
                key: 'delete',
                label: 'Delete',
                icon: 'trash-outline',
                destructive: true,
                onPress: () => {
                    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
                      setActiveSheet(null);
                      confirmDeleteMessage(sheetMessage);
                    } else {
                      setActiveSheet(null);
                      setTimeout(() => confirmDeleteMessage(sheetMessage), 350);
                    }
                  },
              },
            ]
          : []),
        ...(!isMineMessage(sheetMessage) && !display.isGroup
          ? [
              {
                key: 'report',
                label: 'Report message',
                icon: 'flag-outline',
                onPress: () => { setActiveSheet(null); handleReportUser(sheetMessage.id); },
              },
            ]
          : []),
      ]
    : [];

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadChatCanvas().then((key) => { if (active) setChatCanvasKey(key); });
      return () => { active = false; };
    }, [])
  );

  return (
    <View style={{ flex: 1, backgroundColor: resolveChatCanvas(chatCanvasKey, colors.background) }}>
      <Header
        title={display.participant?.name || '…'}
        subtitle={subtitle}
        onBack={() => navigation.goBack()}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              style={{ marginRight: spacing.sm }}
              onPress={toggleSearch}
              accessibilityLabel={searchOpen ? 'Close message search' : 'Search messages in this conversation'}
              accessibilityRole="button"
            >
              <Ionicons name={searchOpen ? 'close' : 'search-outline'} size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginRight: spacing.sm }}
              onPress={handleSummarize}
              disabled={summarizing}
              accessibilityLabel="Summarize this conversation"
              accessibilityRole="button"
            >
              {summarizing ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <Ionicons name="sparkles-outline" size={20} color={colors.textPrimary} />
              )}
            </TouchableOpacity>
            {/* The dead call button the audit flagged is gone — voice
                calls are a P3 undertaking (WebRTC + signaling), and a
                button with no handler reads as broken, not unfinished. */}
            {display.isGroup ? (
              <TouchableOpacity
                style={{ marginRight: spacing.sm }}
                onPress={() => navigation.navigate('GroupManagement', { conversation: display })}
                accessibilityLabel="Manage group members"
                accessibilityRole="button"
              >
                <Ionicons name="people-outline" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={{ marginRight: spacing.sm }}
              onPress={() => setActiveSheet('overflow')}
              accessibilityLabel="Conversation options"
              accessibilityRole="button"
            >
              <Ionicons name="ellipsis-vertical" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <Avatar
              name={display.participant?.name}
              color={display.participant?.avatarColor}
              imageUrl={display.participant?.avatarUrl}
              isGroup={display.isGroup}
              size={32}
            />
          </View>
        }
      />

      {searchOpen && (
        <View style={[styles.searchPanel, { backgroundColor: colors.background, borderBottomColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }]}>
          <View style={[styles.searchField, { backgroundColor: hexToRgba(colors.surface, 0.72), borderColor: colors.border, borderRadius: radii.md }]}>
            <Ionicons name="search-outline" size={17} color={colors.textSecondary} />
            <TextInput
              value={searchQuery}
              onChangeText={(value) => { setSearchQuery(value); setActiveSearchIndex(0); }}
              placeholder="Search messages and files"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              style={[typography.body, { color: colors.textPrimary, flex: 1, marginLeft: spacing.sm, paddingVertical: 8 }]}
              accessibilityLabel="Search messages in this conversation"
              accessibilityHint="Searches text and attachment names in messages already loaded"
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setActiveSearchIndex(0); }} accessibilityLabel="Clear message search" accessibilityRole="button" hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.searchControls}>
            <Text style={[typography.small, { color: colors.textSecondary, flex: 1 }]}>
              {!searchQuery.trim() ? 'Search loaded messages' : searchMatches.length ? `${normalizedSearchIndex + 1} of ${searchMatches.length} matches` : 'No matches in loaded messages'}
            </Text>
            <TouchableOpacity onPress={() => moveSearchResult(-1)} disabled={searchMatches.length < 2} accessibilityLabel="Previous search result" accessibilityRole="button" accessibilityState={{ disabled: searchMatches.length < 2 }} style={styles.searchNavButton}>
              <Ionicons name="chevron-up" size={18} color={searchMatches.length < 2 ? colors.textSecondary : colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => moveSearchResult(1)} disabled={searchMatches.length < 2} accessibilityLabel="Next search result" accessibilityRole="button" accessibilityState={{ disabled: searchMatches.length < 2 }} style={styles.searchNavButton}>
              <Ionicons name="chevron-down" size={18} color={searchMatches.length < 2 ? colors.textSecondary : colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={listRef}
          data={listItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: spacing.md }}
          onScroll={(e) => {
            const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
            stickToBottom.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 60;
          }}
          scrollEventThrottle={100}
          onScrollToIndexFailed={({ index }) => {
            listRef.current?.scrollToOffset({ offset: Math.max(0, index * 72), animated: true });
          }}
          onContentSizeChange={() => {
            if (stickToBottom.current) listRef.current?.scrollToEnd({ animated: false });
          }}
          ListHeaderComponent={
            hasMore ? (
              <TouchableOpacity
                onPress={loadOlder}
                disabled={loadingOlder}
                accessibilityLabel="Load earlier messages"
                accessibilityRole="button"
                style={{ alignSelf: 'center', marginBottom: spacing.sm }}
              >
                <View
                  style={[
                    styles.loadOlderPill,
                    { borderColor: colors.border, backgroundColor: hexToRgba(colors.surface, 0.6), borderRadius: radii.pill },
                  ]}
                >
                  {loadingOlder ? (
                    <ActivityIndicator size="small" color={colors.textSecondary} />
                  ) : (
                    <Text style={[typography.small, { color: colors.textSecondary }]}>Load earlier messages</Text>
                  )}
                </View>
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item }) => {
            if (item.type === 'day') {
              return (
                <View style={{ alignItems: 'center', marginVertical: spacing.sm }}>
                  <Text style={[typography.small, { color: colors.textSecondary }]}>{item.label}</Text>
                </View>
              );
            }
            const mine = isMineMessage(item);
            const reactionList = reactions[item.id] || [];
            // Unique emojis for the badge row, capped at 3 with a count.
            const uniqueEmojis = [...new Set(reactionList.map((r) => r.emoji))].slice(0, 3);
            const reactionExtra = reactionList.length > 3 ? reactionList.length : 0;
            return (
              <ChatBubble
                message={item}
                isMine={mine}
                senderName={display.isGroup && !mine ? item.senderName : undefined}
                status={mine ? computeStatus(item) : undefined}
                seenByCount={mine && display.isGroup ? computeGroupSeenCount(item) : 0}
                deliveredToCount={mine && display.isGroup ? computeGroupDeliveredCount(item) : 0}
                replyPreview={item.replyPreview}
                reactions={uniqueEmojis}
                reactionExtra={reactionExtra}
                searchHighlight={searchMatches.some((match) => match.id === item.id) || item.id === targetMessageId}
                activeSearchHighlight={activeSearchMessage?.id === item.id || item.id === targetMessageId}
                onSwipeReply={setReplyingTo}
                onShowActions={openMessageActions}
                onViewImage={setFullscreenImage}
                onOpenFile={handleOpenFile}
                onOpenContact={handleOpenContact}
              />
            );
          }}
        />

        {uploading && (
          <View style={[styles.uploadingRow, { paddingHorizontal: spacing.md }]}>
            <ActivityIndicator size="small" color={colors.textSecondary} />
            <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: 8 }]}>Sending…</Text>
          </View>
        )}

        {suggestions.length > 0 && !replyingTo && !editing && !recorderState.isRecording && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: 8 }}
          >
            {suggestions.map((s, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => handleSend(s)}
                accessibilityLabel={`Send suggested reply: ${s}`}
                accessibilityRole="button"
                style={[
                  styles.chip,
                  { backgroundColor: hexToRgba(colors.accent, 0.14), borderColor: hexToRgba(colors.accent, 0.4), borderRadius: radii.pill },
                ]}
              >
                <Text style={[typography.caption, { color: colors.accent }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {pendingAttachments.length > 0 ? (
          <View style={{ marginHorizontal: spacing.md, marginBottom: 8, padding: 10, borderRadius: 8, backgroundColor: hexToRgba(colors.accent, 0.10), gap: 8 }}>
            <Text style={{ color: colors.text, fontSize: 13 }}>{pendingAttachments.length} attachment upload{pendingAttachments.length === 1 ? '' : 's'} waiting. Preserved recovery copies are used when available.</Text>
            {pendingAttachments.map((item) => (
              <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 7 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text numberOfLines={1} style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{item.name || (item.kind === 'image' ? 'Photo' : item.kind === 'voice' ? 'Voice note' : 'File')}</Text>
                  <Text numberOfLines={2} style={{ color: colors.textSecondary, fontSize: 11 }}>{item.lastError ? `Last error: ${item.lastError}` : item.recoveryCopy ? 'Recovery copy saved on this device' : 'Original file must remain available'}{Number.isInteger(item.attempts) && item.attempts > 0 ? ` · ${item.attempts} failed attempt${item.attempts === 1 ? '' : 's'}` : ''}</Text>
                </View>
                <TouchableOpacity disabled={retryingAttachments} onPress={() => retryPendingAttachments(item.id)} accessibilityRole="button" accessibilityLabel={`Retry queued ${item.kind} attachment`} style={{ padding: 6 }}>
                  <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 12 }}>Retry</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={retryingAttachments} onPress={() => discardPendingAttachment(item)} accessibilityRole="button" accessibilityLabel={`Remove queued ${item.kind} attachment`} style={{ padding: 6 }}>
                  <Text style={{ color: colors.danger || '#D84C4C', fontWeight: '700', fontSize: 12 }}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity disabled={retryingAttachments} onPress={retryPendingAttachments} style={{ alignSelf: 'flex-end', paddingTop: 2 }} accessibilityRole="button" accessibilityLabel="Retry attachment uploads">
              <Text style={{ color: colors.accent, fontWeight: '700' }}>{retryingAttachments ? 'Retrying uploads…' : 'Retry eligible uploads'}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {pendingOutbox.length > 0 ? (
          <View style={{ marginHorizontal: spacing.md, marginBottom: 8, padding: 10, borderRadius: 8, backgroundColor: hexToRgba(colors.accent, 0.10) }}>
            <Text style={{ color: colors.text, fontSize: 13 }}>{pendingOutbox.length} message{pendingOutbox.length === 1 ? '' : 's'} waiting to send. They are saved on this device.</Text>
            <TouchableOpacity disabled={retryingOutbox} onPress={async () => { if (automaticRetryInFlightRef.current) return; automaticRetryInFlightRef.current = true; setRetryingOutbox(true); try { for (const item of [...pendingOutbox]) { const ok = await handleSend(item.text, item.requestId, item.replyToId); if (!ok) break; } } finally { automaticRetryInFlightRef.current = false; setRetryingOutbox(false); } }} style={{ alignSelf: 'flex-end', paddingTop: 6 }} accessibilityRole="button">
              <Text style={{ color: colors.accent, fontWeight: '700' }}>{retryingOutbox ? 'Retrying…' : 'Retry pending messages'}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {sendError ? (
          <View style={{ marginHorizontal: spacing.md, marginBottom: 8, padding: 10, borderRadius: 8, backgroundColor: '#FCE8E6' }}>
            <Text style={{ color: '#9B1C1C', fontSize: 13 }}>
              Message not sent: {sendError}
            </Text>
            <TouchableOpacity onPress={() => setSendError('')} style={{ alignSelf: 'flex-end', paddingTop: 6 }} accessibilityRole="button">
              <Text style={{ color: '#9B1C1C', fontWeight: '600' }}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <InputBar
          onSend={handleSend}
          onTyping={handleTyping}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          editing={editing}
          onCancelEdit={() => setEditing(null)}
          onAttach={() => setActiveSheet('attach')}
          isRecording={recorderState.isRecording}
          recordingSeconds={(recorderState.durationMillis || 0) / 1000}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          onCancelRecording={handleCancelRecording}
          draftKey={makeDraftKey(myUserId, conversation.id)}
        />
      </KeyboardAvoidingView>

      {/* Attach menu — branded sheet, not a native alert list */}
      <ActionSheet
        visible={activeSheet === 'attach'}
        title="Attach"
        options={attachOptions}
        onClose={() => setActiveSheet(null)}
      />

      {/* Conversation overflow — mute / archive / report / block */}
      <ActionSheet
        visible={activeSheet === 'overflow'}
        title={display.participant?.name || 'Conversation'}
        options={overflowOptions}
        onClose={() => setActiveSheet(null)}
      />

      {/* Message actions — quick reactions row + reply/edit/delete/report */}
      <ActionSheet
        visible={Boolean(sheetMessage)}
        title={sheetMessage ? 'Message' : undefined}
        reactions={
          sheetMessage
            ? QUICK_REACTIONS.map((emoji) => ({
                emoji,
                active: (reactions[sheetMessage.id] || []).some((r) => r.userId === myUserId && r.emoji === emoji),
                onPress: () => {
                  handlePickReaction(sheetMessage, emoji);
                  setActiveSheet(null);
                },
              }))
            : undefined
        }
        options={messageOptions}
        onClose={() => setActiveSheet(null)}
      />

      <Modal
        visible={Boolean(deleteMessageTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deletingMessage) {
            setDeleteMessageTarget(null);
            setDeleteMessageError('');
          }
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.55)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 420,
              padding: 22,
              borderRadius: radii.lg || 16,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={[
                typography.title,
                { color: colors.text, marginBottom: 10 },
              ]}
            >
              Delete message?
            </Text>
            <Text
              style={[
                typography.body,
                { color: colors.textSecondary, marginBottom: 16 },
              ]}
            >
              This removes the message for everyone in the chat. This action
              cannot be undone.
            </Text>

            {deleteMessageError ? (
              <Text
                style={{
                  color: '#B42318',
                  marginBottom: 14,
                  fontSize: 14,
                }}
              >
                Couldn't delete: {deleteMessageError}
              </Text>
            ) : null}

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <TouchableOpacity
                disabled={deletingMessage}
                onPress={() => {
                  setDeleteMessageTarget(null);
                  setDeleteMessageError('');
                }}
                accessibilityRole="button"
                accessibilityLabel="Cancel message deletion"
                style={{ paddingHorizontal: 14, paddingVertical: 11 }}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={deletingMessage}
                onPress={handleConfirmDeleteMessage}
                accessibilityRole="button"
                accessibilityLabel="Confirm message deletion"
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 11,
                  borderRadius: radii.md || 10,
                  backgroundColor: '#B42318',
                  opacity: deletingMessage ? 0.65 : 1,
                  minWidth: 90,
                  alignItems: 'center',
                }}
              >
                {deletingMessage ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
                    Delete
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(fullscreenImage)} transparent animationType="fade" onRequestClose={() => setFullscreenImage(null)}>
        <View style={styles.lightbox}>
          <TouchableOpacity
            style={styles.lightboxClose}
            onPress={() => setFullscreenImage(null)}
            hitSlop={16}
            accessibilityLabel="Close fullscreen image"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {fullscreenImage && (
            <Image
              source={{ uri: fullscreenImage }}
              style={styles.lightboxImage}
              resizeMode="contain"
              accessibilityLabel="Attached photo, fullscreen"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  searchPanel: { borderBottomWidth: StyleSheet.hairlineWidth },
  searchField: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 10 },
  searchControls: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  searchNavButton: { width: 34, height: 30, alignItems: 'center', justifyContent: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 8 },
  loadOlderPill: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  lightboxImage: { width: '100%', height: '80%' },
  lightboxClose: { position: 'absolute', top: 56, right: 20, zIndex: 1 },
});
