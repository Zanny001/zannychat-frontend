import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { SUPABASE_ENABLED } from '../services/supabaseClient';
import {
  fetchMessages,
  markConversationRead,
  subscribeToParticipantUpdates,
  markMessagesDelivered,
  fetchMessageDeliveryState,
  subscribeToMessageDeliveryReceipts,
  fetchReactions,
  subscribeToMessages,
  subscribeToReactions,
  subscribeToTyping,
} from '../services/api';
import { subscribePresence } from '../services/presence';

const MESSAGE_PAGE_SIZE = 30;

/**
 * Owns the conversation timeline lifecycle: initial history, cursor paging,
 * delivery/read state, reactions, typing, presence and realtime subscriptions.
 * ChatScreen retains message mutations (send/edit/delete) and presentation.
 */
export default function useChatTimeline({ conversationId, myUserId, activeUserIdRef, stickToBottom }) {
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [messageLoadError, setMessageLoadError] = useState('');
  const [olderLoadError, setOlderLoadError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [reactions, setReactions] = useState({});
  const [participantReadState, setParticipantReadState] = useState({});
  const [messageDeliveryState, setMessageDeliveryState] = useState({});
  const [peerTyping, setPeerTyping] = useState(false);
  const [onlineIds, setOnlineIds] = useState(new Set());

  const senderNamesRef = useRef({});
  const typingTimeoutRef = useRef(null);
  const messageLoadRequestRef = useRef(0);
  const olderLoadRequestRef = useRef(0);

  const resetTimeline = useCallback((loadError = '') => {
    messageLoadRequestRef.current += 1;
    olderLoadRequestRef.current += 1;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = null;
    senderNamesRef.current = {};
    setMessages([]);
    setLoadingMessages(false);
    setMessageLoadError(loadError);
    setOlderLoadError('');
    setHasMore(false);
    setLoadingOlder(false);
    setReactions({});
    setParticipantReadState({});
    setMessageDeliveryState({});
    setPeerTyping(false);
    setOnlineIds(new Set());
    if (stickToBottom?.current !== undefined) stickToBottom.current = true;
  }, [stickToBottom]);

  const load = useCallback(async () => {
    const requestId = ++messageLoadRequestRef.current;
    if (SUPABASE_ENABLED && !myUserId) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }
    setLoadingMessages(true);
    setMessageLoadError('');
    try {
      const { messages: data, hasMore: more } = await fetchMessages(conversationId, { limit: MESSAGE_PAGE_SIZE });
      if (requestId !== messageLoadRequestRef.current || activeUserIdRef.current !== myUserId) return;
      data.forEach((message) => {
        if (message.senderName) senderNamesRef.current[message.senderId] = message.senderName;
      });
      setMessages(data);
      fetchMessageDeliveryState(conversationId, data.map((message) => message.id))
        .then((state) => {
          if (requestId === messageLoadRequestRef.current && activeUserIdRef.current === myUserId) {
            setMessageDeliveryState((prev) => ({ ...prev, ...state }));
          }
        }).catch(() => {});
      markMessagesDelivered(conversationId, data, myUserId).catch(() => {});
      setHasMore(more);
      if (stickToBottom?.current !== undefined) stickToBottom.current = true;
      fetchReactions(data.map((message) => message.id)).then((state) => {
        if (requestId === messageLoadRequestRef.current && activeUserIdRef.current === myUserId) setReactions(state);
      }).catch(() => {});
    } catch (error) {
      if (requestId === messageLoadRequestRef.current && activeUserIdRef.current === myUserId) {
        setMessageLoadError(error?.message || 'Could not load messages. Check your connection and try again.');
      }
    } finally {
      if (requestId === messageLoadRequestRef.current) setLoadingMessages(false);
    }
  }, [conversationId, myUserId, activeUserIdRef, stickToBottom]);

  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore || messages.length === 0 || (SUPABASE_ENABLED && !myUserId)) return;
    const requestId = ++olderLoadRequestRef.current;
    const expectedUserId = myUserId;
    setLoadingOlder(true);
    setOlderLoadError('');
    if (stickToBottom?.current !== undefined) stickToBottom.current = false;
    try {
      const oldest = messages[0];
      const { messages: older, hasMore: more } = await fetchMessages(conversationId, {
        limit: MESSAGE_PAGE_SIZE,
        before: { id: oldest?.id, created_at: oldest?.createdAtRaw },
      });
      if (requestId !== olderLoadRequestRef.current || activeUserIdRef.current !== expectedUserId) return;
      older.forEach((message) => {
        if (message.senderName) senderNamesRef.current[message.senderId] = message.senderName;
      });
      fetchMessageDeliveryState(conversationId, older.map((message) => message.id))
        .then((state) => {
          if (requestId === olderLoadRequestRef.current && activeUserIdRef.current === expectedUserId) {
            setMessageDeliveryState((prev) => ({ ...prev, ...state }));
          }
        }).catch(() => {});
      markMessagesDelivered(conversationId, older, myUserId).catch(() => {});
      setMessages((prev) => {
        const seen = new Set(prev.map((message) => message.id));
        return [...older.filter((message) => !seen.has(message.id)), ...prev];
      });
      setHasMore(more);
      fetchReactions(older.map((message) => message.id))
        .then((state) => {
          if (requestId === olderLoadRequestRef.current && activeUserIdRef.current === expectedUserId) {
            setReactions((prev) => ({ ...prev, ...state }));
          }
        }).catch(() => {});
    } catch (error) {
      if (requestId === olderLoadRequestRef.current && activeUserIdRef.current === expectedUserId) {
        setOlderLoadError(error?.message || 'Could not load earlier messages. Please try again.');
      }
    } finally {
      if (requestId === olderLoadRequestRef.current) setLoadingOlder(false);
    }
  }, [conversationId, hasMore, loadingOlder, messages, myUserId, activeUserIdRef, stickToBottom]);

  useEffect(() => {
    const unsubscribe = subscribeToMessages(conversationId, (newMessage) => {
      if (activeUserIdRef.current !== myUserId) return;
      if (newMessage?.senderId && newMessage.senderId !== myUserId) markMessagesDelivered(conversationId, [newMessage], myUserId).catch(() => {});
      setMessages((prev) => {
        if (prev.some((message) => message.id === newMessage.id)) return prev;
        const replyPreview = newMessage.replyToId
          ? prev.find((message) => message.id === newMessage.replyToId)?.text
          : undefined;
        const senderName = newMessage.senderName || senderNamesRef.current[newMessage.senderId];
        if (senderName) senderNamesRef.current[newMessage.senderId] = senderName;
        return [...prev, { ...newMessage, replyPreview, senderName }];
      });
      if (stickToBottom?.current !== undefined) stickToBottom.current = true;
    });
    return unsubscribe;
  }, [conversationId, myUserId, activeUserIdRef, stickToBottom]);

  useEffect(() => {
    const unsubscribe = subscribeToReactions((payload) => {
      if (activeUserIdRef.current !== myUserId) return;
      const row = payload.new || payload.old;
      if (!row?.message_id) return;
      setReactions((prev) => {
        if (!(row.message_id in prev) && payload.eventType !== 'INSERT') return prev;
        const list = [...(prev[row.message_id] || [])];
        if (payload.eventType === 'DELETE') {
          return { ...prev, [row.message_id]: list.filter((reaction) => reaction.userId !== row.user_id) };
        }
        const index = list.findIndex((reaction) => reaction.userId === row.user_id);
        if (index >= 0) list[index] = { userId: row.user_id, emoji: row.emoji };
        else list.push({ userId: row.user_id, emoji: row.emoji });
        return { ...prev, [row.message_id]: list };
      });
    });
    return unsubscribe;
  }, [myUserId, activeUserIdRef]);

  useEffect(() => {
    const unsubscribe = subscribeToTyping(conversationId, ({ userId }) => {
      if (activeUserIdRef.current !== myUserId) return;
      if (!userId || userId === myUserId) return;
      setPeerTyping(true);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setPeerTyping(false), 4000);
    });
    return () => {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
      unsubscribe();
    };
  }, [conversationId, myUserId, activeUserIdRef]);

  useEffect(() => subscribePresence((ids) => {
    if (activeUserIdRef.current === myUserId) setOnlineIds(ids);
  }), [myUserId, activeUserIdRef]);

  useEffect(() => {
    const unsubscribe = subscribeToParticipantUpdates(conversationId, (updated) => {
      if (activeUserIdRef.current !== myUserId) return;
      setParticipantReadState((prev) => ({ ...prev, [updated.user_id]: updated.last_read_at }));
    });
    return unsubscribe;
  }, [conversationId, myUserId, activeUserIdRef]);

  useEffect(() => {
    const unsubscribe = subscribeToMessageDeliveryReceipts(conversationId, (receipt) => {
      if (activeUserIdRef.current !== myUserId) return;
      if (!receipt?.message_id || !receipt?.user_id) return;
      setMessageDeliveryState((prev) => ({
        ...prev,
        [receipt.message_id]: [...new Set([...(prev[receipt.message_id] || []), receipt.user_id])],
      }));
    });
    return unsubscribe;
  }, [conversationId, myUserId, activeUserIdRef]);

  useFocusEffect(useCallback(() => {
    markConversationRead(conversationId).catch(() => {});
  }, [conversationId]));

  useFocusEffect(useCallback(() => {
    load();
    return () => {
      messageLoadRequestRef.current += 1;
      olderLoadRequestRef.current += 1;
    };
  }, [load]));

  useEffect(() => () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  }, []);

  return {
    messages, setMessages, loadingMessages, messageLoadError, olderLoadError,
    hasMore, loadingOlder, loadOlder, reactions, setReactions,
    participantReadState, messageDeliveryState,
    peerTyping, onlineIds, resetTimeline,
  };
}
