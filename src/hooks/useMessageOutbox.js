import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SUPABASE_ENABLED } from '../services/supabaseClient';
import { loadPendingMessages, savePendingMessage, removePendingMessage, recordMessageRetryFailure, isMessageRetryDue } from '../services/messageOutbox';
import { sendMessage } from '../services/api';
import { isPermanentMessageSendError } from '../utils/safeMessagingError';
import { MAX_PENDING_MESSAGES } from '../utils/normalizePendingMessages';

const AUTOMATIC_RETRY_BATCH_SIZE = 5;
const RETRY_INTERVAL_MS = 15000;

/**
 * Owns the account-scoped pending text-message queue and foreground retry
 * lifecycle. Composer/edit state stays in ChatScreen.
 */
export default function useMessageOutbox({
  conversationId,
  myUserId,
  activeUserIdRef,
  setMessages,
  setSendError,
  stickToBottom,
}) {
  const [pendingOutbox, setPendingOutbox] = useState([]);
  const [retryingOutbox, setRetryingOutbox] = useState(false);
  const retryGenerationRef = useRef(0);
  const retryInFlightRef = useRef(false);

  const isOwnerCurrent = useCallback((expectedUserId) => (
    !SUPABASE_ENABLED || activeUserIdRef.current === expectedUserId
  ), [activeUserIdRef]);

  const resetOutbox = useCallback(() => {
    retryGenerationRef.current += 1;
    retryInFlightRef.current = false;
    setPendingOutbox([]);
    setRetryingOutbox(false);
  }, []);

  useEffect(() => {
    let active = true;
    const generation = ++retryGenerationRef.current;
    if (!myUserId) {
      setPendingOutbox([]);
      return () => { active = false; };
    }
    loadPendingMessages(myUserId, conversationId)
      .then((items) => {
        if (active && generation === retryGenerationRef.current && isOwnerCurrent(myUserId)) {
          setPendingOutbox(items);
        }
      })
      .catch(() => {
        if (active && generation === retryGenerationRef.current && isOwnerCurrent(myUserId)) {
          setPendingOutbox([]);
        }
      });
    return () => {
      active = false;
      if (generation === retryGenerationRef.current) {
        retryGenerationRef.current += 1;
        retryInFlightRef.current = false;
      }
    };
  }, [myUserId, conversationId, isOwnerCurrent]);

  const queuePendingMessage = useCallback(async (message) => {
    if (!myUserId || !conversationId) return false;
    const expectedUserId = myUserId;
    const generation = retryGenerationRef.current;
    const saved = await savePendingMessage(expectedUserId, conversationId, message);
    if (saved && generation === retryGenerationRef.current && isOwnerCurrent(expectedUserId)) {
      setPendingOutbox((items) => [
        ...items.filter((item) => item.requestId !== message.requestId),
        message,
      ].slice(0, MAX_PENDING_MESSAGES));
    }
    return saved;
  }, [myUserId, conversationId, isOwnerCurrent]);

  const removeQueuedMessage = useCallback(async (requestId) => {
    if (!myUserId || !conversationId || !requestId) return false;
    const expectedUserId = myUserId;
    const generation = retryGenerationRef.current;
    const removed = await removePendingMessage(expectedUserId, conversationId, requestId);
    if (removed && generation === retryGenerationRef.current && isOwnerCurrent(expectedUserId)) {
      setPendingOutbox((items) => items.filter((item) => item.requestId !== requestId));
    }
    return removed;
  }, [myUserId, conversationId, isOwnerCurrent]);

  const retryQueuedTextMessages = useCallback(async ({ force = false } = {}) => {
    if (!myUserId || !conversationId || retryInFlightRef.current || AppState.currentState !== 'active'
        || !isOwnerCurrent(myUserId)) return;
    const expectedUserId = myUserId;
    const generation = retryGenerationRef.current;
    retryInFlightRef.current = true;
    try {
      const queued = await loadPendingMessages(expectedUserId, conversationId);
      if (generation !== retryGenerationRef.current || !isOwnerCurrent(expectedUserId)) return;
      setPendingOutbox(queued);
      const dueQueued = queued
        .filter((item) => force || isMessageRetryDue(item))
        .sort((a, b) => Date.parse(a.createdAt || 0) - Date.parse(b.createdAt || 0))
        .slice(0, force ? MAX_PENDING_MESSAGES : AUTOMATIC_RETRY_BATCH_SIZE);
      for (const item of dueQueued) {
        if (generation !== retryGenerationRef.current || !isOwnerCurrent(expectedUserId)) return;
        try {
          const confirmed = await sendMessage(conversationId, item.text, item.replyToId, item.requestId, expectedUserId);
          if (generation !== retryGenerationRef.current || !isOwnerCurrent(expectedUserId)) return;
          await removePendingMessage(expectedUserId, conversationId, item.requestId);
          if (generation !== retryGenerationRef.current || !isOwnerCurrent(expectedUserId)) return;
          setPendingOutbox((items) => items.filter((entry) => entry.requestId !== item.requestId));
          setMessages((items) => items.some((entry) => entry.id === confirmed.id) ? items : [...items, confirmed]);
          if (stickToBottom?.current !== undefined) stickToBottom.current = true;
        } catch (error) {
          if (error?.code === 'AUTH_USER_CHANGED' || generation !== retryGenerationRef.current || !isOwnerCurrent(expectedUserId)) return;
          if (isPermanentMessageSendError(error)) {
            const removed = await removePendingMessage(expectedUserId, conversationId, item.requestId);
            if (generation === retryGenerationRef.current && isOwnerCurrent(expectedUserId)) {
              if (removed) setPendingOutbox((items) => items.filter((entry) => entry.requestId !== item.requestId));
              setSendError(removed
                ? (error?.message || 'This message can no longer be sent. Edit it and try again.')
                : 'This message was rejected, but its local retry record could not be cleared. Check device storage before retrying.');
            }
          } else {
            await recordMessageRetryFailure(expectedUserId, conversationId, item.requestId, error);
          }
        }
      }
      if (generation === retryGenerationRef.current && isOwnerCurrent(expectedUserId)) {
        setPendingOutbox(await loadPendingMessages(expectedUserId, conversationId));
      }
    } finally {
      if (generation === retryGenerationRef.current) retryInFlightRef.current = false;
    }
  }, [myUserId, conversationId, isOwnerCurrent, setMessages, setSendError, stickToBottom]);

  const retryPendingMessages = useCallback(async () => {
    if (retryInFlightRef.current) return;
    const generation = retryGenerationRef.current;
    setSendError('');
    setRetryingOutbox(true);
    try {
      await retryQueuedTextMessages({ force: true });
    } finally {
      if (generation === retryGenerationRef.current) setRetryingOutbox(false);
    }
  }, [retryQueuedTextMessages]);

  useFocusEffect(useCallback(() => {
    retryQueuedTextMessages();
    const interval = setInterval(() => retryQueuedTextMessages(), RETRY_INTERVAL_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') retryQueuedTextMessages();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [retryQueuedTextMessages]));

  return {
    pendingOutbox,
    retryingOutbox,
    queuePendingMessage,
    removeQueuedMessage,
    retryPendingMessages,
    resetOutbox,
  };
}
