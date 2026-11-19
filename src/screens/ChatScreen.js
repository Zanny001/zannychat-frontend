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
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase, SUPABASE_ENABLED } from '../services/supabaseClient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library/legacy';
import { saveMediaToLibrary } from '../services/saveMediaToLibrary';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAudioRecorder, useAudioRecorderState, AudioModule, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import { QUICK_REACTIONS } from '../components/ChatBubble';
import useChatTimeline from '../hooks/useChatTimeline';
import ChatMessageRow from '../components/ChatMessageRow';
import InputBar from '../components/InputBar';
import ActionSheet from '../components/ActionSheet';
import { hexToRgba } from '../utils/color';
import { savePendingMessage, loadPendingMessages, removePendingMessage, recordMessageRetryFailure, isMessageRetryDue } from '../services/messageOutbox';
import { savePendingAttachment, loadPendingAttachments, removePendingAttachment, recordAttachmentRetryFailure } from '../services/attachmentOutbox';
import { getAttachmentNextRetryAt, isAttachmentRetryDue } from '../utils/attachmentRetryPolicy';
import { isPermanentMessageSendError } from '../utils/safeMessagingError';
import { preserveAttachmentForRetry, removePreservedAttachment } from '../utils/attachmentFileRecovery';
import {
  sendMessage,
  editMessage,
  deleteMessage,
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
  fetchGroupMembers,
  toggleReaction,
  sendTyping,
  setConversationFlags,
  blockUser,
  reportUser,
} from '../services/api';
import { startCall } from '../services/calls';
import { canStartCall } from '../utils/callPolicy';
import { searchMessages } from '../utils/searchMessages';
import { resolvePhotoUploadQuality } from '../utils/mediaQuality';
import { loadMediaPreferences } from '../services/mediaPreferences';
import { loadChatCanvas } from '../services/chatAppearance';
import { saveMessageLocally } from '../services/savedMessages';
import { loadPinnedMessages, pinMessageLocally, unpinMessageLocally } from '../services/pinnedMessages';
import { isMessagePinned } from '../utils/pinnedMessages';
import { makeDraftKey } from '../utils/drafts';
import { resolveChatCanvas } from '../utils/chatAppearance';

function DraftVideoPreview({ uri }) {
  const player = useVideoPlayer(uri, (instance) => { instance.loop = true; });
  return <VideoView player={player} nativeControls contentFit="contain" style={{ width: '100%', height: '100%' }} />;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // Exact chat-media Storage limit (26,214,400 bytes).

function isPermanentAttachmentUploadError(error) {
  if (['UNSUPPORTED_MEDIA_TYPE', 'FILE_TOO_LARGE'].includes(error?.code)) return true;
  const status = Number(error?.statusCode ?? error?.status ?? error?.response?.status);
  if ([400, 403, 404, 413, 415, 422].includes(status)) return true;
  const message = String(error?.message || error?.error || '').toLowerCase();
  return /invalidmime|unsupported mime|mime type.*not|file size.*limit|payload too large|row-level security|access denied|not authorized/.test(message);
}

function getPermanentAttachmentErrorMessage(error) {
  const status = Number(error?.statusCode ?? error?.status ?? error?.response?.status);
  const message = String(error?.message || error?.error || '').toLowerCase();
  if (error?.code === 'UNSUPPORTED_MEDIA_TYPE' || status === 415 || /invalidmime|unsupported mime|mime type.*not/.test(message)) {
    return 'This file type cannot be shared securely. Choose a supported photo, video, audio file, document, or archive.';
  }
  if (error?.code === 'FILE_TOO_LARGE' || status === 413 || /file size.*limit|payload too large/.test(message)) {
    return 'This attachment exceeds the 25 MiB upload limit.';
  }
  if (status === 403 || /row-level security|access denied|not authorized/.test(message)) {
    return 'You no longer have permission to upload attachments in this conversation. Refresh the chat and try again.';
  }
  if (status === 404) return 'The attachment service could not find this conversation. Reopen the chat and try again.';
  return error?.message || 'This attachment cannot be uploaded. Choose a supported file under 25 MiB.';
}

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
  const { width: windowWidth } = useWindowDimensions();
  const compactHeader = windowWidth < 480;
  const ultraCompactHeader = windowWidth < 380;
  const [chatCanvasKey, setChatCanvasKey] = useState('theme');
  const [replyingTo, setReplyingTo] = useState(null);
  const [editing, setEditing] = useState(null); // { id, text } while editing own message
  const [suggestions, setSuggestions] = useState([]);
  const [sendError, setSendError] = useState('');
  const [pendingOutbox, setPendingOutbox] = useState([]);
  const [retryingOutbox, setRetryingOutbox] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [retryingAttachments, setRetryingAttachments] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [mediaDraft, setMediaDraft] = useState(null);
  const [mediaCaption, setMediaCaption] = useState('');
  // Backfilled when this screen is opened from a push notification tap,
  // which only carries a conversation id — see notifications.js. Until
  // that resolves, `display` falls back to whatever the navigator was
  // given (usually complete, from the chat list).
  const [resolved, setResolved] = useState(null);
  const display = resolved || conversation;
  // Per-participant flags (0006) — initialized from whatever the
  // navigator passed, updated locally on toggle. Muted conversations
  // also stop pushing to this device (enforced server-side).
  const [flags, setFlags] = useState({ isMuted: Boolean(conversation.isMuted), isArchived: Boolean(conversation.isArchived) });
  const [myUserId, setMyUserId] = useState(null);
  useEffect(() => {
    let active = true;
    if (!myUserId) {
      setPendingOutbox([]);
      setPendingAttachments([]);
      return () => { active = false; };
    }
    Promise.all([loadPendingMessages(myUserId, conversation?.id), loadPendingAttachments(myUserId, conversation?.id)])
      .then(([messages, attachments]) => {
        if (active && activeUserIdRef.current === myUserId) {
          setPendingOutbox(messages);
          setPendingAttachments(attachments);
        }
      })
      .catch(() => {
        if (active && activeUserIdRef.current === myUserId) {
          setPendingOutbox([]);
          setPendingAttachments([]);
        }
      });
    return () => { active = false; };
  }, [myUserId, conversation?.id]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
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
  const lastTypingSentRef = useRef(0);
  const handledTargetMessageRef = useRef(null);
  const targetLookupForRef = useRef(null);
  const targetLookupPagesRef = useRef(0);
  const automaticRetryInFlightRef = useRef(false);
  const activeUserIdRef = useRef(undefined);
  const {
    messages, setMessages, loadingMessages, messageLoadError, olderLoadError,
    hasMore, loadingOlder, load, loadOlder, reactions, setReactions,
    participantReadState, messageDeliveryState, setMessageDeliveryState,
    peerTyping, onlineIds, resetTimeline,
  } = useChatTimeline({
    conversationId: conversation.id,
    myUserId,
    activeUserIdRef,
    stickToBottom,
  });
  const resolvedConversationRequestRef = useRef(0);
  const pinnedLoadRequestRef = useRef(0);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 200);

  // The audit missed this one, but it's real: this screen used to
  // compare senderId against the mock-mode literal 'me', so in live
  // mode EVERY message rendered as "theirs". The fix is knowing the
  // actual signed-in user id and comparing against both.
  useEffect(() => {
    const applyUserId = (nextUserId) => {
      if (activeUserIdRef.current === undefined) {
        activeUserIdRef.current = nextUserId;
        setMyUserId(nextUserId || (SUPABASE_ENABLED ? null : 'me'));
        return;
      }
      if (activeUserIdRef.current === nextUserId) return;
      activeUserIdRef.current = nextUserId;
      resetTimeline('Your account changed. Reopen this conversation from Chats.');
      setMyUserId(nextUserId);
      // A chat is bound to its original authenticated participant. Never keep
      // its messages, local outbox, receipts or media drafts visible after an
      // account switch; leave the route so the new account must reopen access.
      setReplyingTo(null);
      setEditing(null);
      setPendingOutbox([]);
      setPendingAttachments([]);
      setRetryingOutbox(false);
      setRetryingAttachments(false);
      setPinnedMessages([]);
      setSuggestions([]);
      setSendError('');
      setUploading(false);
      setSummarizing(false);
      setFullscreenImage(null);
      setMediaDraft(null);
      setMediaCaption('');
      setResolved(null);
      setFlags({ isMuted: false, isArchived: false });
      setActiveSheet(null);
      setDeleteMessageTarget(null);
      setDeletingMessage(false);
      setDeleteMessageError('');
      setSearchOpen(false);
      setSearchQuery('');
      setActiveSearchIndex(0);
      stickToBottom.current = true;
      handledTargetMessageRef.current = null;
      targetLookupForRef.current = null;
      targetLookupPagesRef.current = 0;
      automaticRetryInFlightRef.current = false;
      if (navigation?.canGoBack?.()) navigation.goBack();
    };

    if (SUPABASE_ENABLED && supabase?.auth?.onAuthStateChange) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        applyUserId(session?.user?.id || null);
      });
      return () => data?.subscription?.unsubscribe?.();
    }

    let active = true;
    getCurrentUser().then((user) => {
      if (active) applyUserId(user?.id || 'me');
    }).catch(() => {
      if (active) applyUserId('me');
    });
    return () => { active = false; };
  }, [navigation, resetTimeline]);

  useEffect(() => {
    const requestId = ++pinnedLoadRequestRef.current;
    if (!myUserId) {
      setPinnedMessages([]);
      return () => { pinnedLoadRequestRef.current += 1; };
    }
    const expectedUserId = myUserId;
    loadPinnedMessages(myUserId)
      .then((items) => {
        if (requestId === pinnedLoadRequestRef.current && activeUserIdRef.current === expectedUserId) {
          setPinnedMessages(items);
        }
      })
      .catch(() => {
        if (requestId === pinnedLoadRequestRef.current && activeUserIdRef.current === expectedUserId) setPinnedMessages([]);
      });
    return () => { pinnedLoadRequestRef.current += 1; };
  }, [myUserId, conversation.id]);

  const isMineMessage = useCallback(
    (m) => m.senderId === 'me' || (myUserId && m.senderId === myUserId),
    [myUserId]
  );

  useEffect(() => {
    if (display.participant?.name || !myUserId) return;
    const requestId = ++resolvedConversationRequestRef.current;
    const expectedUserId = myUserId;
    fetchConversations().then(({ conversations: list }) => {
      if (requestId !== resolvedConversationRequestRef.current || activeUserIdRef.current !== expectedUserId) return;
      const match = list.find((c) => c.id === conversation.id);
      if (match) {
        setResolved(match);
        setFlags({ isMuted: Boolean(match.isMuted), isArchived: Boolean(match.isArchived) });
      }
    }).catch(() => {});
    return () => { resolvedConversationRequestRef.current += 1; };
    // conversation.id is stable for the screen's lifetime; display is
    // deliberately excluded so this doesn't loop against its own update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, myUserId]);

  // Recover queued text sends when the chat regains focus / the app returns
  // to the foreground. Stable request IDs preserve server-side idempotency;
  // bounded exponential backoff prevents a bad connection from being hammered.
  const retryQueuedTextMessages = useCallback(async () => {
    if (!myUserId || !conversation?.id || automaticRetryInFlightRef.current || AppState.currentState !== 'active'
        || (SUPABASE_ENABLED && activeUserIdRef.current !== myUserId)) return;
    const expectedUserId = myUserId;
    automaticRetryInFlightRef.current = true;
    try {
      const queued = await loadPendingMessages(myUserId, conversation.id);
      setPendingOutbox(queued);
      // Keep foreground recovery responsive on large backlogs. Retry only a
      // small oldest-first batch per cycle; the 15-second scheduler drains the rest.
      const dueQueued = queued
        .filter((item) => isMessageRetryDue(item))
        .sort((a, b) => Date.parse(a.createdAt || 0) - Date.parse(b.createdAt || 0))
        .slice(0, 5);
      for (const item of dueQueued) {
        if (SUPABASE_ENABLED && activeUserIdRef.current !== expectedUserId) return;
        try {
          const confirmed = await sendMessage(conversation.id, item.text, item.replyToId, item.requestId, expectedUserId);
          if (SUPABASE_ENABLED && activeUserIdRef.current !== expectedUserId) return;
          await removePendingMessage(myUserId, conversation.id, item.requestId);
          setPendingOutbox((items) => items.filter((entry) => entry.requestId !== item.requestId));
          setMessages((items) => items.some((entry) => entry.id === confirmed.id) ? items : [...items, confirmed]);
          stickToBottom.current = true;
        } catch (error) {
          if (error?.code === 'AUTH_USER_CHANGED'
              || (SUPABASE_ENABLED && activeUserIdRef.current !== expectedUserId)) return;
          if (isPermanentMessageSendError(error)) {
            const removed = await removePendingMessage(myUserId, conversation.id, item.requestId);
            if (removed) setPendingOutbox((items) => items.filter((entry) => entry.requestId !== item.requestId));
            setSendError(removed
              ? (error?.message || 'This message can no longer be sent. Edit it and try again.')
              : 'This message was rejected, but its local retry record could not be cleared. Check device storage before retrying.');
          } else {
            await recordMessageRetryFailure(myUserId, conversation.id, item.requestId, error);
          }
          // Background retries stay quiet. Permanent failures are removed
          // from the retry queue and surfaced inline instead of retrying forever.
        }
      }
      if (!SUPABASE_ENABLED || activeUserIdRef.current === expectedUserId) {
        setPendingOutbox(await loadPendingMessages(expectedUserId, conversation.id));
      }
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
      const permanentFailure = isPermanentMessageSendError(err);
      let queued = false;
      if (permanentFailure) {
        if (existingRequestId) {
          const removed = await removePendingMessage(myUserId, conversation.id, requestId);
          if (removed) setPendingOutbox((items) => items.filter((item) => item.requestId !== requestId));
        }
      } else {
        queued = await savePendingMessage(myUserId, conversation.id, pending);
        if (queued) setPendingOutbox((items) => [...items.filter((item) => item.requestId !== requestId), pending]);
      }
      console.error('[ChatScreen] Message send failed:', err);
      const blocked = err?.code === '42501' || /row-level security|no longer have permission/i.test(err.message || '');
      const failureMessage = blocked
        ? 'You can no longer send messages in this conversation.'
        : permanentFailure
          ? err.message || 'This message can no longer be sent. Edit it and try again.'
          : !queued
            ? 'Your message could not be saved for automatic retry because the pending-message queue is full or local storage is unavailable. Keep this draft and try again after clearing pending messages.'
            : err.message || 'Please try again.';
      setSendError(failureMessage);
      Alert.alert('Message not sent', failureMessage);
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

  async function performDeleteMessage(message, mode = 'everyone') {
    if (!message || deletingMessage) return;

    setDeletingMessage(true);
    setDeleteMessageError('');

    try {
      await deleteMessage(message.id, mode);
      setMessages((prev) => mode === 'me'
        ? prev.filter((m) => m.id !== message.id)
        : prev.map((m) => m.id === message.id
          ? { ...m, deletedAt: new Date().toISOString(), text: '', mediaUrl: null }
          : m));
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
    if (isPermanentAttachmentUploadError(error)) {
      Alert.alert('Attachment cannot be uploaded', getPermanentAttachmentErrorMessage(error));
      return;
    }
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
    if (!asset?.uri) return;
    setMediaCaption('');
    setMediaDraft({ kind: 'image', uri: asset.uri, mimeType: asset.mimeType || 'image/jpeg', name: asset.fileName || 'Photo', size: asset.fileSize || 0 });
  }

  async function handlePickedVideo(asset) {
    if (!asset?.uri) return;
    if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
      Alert.alert('Video too large', 'Videos are limited to 25MB for now. Choose a shorter or smaller video.');
      return;
    }
    setMediaCaption('');
    setMediaDraft({ kind: 'video', uri: asset.uri, mimeType: asset.mimeType || 'video/mp4', name: asset.fileName || 'Video', size: asset.fileSize || 0, durationSeconds: asset.duration ? Math.round(asset.duration / 1000) : undefined });
  }

  async function sendMediaDraft() {
    const draft = mediaDraft;
    if (!draft || uploading) return;
    const item = makeAttachmentOutboxItem(draft.kind, draft.uri, { mimeType: draft.mimeType, name: draft.name, size: draft.size, durationSeconds: draft.durationSeconds, caption: mediaCaption.trim() });
    setUploading(true);
    try {
      let uploaded;
      try {
        uploaded = draft.kind === 'image'
          ? await uploadChatImage(conversation.id, draft.uri, draft.mimeType)
          : await uploadChatFile(conversation.id, draft.uri, draft.name, draft.mimeType, draft.size);
      } catch (err) {
        await queueAttachmentRetry(item, err);
        return;
      }
      const sent = await sendAttachment(conversation.id, { mediaUrl: uploaded.url, mediaType: draft.kind, mediaName: uploaded.name || draft.name, mediaSize: uploaded.size || draft.size, mediaDuration: uploaded.duration || draft.durationSeconds, text: mediaCaption.trim() });
      setMessages((prev) => [...prev, sent]);
      stickToBottom.current = true;
      setMediaDraft(null);
      setMediaCaption('');
    } catch (err) {
      Alert.alert(`Couldn't send ${draft.kind}`, err.message || 'Please try again.');
    } finally { setUploading(false); }
  }

  async function handleSaveMedia(uri, kind = 'image') {
    if (!uri) return;
    try {
      await saveMediaToLibrary({ uri, kind, FileSystem, MediaLibrary, prefix: 'zannychat-chat' });
      Alert.alert('Saved to your library', `${kind === 'video' ? 'Video' : 'Image'} saved successfully.`);
    } catch (error) {
      Alert.alert('Could not save media', error?.message || 'Please try again.');
    }
  }

  function discardPendingAttachment(item) {
    const label = item.name || (item.kind === 'image' ? 'photo' : item.kind === 'video' ? 'video' : item.kind === 'voice' ? 'voice note' : 'file');
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
          else if (item.kind === 'video') uploaded = await uploadChatFile(conversation.id, item.uri, item.name || 'Video.mp4', item.mimeType || 'video/mp4', item.size);
          else if (item.kind === 'file') uploaded = await uploadChatFile(conversation.id, item.uri, item.name, item.mimeType, item.size);
          else uploaded = await uploadVoiceNote(conversation.id, item.uri, item.durationSeconds);
        } catch (error) {
          if (isPermanentAttachmentUploadError(error)) {
            const removed = await removePendingAttachment(myUserId, conversation.id, item.id);
            if (removed) {
              await removePreservedAttachment(FileSystem, item);
              setPendingAttachments((items) => items.filter((entry) => entry.id !== item.id));
            }
            Alert.alert(
              'Attachment cannot be uploaded',
              `${getPermanentAttachmentErrorMessage(error)}${removed ? ' The invalid retry item was removed.' : ' Remove this item from the retry list.'}`
            );
            break;
          }
          await recordAttachmentRetryFailure(myUserId, conversation.id, item.id, error);
          setPendingAttachments((items) => items.map((entry) => entry.id === item.id ? {
            ...entry,
            attempts: Math.min(100, (Number.isInteger(entry.attempts) ? entry.attempts : 0) + 1),
            lastAttemptAt: new Date().toISOString(),
            nextRetryAt: getAttachmentNextRetryAt(Math.min(100, (Number.isInteger(entry.attempts) ? entry.attempts : 0) + 1)),
            lastError: getSafeRetryError(error, 'attachment'),
          } : entry));
          Alert.alert('Attachment still waiting', getSafeRetryError(error, 'attachment'));
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
            text: item.caption || '',
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
    const mediaPrefs = await loadMediaPreferences();
    const quality = resolvePhotoUploadQuality(mediaPrefs);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality });
    if (result.canceled) return;
    await handlePickedImage(result.assets?.[0]);
  }

  async function handlePickVideo() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsEditing: false, videoMaxDuration: 120 });
    if (result.canceled) return;
    await handlePickedVideo(result.assets?.[0]);
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
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality });
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
        avatarColor: colors.primary,
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
    { key: 'photo', label: 'Photo library · crop & caption', icon: 'images-outline', onPress: () => { setActiveSheet(null); handlePickImage(); } },
    { key: 'video', label: 'Video library · preview & caption', icon: 'videocam-outline', onPress: () => { setActiveSheet(null); handlePickVideo(); } },
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
    ...(ultraCompactHeader ? [
      { key: 'audio-call', label: display.isGroup ? 'Start group audio call' : 'Start audio call', icon: 'call-outline', onPress: () => { setActiveSheet(null); display.isGroup ? handleStartGroupCall('audio') : handleStartCall('audio'); } },
      { key: 'video-call', label: display.isGroup ? 'Start group video call' : 'Start video call', icon: 'videocam-outline', onPress: () => { setActiveSheet(null); display.isGroup ? handleStartGroupCall('video') : handleStartCall('video'); } },
    ] : []),
    ...(compactHeader ? [
      { key: 'search-messages', label: searchOpen ? 'Close message search' : 'Search messages', icon: 'search-outline', onPress: () => { setActiveSheet(null); toggleSearch(); } },
      { key: 'summarize-chat', label: 'Summarize conversation', icon: 'sparkles-outline', onPress: () => { setActiveSheet(null); handleSummarize(); } },
      ...(display.isGroup ? [{ key: 'manage-group', label: 'Manage group members', icon: 'people-outline', onPress: () => { setActiveSheet(null); navigation.navigate('GroupManagement', { conversation: display }); } }] : []),
    ] : []),
    { key: 'scheduled-messages', label: 'Schedule message', icon: 'time-outline', onPress: () => { setActiveSheet(null); navigation.navigate('ScheduledMessages', { conversation: display }); } },
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
        {
          key: 'delete',
          label: sheetMessage.deletedAt ? 'Remove deleted message' : isMineMessage(sheetMessage) ? 'Delete' : 'Delete for me',
          icon: 'trash-outline',
          destructive: true,
          onPress: () => {
            setActiveSheet(null);
            if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
              confirmDeleteMessage(sheetMessage);
            } else {
              setTimeout(() => confirmDeleteMessage(sheetMessage), 350);
            }
          },
        },
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

  const handleStartGroupCall = useCallback((callType) => {
    navigation.navigate('GroupCall', {
      conversationId: display.id,
      conversationName: display.participant?.name || 'Group',
      callType,
    });
  }, [display, navigation]);

  const handleStartCall = useCallback(async (callType) => {
    if (!canStartCall({ conversationId: display.id, participantId: display.participant?.id, isGroup: display.isGroup, callType })) {
      Alert.alert('Calls unavailable', 'Audio and video calls are currently available in direct conversations.');
      return;
    }
    try {
      const call = await startCall({ conversationId: display.id, calleeId: display.participant.id, callType });
      navigation.navigate('OutgoingCall', { call, callType, participantName: display.participant.name || 'ZannyChat contact', avatarColor: display.participant.avatarColor });
    } catch (error) {
      Alert.alert('Could not start call', error?.message || 'Check your connection and try again.');
    }
  }, [display, navigation]);

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
        onTitlePress={!display.isGroup && display.participant?.id ? () => navigation.navigate('PeerProfile', { participant: display.participant, conversation: display }) : undefined}
        onBack={() => navigation.goBack()}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {!ultraCompactHeader && !display.isGroup && display.participant?.id ? (
              <>
                <TouchableOpacity style={[styles.headerAction, { marginRight: spacing.xxs, backgroundColor: hexToRgba(colors.surface, 0.72), borderColor: hexToRgba(colors.textPrimary, 0.12), shadowColor: colors.primary }]} onPress={() => handleStartCall('audio')} accessibilityLabel="Start audio call" accessibilityRole="button">
                  <Ionicons name="call-outline" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.headerAction, { marginRight: spacing.xxs, backgroundColor: hexToRgba(colors.surface, 0.72), borderColor: hexToRgba(colors.textPrimary, 0.12), shadowColor: colors.primary }]} onPress={() => handleStartCall('video')} accessibilityLabel="Start video call" accessibilityRole="button">
                  <Ionicons name="videocam-outline" size={21} color={colors.textPrimary} />
                </TouchableOpacity>
              </>
            ) : null}
            {!ultraCompactHeader && display.isGroup ? (
              <>
                <TouchableOpacity style={[styles.headerAction, { marginRight: spacing.xxs, backgroundColor: hexToRgba(colors.surface, 0.72), borderColor: hexToRgba(colors.textPrimary, 0.12), shadowColor: colors.primary }]} onPress={() => handleStartGroupCall('audio')} accessibilityLabel="Start group audio call" accessibilityRole="button">
                  <Ionicons name="call-outline" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.headerAction, { marginRight: spacing.xxs, backgroundColor: hexToRgba(colors.surface, 0.72), borderColor: hexToRgba(colors.textPrimary, 0.12), shadowColor: colors.primary }]} onPress={() => handleStartGroupCall('video')} accessibilityLabel="Start group video call" accessibilityRole="button">
                  <Ionicons name="videocam-outline" size={21} color={colors.textPrimary} />
                </TouchableOpacity>
              </>
            ) : null}
            {!compactHeader && <TouchableOpacity
              style={[styles.headerAction, { marginRight: spacing.xxs, backgroundColor: hexToRgba(colors.surface, 0.72), borderColor: hexToRgba(colors.textPrimary, 0.12), shadowColor: colors.primary }]}
              onPress={toggleSearch}
              accessibilityLabel={searchOpen ? 'Close message search' : 'Search messages in this conversation'}
              accessibilityRole="button"
            >
              <Ionicons name={searchOpen ? 'close' : 'search-outline'} size={20} color={colors.textPrimary} />
            </TouchableOpacity>}
            {!compactHeader && <TouchableOpacity
              style={[styles.headerAction, { marginRight: spacing.xxs, backgroundColor: hexToRgba(colors.surface, 0.72), borderColor: hexToRgba(colors.textPrimary, 0.12), shadowColor: colors.primary }]}
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
            </TouchableOpacity>}
            {!compactHeader && display.isGroup ? (
              <TouchableOpacity
                style={[styles.headerAction, { marginRight: spacing.xxs, backgroundColor: hexToRgba(colors.surface, 0.72), borderColor: hexToRgba(colors.textPrimary, 0.12), shadowColor: colors.primary }]}
                onPress={() => navigation.navigate('GroupManagement', { conversation: display })}
                accessibilityLabel="Manage group members"
                accessibilityRole="button"
              >
                <Ionicons name="people-outline" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.headerAction, { marginRight: spacing.xxs, backgroundColor: hexToRgba(colors.surface, 0.72), borderColor: hexToRgba(colors.textPrimary, 0.12), shadowColor: colors.primary }]}
              onPress={() => setActiveSheet('overflow')}
              accessibilityLabel="Conversation options"
              accessibilityRole="button"
            >
              <Ionicons name="ellipsis-vertical" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { if (!display.isGroup && display.participant?.id) navigation.navigate('PeerProfile', { participant: display.participant, conversation: display }); }} accessibilityRole="button" accessibilityLabel={`View ${display.participant?.name || 'contact'} profile`} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
            <Avatar
              name={display.participant?.name}
              color={display.participant?.avatarColor}
              imageUrl={display.participant?.avatarUrl}
              isGroup={display.isGroup}
              size={32}
            />
            </TouchableOpacity>
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
              style={[typography.body, { color: colors.textPrimary, flex: 1, minWidth: 0, marginLeft: spacing.sm, paddingVertical: 8 }]}
              accessibilityLabel="Search messages in this conversation"
              accessibilityHint="Searches text and attachment names in messages already loaded"
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setActiveSearchIndex(0); }} accessibilityLabel="Clear message search" accessibilityRole="button" hitSlop={8} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.searchControls}>
            <Text style={[typography.small, { color: colors.textSecondary, flex: 1, minWidth: 0 }]}>
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
        <FlatList keyboardShouldPersistTaps="handled"
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          windowSize={9}
          maintainVisibleContentPosition={{ minIndexForVisible: 1 }}
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
            <View style={{ alignItems: 'center' }}>
              {olderLoadError ? (
                <View style={{ alignItems: 'center', paddingHorizontal: spacing.md, paddingBottom: spacing.sm }}>
                  <Text accessibilityRole="alert" style={[typography.small, { color: colors.danger || colors.textSecondary, textAlign: 'center', marginBottom: 6 }]}>{olderLoadError}</Text>
                  <TouchableOpacity onPress={loadOlder} disabled={loadingOlder} accessibilityLabel="Retry loading earlier messages" accessibilityRole="button" accessibilityState={{ disabled: loadingOlder }} style={[styles.loadOlderPill, { borderColor: colors.border, borderWidth: 1, borderRadius: radii.pill, minHeight: 48, justifyContent: 'center' }]}>
                    <Text style={[typography.small, { color: colors.textPrimary }]}>Try again</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {hasMore && !olderLoadError ? (
                <TouchableOpacity
                  onPress={loadOlder}
                  disabled={loadingOlder}
                  accessibilityLabel="Load earlier messages"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: loadingOlder }}
                  style={{ alignSelf: 'center', marginBottom: spacing.sm, minHeight: 48, justifyContent: 'center' }}
                >
                  <View style={[styles.loadOlderPill, { borderColor: colors.border, backgroundColor: hexToRgba(colors.surface, 0.6), borderRadius: radii.pill }]}>
                    {loadingOlder ? <ActivityIndicator size="small" color={colors.textSecondary} /> : <Text style={[typography.small, { color: colors.textSecondary }]}>Load earlier messages</Text>}
                  </View>
                </TouchableOpacity>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            loadingMessages ? (
              <View style={{ minHeight: 180, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[typography.small, { color: colors.textSecondary, marginTop: spacing.sm }]}>Loading messages…</Text>
              </View>
            ) : messageLoadError ? (
              <View style={{ minHeight: 180, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
                <Text accessibilityRole="alert" style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md }]}>{messageLoadError}</Text>
                <TouchableOpacity onPress={load} accessibilityRole="button" accessibilityLabel="Retry loading messages" style={[styles.loadOlderPill, { borderColor: colors.border, borderWidth: 1, borderRadius: radii.pill, minHeight: 48, justifyContent: 'center' }]}>
                  <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Try again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ minHeight: 180, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
                <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>No messages yet. Say hello to start the conversation.</Text>
              </View>
            )
          }
          renderItem={({ item }) => {
            if (item.type === 'day') return <ChatMessageRow item={item} />;
            const mine = isMineMessage(item);
            const reactionList = reactions[item.id] || [];
            // Unique emojis for the badge row, capped at 3 with a count.
            const uniqueEmojis = [...new Set(reactionList.map((r) => r.emoji))].slice(0, 3);
            const reactionExtra = reactionList.length > 3 ? reactionList.length : 0;
            return (
              <ChatMessageRow
                item={item}
                mine={mine}
                isGroup={display.isGroup}
                status={mine ? computeStatus(item) : undefined}
                seenByCount={mine && display.isGroup ? computeGroupSeenCount(item) : 0}
                deliveredToCount={mine && display.isGroup ? computeGroupDeliveredCount(item) : 0}
                reactions={uniqueEmojis}
                reactionExtra={reactionExtra}
                searchHighlight={searchMatches.some((match) => match.id === item.id) || item.id === targetMessageId}
                activeSearchHighlight={activeSearchMessage?.id === item.id || item.id === targetMessageId}
                onSwipeReply={setReplyingTo}
                onShowActions={openMessageActions}
                onViewImage={setFullscreenImage}
                onSaveMedia={handleSaveMedia}
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
                <TouchableOpacity disabled={retryingAttachments} onPress={() => retryPendingAttachments(item.id)} accessibilityRole="button" accessibilityLabel={`Retry queued ${item.kind} attachment`} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 12 }}>Retry</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={retryingAttachments} onPress={() => discardPendingAttachment(item)} accessibilityRole="button" accessibilityLabel={`Remove queued ${item.kind} attachment`} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 12 }}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity disabled={retryingAttachments} onPress={retryPendingAttachments} style={{ alignSelf: 'flex-end', minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 }} accessibilityRole="button" accessibilityLabel="Retry attachment uploads">
              <Text style={{ color: colors.accent, fontWeight: '700' }}>{retryingAttachments ? 'Retrying uploads…' : 'Retry eligible uploads'}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {pendingOutbox.length > 0 ? (
          <View style={{ marginHorizontal: spacing.md, marginBottom: 8, padding: 10, borderRadius: 8, backgroundColor: hexToRgba(colors.accent, 0.10) }}>
            <Text style={{ color: colors.text, fontSize: 13 }}>{pendingOutbox.length} message{pendingOutbox.length === 1 ? '' : 's'} waiting to send. They are saved on this device.</Text>
            <TouchableOpacity disabled={retryingOutbox} onPress={async () => { if (automaticRetryInFlightRef.current) return; automaticRetryInFlightRef.current = true; setRetryingOutbox(true); try { for (const item of [...pendingOutbox]) { const ok = await handleSend(item.text, item.requestId, item.replyToId); if (!ok) break; } } finally { automaticRetryInFlightRef.current = false; setRetryingOutbox(false); } }} style={{ alignSelf: 'flex-end', minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 }} accessibilityRole="button" accessibilityLabel="Retry sending pending messages" accessibilityState={{ disabled: retryingOutbox, busy: retryingOutbox }}>
              <Text style={{ color: colors.accent, fontWeight: '700' }}>{retryingOutbox ? 'Retrying…' : 'Retry pending messages'}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {sendError ? (
          <View style={{ marginHorizontal: spacing.md, marginBottom: 8, padding: 10, borderRadius: 8, backgroundColor: colors.surface }}>
            <Text style={{ color: colors.danger, fontSize: 13 }}>
              Message not sent: {sendError}
            </Text>
            <TouchableOpacity onPress={() => setSendError('')} style={{ alignSelf: 'flex-end', minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 }} accessibilityRole="button" accessibilityLabel="Dismiss message error">
              <Text style={{ color: colors.danger, fontWeight: '600' }}>Dismiss</Text>
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
Choose whether to remove this message only from your chat or retract it
              for everyone. Retraction is available only for messages you sent.
            </Text>

            {deleteMessageError ? (
              <Text
                style={{
                  color: colors.danger,
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
                style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 8 }}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={deletingMessage}
                onPress={() => performDeleteMessage(deleteMessageTarget, 'me')}
                accessibilityRole="button"
                accessibilityLabel="Delete message for me"
                style={{
                  paddingHorizontal: 16,
                  minHeight: 48,
                  paddingVertical: 8,
                  borderRadius: radii.md || 10,
                  backgroundColor: colors.danger,
                  opacity: deletingMessage ? 0.65 : 1,
                  minWidth: 90,
                  alignItems: 'center',
                }}
              >
                {deletingMessage ? (
                  <ActivityIndicator size="small" color={colors.onDanger} />
                ) : (
                  <Text style={{ color: colors.onDanger, fontWeight: '700' }}>
                    Delete for me
                  </Text>
                )}
              </TouchableOpacity>
              {!deleteMessageTarget?.deletedAt && deleteMessageTarget?.senderId === myUserId ? (
                <TouchableOpacity
                  disabled={deletingMessage}
                  onPress={() => performDeleteMessage(deleteMessageTarget, 'everyone')}
                  accessibilityRole="button"
                  accessibilityLabel="Delete message for everyone"
                  style={{ minHeight: 48, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radii.md || 10, backgroundColor: colors.danger, opacity: deletingMessage ? 0.65 : 1, minWidth: 120, alignItems: 'center' }}
                >
                  {deletingMessage ? <ActivityIndicator size="small" color={colors.onDanger} /> : <Text style={{ color: colors.onDanger, fontWeight: '700' }}>Delete for everyone</Text>}
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(mediaDraft)} animationType="slide" onRequestClose={() => setMediaDraft(null)}>
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'ios' ? 52 : 24, paddingHorizontal: spacing.md, paddingBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
            <TouchableOpacity onPress={() => { setMediaDraft(null); setMediaCaption(''); }} accessibilityRole="button" accessibilityLabel="Discard media draft" style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="close" size={26} color={colors.textPrimary} /></TouchableOpacity>
            <Text style={[typography.title, { color: colors.textPrimary }]}>Edit before sending</Text>
            <TouchableOpacity onPress={sendMediaDraft} disabled={uploading} accessibilityRole="button" accessibilityLabel="Send media" style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="send" size={22} color={colors.primary} /></TouchableOpacity>
          </View>
          <View style={{ flex: 1, minHeight: 220, borderRadius: radii.lg, overflow: 'hidden', backgroundColor: '#080808', justifyContent: 'center' }}>
            {mediaDraft?.kind === 'video' && mediaDraft?.uri ? <DraftVideoPreview uri={mediaDraft.uri} /> : mediaDraft?.uri ? <Image source={{ uri: mediaDraft.uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" /> : null}
          </View>
          <Text style={[typography.small, { color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs }]}>CAPTION & EMOJI</Text>
          <TextInput value={mediaCaption} onChangeText={setMediaCaption} placeholder="Add a caption…" placeholderTextColor={colors.textSecondary} multiline maxLength={1000} style={{ minHeight: 54, maxHeight: 110, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, color: colors.textPrimary, padding: spacing.md }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm }}>
            {['❤️', '😂', '🔥', '😍', '✨', '👍', '🎉', '🥹'].map((emoji) => <TouchableOpacity key={emoji} onPress={() => setMediaCaption((value) => `${value}${emoji}`)} accessibilityRole="button" accessibilityLabel={`Add ${emoji}`} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 24 }}>{emoji}</Text></TouchableOpacity>)}
          </View>
          <TouchableOpacity onPress={sendMediaDraft} disabled={uploading} accessibilityRole="button" accessibilityLabel="Send selected media" accessibilityState={{ disabled: uploading, busy: uploading }} style={{ minHeight: 48, marginTop: spacing.lg, borderRadius: radii.md, backgroundColor: colors.primary, padding: spacing.sm, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', opacity: uploading ? 0.65 : 1 }}>
            {uploading ? <ActivityIndicator color={colors.onPrimary} /> : <Ionicons name="send" size={18} color={colors.onPrimary} />}
            <Text style={[typography.bodyStrong, { color: colors.onPrimary, marginLeft: 8 }]}>{uploading ? 'Sending…' : 'Send media'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={Boolean(fullscreenImage)} transparent animationType="fade" onRequestClose={() => setFullscreenImage(null)}>
        <View style={styles.lightbox}>
          <TouchableOpacity
            style={[styles.lightboxClose, { right: 60 }]}
            onPress={() => handleSaveMedia(fullscreenImage, 'image')}
            hitSlop={16}
            accessibilityLabel="Save image to device"
            accessibilityRole="button"
          >
            <Ionicons name="download-outline" size={25} color={colors.onPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.lightboxClose}
            onPress={() => setFullscreenImage(null)}
            hitSlop={16}
            accessibilityLabel="Close fullscreen image"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={28} color={colors.onPrimary} />
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
  headerAction: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.14, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  searchPanel: { borderBottomWidth: StyleSheet.hairlineWidth },
  searchField: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 10 },
  searchControls: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  searchNavButton: { width: 48, height: 48, minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  chip: { minHeight: 48, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 8 },
  loadOlderPill: { minHeight: 48, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  lightboxImage: { width: '100%', height: '80%' },
  lightboxClose: { position: 'absolute', top: 56, right: 20, zIndex: 1 },
});
