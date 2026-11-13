import React, { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as FileSystem from 'expo-file-system/legacy';
import { saveMediaToLibrary } from '../services/saveMediaToLibrary';
import { ActivityIndicator, Alert, AppState, Image, Modal, Platform, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../theme/ThemeContext';
import { filterStatusContacts } from '../utils/filterStatusContacts';
import { updateSelectedAudienceIds } from '../utils/statusAudienceSelection';
import { resolveStatusPublishAudience } from '../utils/statusPublishAudience';
import { getPrivacyLoadFailureState } from '../utils/statusPrivacyLoad';
import { filterEligibleStatusAudienceContacts, removeExcludedStatusAudienceIds } from '../utils/statusAudienceEligibility';
import { planStatusExclusionChanges } from '../utils/statusExclusionBulk';
import { adjustStatusDuration, DEFAULT_STATUS_DURATIONS, getAdjacentStoryStatus, getStatusDurationMs, STATUS_DURATION_STEP_MS } from '../utils/statusNavigation';
import { getStatusProgressPercent } from '../utils/statusProgress';
import { isLatestRequest } from '../utils/latestRequestGuard';
import { isStatusActiveAt, removeExpiredStatuses } from '../utils/statusExpiry';
import { normalizeStatusMediaUrl } from '../utils/statusMediaRecovery';
import { clearStatusDraft, readStatusDraft, writeStatusDraft } from '../utils/statusDraftStorage';
import { groupStatusUpdates } from '../utils/groupStatusUpdates';
import { firstUnseenStatus, markStatusSeen, markStatusesSeen, readSeenStatusIds, retainActiveSeenStatusIds, unreadStatusCount } from '../utils/statusSeen';
import { deleteStatus, listActiveStatuses, listStatusReactions, normalizeStatusText, publishPhotoStatus, publishVideoStatus, publishTextStatus, recordStatusView, reactToStatus, removeStatusReaction, listStatusReplies, sendStatusReply, listMutedStatusUsers, muteStatusUser, unmuteStatusUser, listStatusContacts, listStatusExclusions, setStatusExcludedUser, resolveStatusUserNames, subscribeToStatusChanges, refreshStatusMediaUrl, STATUS_REACTIONS, STATUS_TEXT_LIMIT } from '../services/statusUpdates';

function StatusVideo({ uri, height = '65%', paused = false, onError }) {
  const player = useVideoPlayer(uri, (instance) => { instance.loop = true; if (!paused) instance.play(); });
  useEffect(() => {
    if (paused) player.pause();
    else player.play();
  }, [paused, player]);
  useEffect(() => {
    // expo-video reports asynchronous playback/source failures through statusChange.
    const subscription = player.addListener('statusChange', (event) => {
      if (event?.status === 'error') onError?.(event?.error || new Error('Video playback failed.'));
    });
    return () => subscription?.remove?.();
  }, [player, onError]);
  return <VideoView player={player} nativeControls contentFit="contain" style={{ width: '100%', height }} />;
}

function ageLabel(value) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return 'Recently';
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  return minutes < 1 ? 'Just now' : minutes < 60 ? `${minutes}m ago` : `${Math.floor(minutes / 60)}h ago`;
}

async function saveStatusMedia(uri, kind) {
  if (!uri) return;
  try {
    await saveMediaToLibrary({ uri, kind, FileSystem, MediaLibrary, prefix: 'zannychat-status' });
    Alert.alert('Saved to your library', `${kind === 'video' ? 'Video' : 'Image'} saved successfully.`);
  } catch (error) { Alert.alert('Could not save media', error?.message || 'Please try again.'); }
}

export default function StatusUpdatesScreen({ navigation, route }) {
  const { colors, spacing, radii, typography } = useTheme();
  const [text, setText] = useState('');
  const statusTextInputRef = useRef(null);
  const [audience, setAudience] = useState('contacts');
  const [expiryHours, setExpiryHours] = useState(24);
  const [statusDraftReady, setStatusDraftReady] = useState(false);
  const [statusDraftSaved, setStatusDraftSaved] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [video, setVideo] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [publishSuccess, setPublishSuccess] = useState('');
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState(null);
  const [statusPaused, setStatusPaused] = useState(false);
  const [statusProgress, setStatusProgress] = useState(0);
  const [mediaLoadError, setMediaLoadError] = useState(false);
  const [retryingMedia, setRetryingMedia] = useState(false);
  const [statusDurations, setStatusDurations] = useState(DEFAULT_STATUS_DURATIONS);
  const [reactions, setReactions] = useState({});
  const [reactingStatusIds, setReactingStatusIds] = useState([]);
  const reactionLocksRef = useRef(new Set());
  const [replies, setReplies] = useState([]);
  const [repliesHasMore, setRepliesHasMore] = useState(false);
  const [loadingOlderReplies, setLoadingOlderReplies] = useState(false);
  const [replyCursor, setReplyCursor] = useState(null);
  const replyPageLockRef = useRef(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [mutedUsers, setMutedUsers] = useState([]);
  const [statusUserNames, setStatusUserNames] = useState({});
  const [privacyContacts, setPrivacyContacts] = useState([]);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [excludedUsers, setExcludedUsers] = useState([]);
  const [privacyBusy, setPrivacyBusy] = useState(false);
  const [privacyLoadError, setPrivacyLoadError] = useState('');
  const [privacySearch, setPrivacySearch] = useState('');
  const [privacyMode, setPrivacyMode] = useState('exclude');
  const [selectedAudienceIds, setSelectedAudienceIds] = useState([]);
  const [seenStatusIds, setSeenStatusIds] = useState([]);
  const seenStatusIdsRef = useRef([]);
  const requestedStoryOpenRef = useRef(null);
  const mediaRetryLockRef = useRef(false);
  const statusRefreshRequestRef = useRef(0);
  const groupedStatuses = groupStatusUpdates(statuses);
  const ownStatusGroup = groupedStatuses.find((group) => group.latest?.is_own);
  const friendStatusGroups = groupedStatuses.filter((group) => !group.latest?.is_own);
  const discoverStatuses = statuses.filter((item) => !item.is_own && ['image', 'video'].includes(item.media_kind)).slice(0, 8);

  useEffect(() => {
    // The server query excludes expired rows, but an already-open screen can outlive
    // a status. Prune on mount, periodically, and immediately on foreground because
    // mobile operating systems may throttle intervals while the app is backgrounded.
    const pruneExpired = () => {
      const now = Date.now();
      setStatuses((current) => removeExpiredStatuses(current, now));
      setViewing((current) => current && !isStatusActiveAt(current, now) ? null : current);
    };
    pruneExpired();
    const timer = setInterval(pruneExpired, 15000);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') pruneExpired();
    });
    return () => {
      clearInterval(timer);
      appStateSubscription?.remove?.();
    };
  }, []);

  useEffect(() => {
    let active = true;
    readStatusDraft(AsyncStorage).then((draft) => {
      if (!active) return;
      if (draft) {
        setText(draft.text);
        setAudience(draft.audience);
        setExpiryHours(draft.expiryHours);
        setSelectedAudienceIds(draft.selectedAudienceIds);
        setStatusDraftSaved(true);
      }
      setStatusDraftReady(true);
    }).catch(() => { if (active) setStatusDraftReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!statusDraftReady) return;
    const timer = setTimeout(() => {
      writeStatusDraft(AsyncStorage, { text, audience, expiryHours, selectedAudienceIds }).then((saved) => setStatusDraftSaved(Boolean(saved && text.trim())));
    }, 450);
    return () => clearTimeout(timer);
  }, [statusDraftReady, text, audience, expiryHours, selectedAudienceIds]);

  useEffect(() => {
    let active = true;
    readSeenStatusIds(AsyncStorage).then((ids) => { if (active) { seenStatusIdsRef.current = ids; setSeenStatusIds(ids); } }).catch(() => {});
    AsyncStorage.getItem('zannychat.status-duration-preferences.v1').then((raw) => {
      if (!active || !raw) return;
      try {
        const parsed = JSON.parse(raw);
        setStatusDurations((current) => ({ ...current, ...parsed }));
      } catch { /* Ignore corrupt local preferences and keep safe defaults. */ }
    }).catch(() => { /* Storage can be unavailable; defaults still work. */ });
    return () => { active = false; };
  }, []);

  const changeStatusDuration = useCallback((kind, delta) => {
    const next = adjustStatusDuration(statusDurations, kind, delta);
    setStatusDurations(next);
    AsyncStorage.setItem('zannychat.status-duration-preferences.v1', JSON.stringify(next)).catch(() => {
      Alert.alert('Duration not saved', 'This duration will apply for this session, but local storage was unavailable.');
    });
  }, [statusDurations]);

  const refresh = useCallback(async () => {
    // Focus events, realtime updates and manual refreshes can overlap. Only the
    // newest request may publish results, otherwise a slow stale response can
    // resurrect expired statuses or overwrite newer privacy/reaction state.
    const requestId = ++statusRefreshRequestRef.current;
    const isCurrent = () => isLatestRequest(requestId, statusRefreshRequestRef.current);
    setLoading(true);
    setError('');
    try {
      const rows = await listActiveStatuses();
      if (!isCurrent()) return;
      setStatuses(rows);
      const activeSeenIds = retainActiveSeenStatusIds(seenStatusIdsRef.current, rows);
      if (activeSeenIds.length !== seenStatusIdsRef.current.length) {
        seenStatusIdsRef.current = activeSeenIds;
        setSeenStatusIds(activeSeenIds);
        AsyncStorage.setItem('zannychat.status-seen.v1', JSON.stringify(activeSeenIds)).catch(() => {});
      }
      try {
        const nextReactions = await listStatusReactions(rows.map((row) => row.id));
        if (isCurrent()) setReactions(nextReactions);
      } catch {
        if (isCurrent()) setReactions({});
      }
      try {
        const muted = await listMutedStatusUsers();
        if (!isCurrent()) return;
        setMutedUsers(muted);
        try {
          const excluded = await listStatusExclusions();
          if (isCurrent()) setExcludedUsers(excluded);
        } catch {
          if (isCurrent()) setExcludedUsers([]);
        }
        const names = await resolveStatusUserNames([
          ...muted.map((row) => row.muted_user_id),
          ...rows.filter((row) => !row.is_own).map((row) => row.user_id),
        ]);
        if (isCurrent()) setStatusUserNames((old) => ({ ...old, ...names }));
      } catch {
        if (isCurrent()) setMutedUsers([]);
      }
    } catch (e) {
      if (isCurrent()) setError(e?.message || 'Could not load status updates.');
    } finally {
      if (isCurrent()) setLoading(false);
    }
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
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 });
      if (!result.canceled && result.assets?.[0]) { setPhoto(result.assets[0]); setVideo(null); setPublishError(''); setPublishSuccess(''); }
    } catch (pickerError) { setPublishError(pickerError?.message || 'The photo picker could not be opened.'); }
  };

  const chooseVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsEditing: false, videoMaxDuration: 30 });
      if (!result.canceled && result.assets?.[0]) { setVideo(result.assets[0]); setPhoto(null); setPublishError(''); setPublishSuccess(''); }
    } catch (pickerError) { setPublishError(pickerError?.message || 'The video picker could not be opened.'); }
  };
  const chooseCamera = async () => {
    if (Platform.OS === 'web') {
      let stream;
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera access requires a secure HTTPS browser with media-device support.');
        }
        // The user gesture on the Camera button triggers the browser permission prompt.
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user' } });
        const videoElement = document.createElement('video');
        videoElement.muted = true;
        videoElement.playsInline = true;
        videoElement.srcObject = stream;
        await videoElement.play();
        if (videoElement.readyState < 2) {
          await new Promise((resolve) => { videoElement.onloadeddata = resolve; });
        }
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth || 1280;
        canvas.height = videoElement.videoHeight || 720;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Your browser could not prepare the camera photo.');
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
        if (!blob) throw new Error('The browser could not capture a photo.');
        const file = new File([blob], `zannychat-camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setPhoto({ uri: URL.createObjectURL(file), file, mimeType: 'image/jpeg', fileName: file.name });
        setVideo(null);
        setPublishError('');
        setPublishSuccess('');
      } catch (cameraError) {
        setPublishError(cameraError?.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access in your browser site settings and try again.'
          : cameraError?.message || 'The browser camera could not be opened.');
      } finally {
        stream?.getTracks?.().forEach((track) => track.stop());
      }
      return;
    }
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setPublishError('Allow camera access to capture a status photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 });
      if (!result.canceled && result.assets?.[0]) {
        setPhoto(result.assets[0]);
        setVideo(null);
        setPublishError('');
        setPublishSuccess('');
      }
    } catch (pickerError) {
      setPublishError(pickerError?.message || 'The camera could not be opened. Please try again.');
    }
  };


  const publish = async () => {
    const normalized = normalizeStatusText(text);
    if (!normalized && !photo && !video) { setPublishError('Write a status or choose a photo or video before publishing.'); return; }
    setSaving(true); setPublishError(''); setPublishSuccess('');
    try {
      let audienceRecipientIds = [];
      if (audience === 'selected_contacts') {
        const [latestContacts, latestExclusions] = await Promise.all([listStatusContacts(), listStatusExclusions()]);
        audienceRecipientIds = resolveStatusPublishAudience(audience, selectedAudienceIds, latestContacts, latestExclusions);
      }
      const item = photo
        ? await publishPhotoStatus(photo, normalized, audience, audienceRecipientIds, expiryHours)
        : video
          ? await publishVideoStatus(video, normalized, audience, audienceRecipientIds, expiryHours)
          : await publishTextStatus(normalized, audience, audienceRecipientIds, expiryHours);
      setStatuses((old) => [item, ...old]); setText(''); setPhoto(null); setVideo(null);
      await clearStatusDraft(AsyncStorage); setStatusDraftSaved(false);
      setPublishSuccess(`Status published successfully. It expires in ${expiryHours} hours.`);
    } catch (e) {
      const message = e?.message || 'Please try again.';
      setPublishError(message);
      if (Platform.OS !== 'web') Alert.alert('Could not publish status', message);
    } finally { setSaving(false); }
  };

  const openStatus = useCallback(async (item) => {
    if (!isStatusActiveAt(item)) {
      setViewing(null);
      Alert.alert('Status expired', 'This status is no longer available. Refresh the status feed to see current updates.');
      return;
    }
    setViewing(item);
    setMediaLoadError(false);
    setRetryingMedia(false);
    if (item?.id) {
      if (['image', 'video'].includes(item.media_kind) && item.media_path && item.media_path !== 'pending') {
        refreshStatusMediaUrl(item.id).then((media_url) => {
          setViewing((current) => current?.id === item.id ? { ...current, media_url } : current);
        }).catch(() => {
          // Keep the feed's existing URL as a fallback when a transient refresh fails.
          console.warn('Status media URL refresh failed; retaining the existing URL if still valid');
        });
      }
      const next = markStatusSeen(seenStatusIdsRef.current, item.id);
      seenStatusIdsRef.current = next;
      setSeenStatusIds(next);
      AsyncStorage.setItem('zannychat.status-seen.v1', JSON.stringify(next)).catch(() => {});
    } setStatusPaused(false); setStatusProgress(0); setReplyText(''); setReplies([]); setRepliesHasMore(false); setReplyCursor(null); replyPageLockRef.current = false;
    if (!item.is_own) {
      try { await recordStatusView(item.id); }
      catch (e) { console.warn('Status view receipt could not be recorded'); }
    } else {
      try { const page = await listStatusReplies(item.id); setReplies(page.rows); setRepliesHasMore(page.hasMore); setReplyCursor(page.nextBefore); try { const names = await resolveStatusUserNames(page.rows.map((reply) => reply.sender_id)); setStatusUserNames((old) => ({ ...old, ...names })); } catch { /* Keep the ID fallback if profile lookup is unavailable. */ } }
      catch (e) { console.warn('Status replies could not be loaded'); }
    }
  }, []);

  useEffect(() => {
    const requestedUserId = route?.params?.userId;
    if (!requestedUserId) {
      requestedStoryOpenRef.current = null;
      return;
    }
    if (loading || requestedStoryOpenRef.current === requestedUserId) return;
    const group = groupedStatuses.find((item) => String(item.ownerId) === String(requestedUserId));
    if (!group) {
      navigation.setParams({ userId: undefined });
      return;
    }
    requestedStoryOpenRef.current = requestedUserId;
    const target = group.latest?.is_own
      ? group.latest
      : firstUnseenStatus(group.statuses, seenStatusIds, group.latest);
    if (target) openStatus(target);
    navigation.setParams({ userId: undefined });
  }, [route?.params?.userId, loading, groupedStatuses, seenStatusIds, openStatus, navigation]);

  const handleStatusVideoError = useCallback(() => setMediaLoadError(true), []);

  const retryStatusMedia = useCallback(async () => {
    const requestedStatusId = viewing?.id;
    // State updates render asynchronously; a ref prevents rapid taps from issuing
    // duplicate signed-URL refresh requests before the disabled state appears.
    if (!requestedStatusId || mediaRetryLockRef.current) return;
    mediaRetryLockRef.current = true;
    setRetryingMedia(true);
    try {
      const refreshed = normalizeStatusMediaUrl(await refreshStatusMediaUrl(requestedStatusId));
      if (!refreshed) throw new Error('The media link could not be refreshed.');
      setViewing((current) => current?.id === requestedStatusId ? { ...current, media_url: refreshed } : current);
      setMediaLoadError((current) => viewing?.id === requestedStatusId ? false : current);
    } catch (e) {
      // Do not show an old request's failure over a different status the user opened.
      if (viewing?.id === requestedStatusId) Alert.alert('Media unavailable', e?.message || 'Please check your connection and try again.');
    } finally {
      mediaRetryLockRef.current = false;
      setRetryingMedia(false);
    }
  }, [viewing?.id]);

  useEffect(() => {
    // Keep a failed or refreshing media item open so users have time to recover it.
    const mediaNeedsRecovery = ['image', 'video'].includes(viewing?.media_kind) && (!viewing?.media_url || mediaLoadError || retryingMedia);
    if (!viewing?.id || statusPaused || mediaNeedsRecovery) return undefined;
    const timer = setTimeout(() => {
      const adjacent = getAdjacentStoryStatus(statuses, viewing.id, 1);
      if (adjacent) openStatus(adjacent);
      else setViewing(null);
    }, getStatusDurationMs(viewing, statusDurations));
    return () => clearTimeout(timer);
  }, [viewing?.id, viewing?.media_kind, viewing?.media_url, statuses, openStatus, statusPaused, statusDurations, mediaLoadError, retryingMedia]);

  useEffect(() => {
    if (!viewing?.id) { setStatusProgress(0); return undefined; }
    const mediaNeedsRecovery = ['image', 'video'].includes(viewing?.media_kind) && (!viewing?.media_url || mediaLoadError || retryingMedia);
    if (statusPaused || mediaNeedsRecovery) return undefined;
    const duration = getStatusDurationMs(viewing, statusDurations);
    const startedAt = Date.now();
    setStatusProgress(0);
    const interval = setInterval(() => {
      setStatusProgress(getStatusProgressPercent(Date.now() - startedAt, duration));
    }, 100);
    return () => clearInterval(interval);
  }, [viewing?.id, viewing?.media_kind, viewing?.media_url, statusPaused, statusDurations, mediaLoadError, retryingMedia]);

  const markAllContactStatusesSeen = useCallback(() => {
    const contactStatuses = statuses.filter((item) => !item?.is_own);
    const next = markStatusesSeen(seenStatusIdsRef.current, contactStatuses);
    seenStatusIdsRef.current = next;
    setSeenStatusIds(next);
    AsyncStorage.setItem('zannychat.status-seen.v1', JSON.stringify(next)).catch(() => {
      Alert.alert('Read state not saved', 'Statuses are marked viewed for this session, but local storage was unavailable.');
    });
  }, [statuses]);

  const loadOlderReplies = async () => {
    if (!viewing?.id || !viewing.is_own || !repliesHasMore || !replyCursor || replyPageLockRef.current) return;
    replyPageLockRef.current = true;
    setLoadingOlderReplies(true);
    try {
      const page = await listStatusReplies(viewing.id, { before: replyCursor });
      setReplies((old) => [...page.rows, ...old]);
      setRepliesHasMore(page.hasMore);
      setReplyCursor(page.nextBefore);
      try { const names = await resolveStatusUserNames(page.rows.map((reply) => reply.sender_id)); setStatusUserNames((old) => ({ ...old, ...names })); } catch { /* Keep the ID fallback if profile lookup is unavailable. */ }
    } catch (e) { Alert.alert('Could not load older replies', e?.message || 'Please try again.'); }
    finally { replyPageLockRef.current = false; setLoadingOlderReplies(false); }
  };

  const submitReply = async () => {
    if (!viewing || viewing.is_own || !replyText.trim()) return;
    setSendingReply(true);
    try { await sendStatusReply(viewing.id, replyText); setReplyText(''); Alert.alert('Reply sent', 'Your reply was sent privately to the status owner.'); }
    catch (e) { Alert.alert('Could not send reply', e?.message || 'Please try again.'); }
    finally { setSendingReply(false); }
  };

  const toggleStatusReaction = async (statusId, emoji, currentReaction) => {
    if (!statusId || reactionLocksRef.current.has(statusId)) return;
    reactionLocksRef.current.add(statusId);
    setReactingStatusIds((old) => old.includes(statusId) ? old : [...old, statusId]);
    try {
      if (currentReaction) await removeStatusReaction(statusId);
      else await reactToStatus(statusId, emoji);
      const activeIds = statuses.filter((row) => isStatusActiveAt(row)).map((row) => row.id);
      setReactions(await listStatusReactions(activeIds));
    } catch (e) {
      Alert.alert('Could not react', e?.message || 'Please try again.');
    } finally {
      reactionLocksRef.current.delete(statusId);
      setReactingStatusIds((old) => old.filter((id) => id !== statusId));
    }
  };

  const muteOwner = (item) => Alert.alert('Mute this account’s statuses?', 'Their statuses will be hidden from your list until you unmute them. This does not block messages.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Mute statuses', onPress: async () => { try { await muteStatusUser(item.user_id); setMutedUsers((old) => old.some((row) => row.muted_user_id === item.user_id) ? old : [{ muted_user_id: item.user_id, created_at: new Date().toISOString() }, ...old]); setStatuses((old) => old.filter((row) => row.user_id !== item.user_id)); } catch (e) { Alert.alert('Could not mute statuses', e?.message || 'Please try again.'); } } },
  ]);

  const unmuteOwner = async (userId) => { try { await unmuteStatusUser(userId); setMutedUsers((old) => old.filter((row) => row.muted_user_id !== userId)); await refresh(); } catch (e) { Alert.alert('Could not unmute statuses', e?.message || 'Please try again.'); } };

  const loadPrivacyContacts = async () => {
    setPrivacyMode('exclude');
    setPrivacyLoadError('');
    setPrivacySearch('');
    setPrivacyModalOpen(true);
    setPrivacyBusy(true);
    try { const [contacts, excluded] = await Promise.all([listStatusContacts(), listStatusExclusions()]); setPrivacyContacts(contacts); setExcludedUsers(excluded); setPrivacyLoadError(''); }
    catch (e) { const failed = getPrivacyLoadFailureState('exclude', e); setPrivacyContacts(failed.contacts); setExcludedUsers(failed.exclusions); setPrivacyLoadError(failed.error); Alert.alert('Could not load privacy contacts', failed.error); }
    finally { setPrivacyBusy(false); }
  };

  const loadSelectedAudienceContacts = async () => {
    setPrivacyMode('select');
    setPrivacyLoadError('');
    setPrivacySearch('');
    setPrivacyModalOpen(true);
    setPrivacyBusy(true);
    try {
      const [contacts, exclusions] = await Promise.all([listStatusContacts(), listStatusExclusions()]);
      setPrivacyContacts(contacts);
      setExcludedUsers(exclusions);
      setPrivacyLoadError('');
      const allowedIds = new Set(filterEligibleStatusAudienceContacts(contacts, exclusions).map((contact) => contact.id));
      setSelectedAudienceIds((old) => old.filter((id) => allowedIds.has(id)));
    } catch (e) { const failed = getPrivacyLoadFailureState('select', e); setPrivacyContacts(failed.contacts); setExcludedUsers(failed.exclusions); setSelectedAudienceIds(failed.selectedAudienceIds); setPrivacyLoadError(failed.error); Alert.alert('Could not load contacts', failed.error); }
    finally { setPrivacyBusy(false); }
  };

  const toggleSelectedAudience = (contact) => {
    if (!contact?.id) return;
    setSelectedAudienceIds((old) => old.includes(contact.id) ? old.filter((id) => id !== contact.id) : [...old, contact.id]);
  };

  const toggleExcluded = async (contact) => {
    if (privacyBusy || privacyLoadError || !contact?.id) return;
    const currentlyExcluded = excludedUsers.some((row) => row.excluded_user_id === contact.id);
    setPrivacyBusy(true);
    try {
      await setStatusExcludedUser(contact.id, !currentlyExcluded);
      setExcludedUsers((old) => currentlyExcluded
        ? old.filter((row) => row.excluded_user_id !== contact.id)
        : [{ excluded_user_id: contact.id, created_at: new Date().toISOString() }, ...old]);
      if (!currentlyExcluded) setSelectedAudienceIds((old) => removeExcludedStatusAudienceIds(old, [contact.id]));
      await refresh();
    } catch (e) {
      Alert.alert('Could not update Story privacy', e?.message || 'Please try again.');
    } finally {
      setPrivacyBusy(false);
    }
  };

  const applyBulkExclusions = async (shouldExclude) => {
    if (privacyBusy || privacyLoadError) return;
    const visibleContacts = filterStatusContacts(privacyContacts, privacySearch);
    const changes = planStatusExclusionChanges(visibleContacts, excludedUsers, shouldExclude);
    if (!changes.length) { Alert.alert('Story privacy', shouldExclude ? 'All matching contacts are already excluded.' : 'No matching contacts are currently excluded.'); return; }
    setPrivacyBusy(true);
    let succeeded = 0;
    try {
      for (const contact of changes) {
        try { await setStatusExcludedUser(contact.id, shouldExclude); succeeded += 1; }
        catch (e) { console.warn('A bulk Story privacy update failed'); }
      }
      const latest = await listStatusExclusions();
      setExcludedUsers(latest);
      if (shouldExclude) setSelectedAudienceIds((old) => removeExcludedStatusAudienceIds(old, latest));
      await refresh();
      if (succeeded === changes.length) Alert.alert('Story privacy updated', `${succeeded} contact${succeeded === 1 ? '' : 's'} ${shouldExclude ? 'excluded' : 'allowed'}.`);
      else Alert.alert('Partially updated', `${succeeded} of ${changes.length} changes succeeded. Review the current list and try again for any remaining contacts.`);
    } catch (e) {
      Alert.alert('Could not finish bulk update', e?.message || 'Refresh the privacy list and try again.');
    } finally { setPrivacyBusy(false); }
  };

  const remove = (item) => Alert.alert('Delete status?', 'This removes your status immediately.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { try { await deleteStatus(item.id); setStatuses((old) => old.filter((s) => s.id !== item.id)); } catch (e) { Alert.alert('Could not delete status', e?.message || 'Please try again.'); } } },
  ]);

  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <Header title="Stories" subtitle="Share a moment with your people" onBack={() => navigation.goBack()} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl || spacing.xl }}>
      <View style={{ marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Friends</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>{friendStatusGroups.length} active</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingVertical: spacing.xs }}>
          <TouchableOpacity onPress={() => ownStatusGroup ? openStatus(ownStatusGroup.latest) : statusTextInputRef.current?.focus?.()} accessibilityRole="button" accessibilityLabel="Open or create your status" style={{ width: 72, alignItems: 'center', gap: 6 }}>
            <View style={{ width: 66, height: 66, borderRadius: 33, borderWidth: 2, borderColor: colors.primary, padding: 3, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: '100%', height: '100%', borderRadius: 30, backgroundColor: colors.surfaceElevated || colors.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {ownStatusGroup?.latest?.media_url && ownStatusGroup.latest.media_kind === 'image'
                  ? <Image source={{ uri: ownStatusGroup.latest.media_url }} style={{ width: '100%', height: '100%' }} />
                  : <Ionicons name="person-outline" size={25} color={colors.textSecondary} />}
              </View>
              <View style={{ position: 'absolute', right: -1, bottom: -1, width: 23, height: 23, borderRadius: 12, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="add" size={16} color={colors.background} />
              </View>
            </View>
            <Text numberOfLines={1} style={[typography.caption, { color: colors.textPrimary, fontWeight: '700' }]}>My status</Text>
          </TouchableOpacity>
          {friendStatusGroups.map((group) => {
            const item = group.latest;
            const name = statusUserNames[item.user_id] || 'Contact';
            const unread = unreadStatusCount(group.statuses, seenStatusIds, false) > 0;
            return (
              <TouchableOpacity key={group.ownerId} onPress={() => openStatus(firstUnseenStatus(group.statuses, seenStatusIds, item))} accessibilityRole="button" accessibilityLabel={'View ' + name + ' story'} style={{ width: 72, alignItems: 'center', gap: 6 }}>
                <View style={{ width: 66, height: 66, borderRadius: 33, borderWidth: 2.5, borderColor: unread ? colors.primary : colors.border, padding: 3 }}>
                  <View style={{ width: '100%', height: '100%', borderRadius: 30, backgroundColor: colors.surfaceElevated || colors.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {item.media_kind === 'image' && item.media_url
                      ? <Image source={{ uri: item.media_url }} style={{ width: '100%', height: '100%' }} />
                      : item.media_kind === 'video'
                        ? <Ionicons name="play" size={24} color={colors.primary} />
                        : <Text style={[typography.bodyStrong, { color: colors.primary }]}>{name.trim().charAt(0).toUpperCase() || '•'}</Text>}
                  </View>
                </View>
                <Text numberOfLines={1} style={[typography.caption, { color: colors.textPrimary, fontWeight: unread ? '800' : '500' }]}>{name.split(' ')[0]}</Text>
              </TouchableOpacity>
            );
          })}
          {!friendStatusGroups.length ? <View style={{ justifyContent: 'center', paddingHorizontal: spacing.sm }}><Text style={[typography.caption, { color: colors.textSecondary }]}>Your contacts’ stories will appear here.</Text></View> : null}
        </ScrollView>
      </View>
      <GlassCard style={{ marginBottom: spacing.md }} contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
        <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Create a story</Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{statusDraftSaved ? 'Draft saved on this device' : 'Text drafts save automatically on this device'} · selected media is not saved in drafts</Text>
        <TextInput ref={statusTextInputRef} value={text} onChangeText={(v) => setText(v.slice(0, STATUS_TEXT_LIMIT))} placeholder="What would you like to share?" placeholderTextColor={colors.textSecondary} multiline maxLength={STATUS_TEXT_LIMIT} accessibilityLabel="Status text" style={[typography.body, { color: colors.textPrimary, minHeight: 92, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md }]} />
        <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'right' }]}>{text.length}/{STATUS_TEXT_LIMIT}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
          <TouchableOpacity onPress={chooseCamera} accessibilityRole="button" accessibilityLabel="Take a status photo" style={{ flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.sm, minHeight: 42 }}>
            <Ionicons name="camera-outline" size={18} color={colors.primary} />
            <Text style={[typography.small, { color: colors.textPrimary }]}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={choosePhoto} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.sm, minHeight: 42 }}><Ionicons name="image-outline" size={18} color={colors.primary} /><Text style={[typography.small, { color: colors.textPrimary }]}>{photo ? 'Change photo' : 'Add photo'}</Text></TouchableOpacity>
          {photo || video ? <TouchableOpacity onPress={() => { setPhoto(null); setVideo(null); }} accessibilityRole="button"><Text style={[typography.small, { color: colors.textSecondary }]}>Remove media</Text></TouchableOpacity> : null}
          <TouchableOpacity onPress={chooseVideo} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.sm, minHeight: 42 }}><Ionicons name="videocam-outline" size={18} color={colors.primary} /><Text style={[typography.small, { color: colors.textPrimary }]}>{video ? 'Change video' : 'Add video'}</Text></TouchableOpacity>
        </View>
        {photo ? <Image source={{ uri: photo.uri }} accessibilityLabel="Selected status photo preview" style={{ width: '100%', height: 190, borderRadius: radii.md }} resizeMode="cover" /> : null}
        {video ? <View style={{ padding: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border }}><Ionicons name="videocam" size={24} color={colors.primary} /><Text style={[typography.small, { color: colors.textPrimary, marginTop: 5 }]}>{video.fileName || 'Video selected'} · maximum 30 seconds / 50 MB</Text></View> : null}
        {publishError ? <Text accessibilityRole="alert" style={[typography.caption, { color: '#D64545' }]}>{publishError}</Text> : null}
        {publishSuccess ? <Text accessibilityRole="status" style={[typography.caption, { color: colors.primary }]}>{publishSuccess}</Text> : null}
        <Text style={[typography.small, { color: colors.textSecondary }]}>Story lifetime</Text>
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: spacing.xs }}>
          {[6, 12, 24, 48].map((hours) => <TouchableOpacity key={hours} onPress={() => setExpiryHours(hours)} accessibilityRole="radio" accessibilityLabel={`Story expires after ${hours} hours`} accessibilityState={{ checked: expiryHours === hours }} style={{ flex: 1, minHeight: 42, borderRadius: radii.md, borderWidth: 1, borderColor: expiryHours === hours ? colors.primary : colors.border, backgroundColor: expiryHours === hours ? `${colors.primary}18` : colors.surface, alignItems: 'center', justifyContent: 'center' }}><Text style={[typography.small, { color: expiryHours === hours ? colors.primary : colors.textPrimary, fontWeight: expiryHours === hours ? '700' : '400' }]}>{hours}h</Text></TouchableOpacity>)}
        </View>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>Your status will disappear from active feeds after {expiryHours} hours. Expiry is stored with the status and enforced by active-status queries.</Text>
        <Text style={[typography.small, { color: colors.textSecondary }]}>Who can see it?</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {[{ value: 'contacts', label: 'My contacts', icon: 'people-outline' }, { value: 'selected_contacts', label: 'Selected', icon: 'people-circle-outline' }, { value: 'only_me', label: 'Only me', icon: 'lock-closed-outline' }].map((option) => <TouchableOpacity key={option.value} onPress={() => setAudience(option.value)} accessibilityRole="radio" accessibilityState={{ checked: audience === option.value }} style={{ flex: 1, minHeight: 44, borderRadius: radii.md, borderWidth: 1, borderColor: audience === option.value ? colors.primary : colors.border, backgroundColor: audience === option.value ? `${colors.primary}18` : colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs }}><Ionicons name={option.icon} size={16} color={audience === option.value ? colors.primary : colors.textSecondary} /><Text style={[typography.small, { color: colors.textPrimary, marginLeft: 6 }]}>{option.label}</Text></TouchableOpacity>)}
        </View>
        {audience === 'selected_contacts' ? <View style={{ gap: spacing.xs }}><Text style={[typography.caption, { color: colors.textSecondary }]}>{selectedAudienceIds.length} selected contact{selectedAudienceIds.length === 1 ? '' : 's'} can see this status. Other contacts will not be able to view it.</Text><TouchableOpacity onPress={loadSelectedAudienceContacts} disabled={privacyBusy} accessibilityRole="button" style={{ minHeight: 42, justifyContent: 'center' }}><Text style={[typography.small, { color: colors.primary }]}>{privacyBusy ? 'Loading contacts…' : 'Choose contacts or group members'}</Text></TouchableOpacity></View> : null}
        <TouchableOpacity onPress={publish} disabled={saving || (!text.trim() && !photo && !video) || (audience === 'selected_contacts' && selectedAudienceIds.length === 0)} accessibilityRole="button" style={{ minHeight: 48, borderRadius: radii.md, backgroundColor: saving || (!text.trim() && !photo && !video) || (audience === 'selected_contacts' && selectedAudienceIds.length === 0) ? colors.border : colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
          {saving ? <ActivityIndicator color={colors.onPrimary} /> : <Ionicons name="paper-plane-outline" size={17} color={colors.onPrimary} />}
          <Text style={[typography.bodyStrong, { color: colors.onPrimary }]}>{saving ? 'Publishing…' : 'Publish status'}</Text>
        </TouchableOpacity>
      </GlassCard>
      {discoverStatuses.length > 0 ? (
        <View style={{ marginBottom: spacing.lg }}>
          <View style={{ marginBottom: spacing.sm }}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Discover</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Fresh moments shared by your contacts</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {discoverStatuses.map((item) => {
              const name = statusUserNames[item.user_id] || 'Contact';
              return (
                <TouchableOpacity key={item.id} onPress={() => openStatus(item)} accessibilityRole="button" accessibilityLabel={'Open story from ' + name} style={{ width: 148, height: 196, borderRadius: radii.lg, overflow: 'hidden', backgroundColor: colors.surfaceElevated || colors.surface, borderWidth: 1, borderColor: colors.border }}>
                  {item.media_kind === 'image' && item.media_url
                    ? <Image source={{ uri: item.media_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171526' }}><Ionicons name="play-circle" size={42} color="#FFFFFF" /><Text style={{ color: '#FFFFFF', marginTop: 6 }}>Video story</Text></View>}
                  <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.sm, backgroundColor: '#00000088' }}>
                    <Text numberOfLines={1} style={[typography.small, { color: '#FFFFFF', fontWeight: '800' }]}>{name}</Text>
                    <Text style={[typography.caption, { color: '#FFFFFF' }]}>{ageLabel(item.created_at)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
      {mutedUsers.length ? <GlassCard style={{ marginBottom: spacing.md }} contentStyle={{ padding: spacing.md, gap: spacing.sm }}><Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Muted status accounts ({mutedUsers.length})</Text>{mutedUsers.map((entry) => <View key={entry.muted_user_id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}><Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>{statusUserNames[entry.muted_user_id] || `${String(entry.muted_user_id).slice(0, 8)}…`}</Text><TouchableOpacity onPress={() => unmuteOwner(entry.muted_user_id)} accessibilityRole="button"><Text style={[typography.small, { color: colors.primary }]}>Unmute</Text></TouchableOpacity></View>)}</GlassCard> : null}<GlassCard style={{ marginBottom: spacing.md }} contentStyle={{ padding: spacing.md, gap: spacing.sm }}><Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Story privacy</Text><Text style={[typography.caption, { color: colors.textSecondary }]}>Exclude specific conversation contacts from all your contact-visible statuses. This does not block messages.</Text><TouchableOpacity onPress={loadPrivacyContacts} disabled={privacyBusy} accessibilityRole="button" style={{ minHeight: 42, justifyContent: 'center' }}><Text style={[typography.small, { color: colors.primary }]}>{privacyBusy ? 'Loading contacts…' : 'Manage excluded contacts'}</Text></TouchableOpacity>{excludedUsers.map((entry) => <View key={entry.excluded_user_id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}><Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>{statusUserNames[entry.excluded_user_id] || `${String(entry.excluded_user_id).slice(0, 8)}…`}</Text><TouchableOpacity onPress={async () => { const contact = privacyContacts.find((item) => item.id === entry.excluded_user_id) || { id: entry.excluded_user_id }; await toggleExcluded(contact); }} accessibilityRole="button"><Text style={[typography.small, { color: colors.primary }]}>Allow</Text></TouchableOpacity></View>)}</GlassCard><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.sm }}><Text style={[typography.bodyStrong, { color: colors.textPrimary, flex: 1 }]}>Recent statuses</Text>{unreadStatusCount(statuses.filter((item) => !item?.is_own), seenStatusIds) > 0 ? <TouchableOpacity onPress={markAllContactStatusesSeen} accessibilityRole="button" accessibilityLabel="Mark all contact statuses as viewed" style={{ minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing.sm }}><Text style={[typography.small, { color: colors.primary }]}>Mark all viewed</Text></TouchableOpacity> : null}</View>
      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>Contact visibility is restricted by database policy to people who share a conversation with you; selected audiences are enforced by server-side recipient policies. Photo statuses are private and visible only to you or eligible conversation contacts. A view is recorded when you open a status; repeat views by the same account count once.</Text>
      {loading ? <View style={{ padding: spacing.xl, alignItems: 'center' }}><ActivityIndicator color={colors.primary} /></View> : error ? <View style={{ padding: spacing.md }}><Text style={[typography.body, { color: colors.textSecondary }]}>{error}</Text><TouchableOpacity onPress={refresh} style={{ paddingVertical: spacing.md }}><Text style={[typography.bodyStrong, { color: colors.primary }]}>Try again</Text></TouchableOpacity></View> : groupedStatuses.map((group) => { const item = group.latest; const openGroupStatus = () => openStatus(item.is_own ? item : firstUnseenStatus(group.statuses, seenStatusIds, item)); return <GlassCard key={group.ownerId} style={{ marginBottom: spacing.sm }} contentStyle={{ padding: spacing.md, gap: spacing.sm }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ flex: 1 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}><Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{item.is_own ? 'My status' : (statusUserNames[item.user_id] || `Contact ${String(item.user_id || '').slice(0, 8)}`)}</Text>{!item.is_own && unreadStatusCount(group.statuses, seenStatusIds, false) > 0 ? <View accessibilityLabel={`${unreadStatusCount(group.statuses, seenStatusIds, false)} new status updates`} style={{ backgroundColor: colors.primary, borderRadius: 10, minWidth: 20, height: 20, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.background, fontSize: 11, fontWeight: '700' }}>{unreadStatusCount(group.statuses, seenStatusIds, false)}</Text></View> : null}</View><Text style={[typography.caption, { color: colors.textSecondary }]}>{ageLabel(item.created_at)} · {group.statuses.length} update{group.statuses.length === 1 ? '' : 's'} · {item.audience === 'only_me' ? 'Only me' : item.audience === 'selected_contacts' ? 'Selected contacts' : 'My contacts'} · {unreadStatusCount(group.statuses, seenStatusIds, item.is_own) ? `${unreadStatusCount(group.statuses, seenStatusIds, item.is_own)} new` : 'Viewed'}</Text></View>{item.is_own ? <TouchableOpacity onPress={() => remove(item)} accessibilityRole="button" accessibilityLabel="Delete status" hitSlop={10}><Ionicons name="trash-outline" size={18} color={colors.textSecondary} /></TouchableOpacity> : null}{!item.is_own ? <TouchableOpacity onPress={() => muteOwner(item)} accessibilityRole="button" accessibilityLabel="Mute this account’s statuses" hitSlop={10}><Ionicons name="volume-mute-outline" size={18} color={colors.textSecondary} /></TouchableOpacity> : null}</View>{item.media_kind === 'video' && item.media_url ? <TouchableOpacity onPress={openGroupStatus} accessibilityRole="button" style={{ minHeight: 70, borderRadius: radii.md, backgroundColor: '#111111', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="play-circle" size={42} color="#FFFFFF" /><Text style={{ color: '#FFFFFF' }}>Video status</Text></TouchableOpacity> : null}{item.media_kind === 'image' && item.media_url ? <Image source={{ uri: item.media_url }} accessibilityLabel="Status photo" style={{ width: '100%', height: 220, borderRadius: radii.md }} resizeMode="cover" /> : null}{item.text ? <Text style={[typography.body, { color: colors.textPrimary }]}>{item.text}</Text> : null}{item.media_kind === 'image' && !item.media_url ? <Text style={[typography.caption, { color: colors.textSecondary }]}>Photo unavailable or access expired. Refresh to try again.</Text> : null}{item.is_own ? <Text style={[typography.caption, { color: colors.textSecondary }]}><Ionicons name="eye-outline" size={13} color={colors.textSecondary} /> {item.view_count || 0} {item.view_count === 1 ? 'view' : 'views'}</Text> : null}<TouchableOpacity onPress={openGroupStatus} accessibilityRole="button" style={{ minHeight: 38, justifyContent: 'center' }}><Text style={[typography.small, { color: colors.primary }]}>{item.is_own ? 'View status' : 'Open status'}</Text></TouchableOpacity><Text style={[typography.caption, { color: colors.textSecondary }]}>Latest update expires {new Date(item.expires_at).toLocaleString()}</Text></GlassCard>; })}
      {!loading && !error && statuses.length === 0 ? <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}><Ionicons name="aperture-outline" size={34} color={colors.textSecondary} /><Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>No active statuses yet. Publish a short update above.</Text></View> : null}
    </ScrollView>
    <Modal visible={privacyModalOpen} transparent animationType="slide" onRequestClose={() => setPrivacyModalOpen(false)}>
      <View style={{ flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' }}><View style={{ maxHeight: '75%', backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.md }}><View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}><Text style={[typography.bodyStrong, { color: colors.textPrimary, flex: 1 }]}>{privacyMode === 'select' ? 'Choose status audience' : 'Exclude contacts from statuses'}</Text><TouchableOpacity onPress={() => setPrivacyModalOpen(false)} accessibilityRole="button"><Ionicons name="close" size={24} color={colors.textPrimary} /></TouchableOpacity></View><Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>{privacyMode === 'select' ? 'Only selected contacts or group members can view this status. Contacts excluded by Story privacy cannot be selected; exclusions take precedence.' : 'Excluded people cannot read your contact-visible status media or text. Changes apply to existing active statuses too.'}</Text><TextInput value={privacySearch} onChangeText={setPrivacySearch} placeholder="Search contacts by name or ID" placeholderTextColor={colors.textSecondary} accessibilityLabel="Search status privacy contacts" returnKeyType="search" autoCapitalize="none" style={[typography.body, { color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.sm }]} /><Text accessibilityLiveRegion="polite" style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>{filterStatusContacts(privacyContacts, privacySearch).length} matching contact(s) · {privacyMode === 'select' ? `${removeExcludedStatusAudienceIds(selectedAudienceIds, excludedUsers).length} eligible selected · ${excludedUsers.length} excluded` : `${excludedUsers.length} excluded in total`}</Text>{privacyLoadError ? <View accessibilityRole="alert" style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.sm }}><Text style={[typography.body, { color: colors.textPrimary }]}>{privacyLoadError}</Text><TouchableOpacity onPress={privacyMode === 'select' ? loadSelectedAudienceContacts : loadPrivacyContacts} disabled={privacyBusy} accessibilityRole="button" accessibilityLabel="Retry loading status privacy contacts" style={{ minHeight: 42, justifyContent: 'center' }}><Text style={[typography.bodyStrong, { color: colors.primary }]}>{privacyBusy ? 'Retrying…' : 'Try again'}</Text></TouchableOpacity></View> : null}{privacyMode === 'exclude' ? <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}><TouchableOpacity disabled={privacyBusy || !!privacyLoadError || filterStatusContacts(privacyContacts, privacySearch).length === 0} onPress={() => applyBulkExclusions(true)} accessibilityRole="button" accessibilityLabel="Exclude all matching contacts" style={{ flex: 1, minHeight: 40, justifyContent: 'center', alignItems: 'center', borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, opacity: privacyBusy ? 0.5 : 1 }}><Text style={[typography.small, { color: colors.primary }]}>{privacyBusy ? 'Updating…' : 'Exclude matching'}</Text></TouchableOpacity><TouchableOpacity disabled={privacyBusy || !!privacyLoadError || !filterStatusContacts(privacyContacts, privacySearch).some((contact) => excludedUsers.some((row) => row.excluded_user_id === contact.id))} onPress={() => applyBulkExclusions(false)} accessibilityRole="button" accessibilityLabel="Allow all matching contacts" style={{ flex: 1, minHeight: 40, justifyContent: 'center', alignItems: 'center', borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, opacity: privacyBusy ? 0.5 : 1 }}><Text style={[typography.small, { color: colors.primary }]}>Allow matching</Text></TouchableOpacity></View> : <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}><TouchableOpacity disabled={privacyBusy || !!privacyLoadError || filterEligibleStatusAudienceContacts(filterStatusContacts(privacyContacts, privacySearch), excludedUsers).length === 0} onPress={() => setSelectedAudienceIds((old) => updateSelectedAudienceIds(old, filterEligibleStatusAudienceContacts(filterStatusContacts(privacyContacts, privacySearch), excludedUsers).map((contact) => contact.id), true))} accessibilityRole="button" accessibilityLabel="Select all matching status contacts" style={{ flex: 1, minHeight: 40, justifyContent: 'center', alignItems: 'center', borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, opacity: privacyBusy ? 0.5 : 1 }}><Text style={[typography.small, { color: colors.primary }]}>Select matching</Text></TouchableOpacity><TouchableOpacity disabled={privacyBusy || !!privacyLoadError || !filterStatusContacts(privacyContacts, privacySearch).some((contact) => selectedAudienceIds.includes(contact.id))} onPress={() => setSelectedAudienceIds((old) => updateSelectedAudienceIds(old, filterStatusContacts(privacyContacts, privacySearch).map((contact) => contact.id), false))} accessibilityRole="button" accessibilityLabel="Clear matching status contacts" style={{ flex: 1, minHeight: 40, justifyContent: 'center', alignItems: 'center', borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, opacity: privacyBusy ? 0.5 : 1 }}><Text style={[typography.small, { color: colors.primary }]}>Clear matching</Text></TouchableOpacity></View>}<ScrollView keyboardShouldPersistTaps="handled">{filterStatusContacts(privacyContacts, privacySearch).map((contact) => { const isExcluded = excludedUsers.some((row) => row.excluded_user_id === contact.id); const checked = privacyMode === 'select' ? selectedAudienceIds.includes(contact.id) : isExcluded; const disabled = privacyBusy || !!privacyLoadError || (privacyMode === 'select' && isExcluded); return <TouchableOpacity key={contact.id} disabled={disabled} onPress={() => privacyMode === 'select' ? toggleSelectedAudience(contact) : toggleExcluded(contact)} accessibilityRole="checkbox" accessibilityState={{ checked, disabled }} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, opacity: disabled ? 0.55 : 1 }}><Text style={[typography.body, { color: colors.textPrimary, flex: 1 }]}>{contact.name}{privacyMode === 'select' && isExcluded ? ' · excluded by Story privacy' : ''}</Text><Ionicons name={checked ? 'checkbox' : 'square-outline'} size={22} color={checked ? colors.primary : colors.textSecondary} /></TouchableOpacity>; })}{privacyLoadError ? null : privacyContacts.length === 0 ? <Text style={[typography.body, { color: colors.textSecondary }]}>No conversation contacts found.</Text> : filterStatusContacts(privacyContacts, privacySearch).length === 0 ? <Text style={[typography.body, { color: colors.textSecondary, paddingVertical: spacing.md }]}>No contacts match “{privacySearch.trim()}”.</Text> : null}</ScrollView>{privacyMode === 'select' ? <TouchableOpacity onPress={() => setPrivacyModalOpen(false)} accessibilityRole="button" style={{ minHeight: 46, marginTop: spacing.sm, borderRadius: radii.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={[typography.bodyStrong, { color: colors.background }]}>Done selecting</Text></TouchableOpacity> : null}</View></View>
    </Modal>
    <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
      <View style={{ flex: 1, backgroundColor: '#000000E8', justifyContent: 'center', padding: spacing.md }}>
        {viewing ? <View accessibilityRole="progressbar" accessibilityLabel="Status display progress" accessibilityValue={{ min: 0, max: 100, now: Math.round(statusProgress) }} style={{ height: 4, borderRadius: 3, overflow: 'hidden', backgroundColor: '#666666', marginBottom: spacing.sm }}><View style={{ width: `${statusProgress}%`, height: '100%', backgroundColor: '#FFFFFF' }} /></View> : null}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.sm }}>{(viewing?.media_kind === 'image' || viewing?.media_kind === 'video') && viewing?.media_url ? <TouchableOpacity onPress={() => saveStatusMedia(viewing.media_url, viewing.media_kind)} accessibilityRole="button" accessibilityLabel="Save status media to device" style={{ padding: spacing.md }}><Ionicons name="download-outline" size={24} color="#FFFFFF" /></TouchableOpacity> : null}<TouchableOpacity onPress={() => setStatusPaused((paused) => !paused)} accessibilityRole="button" accessibilityLabel={statusPaused ? 'Resume automatic status progression' : 'Pause automatic status progression'} accessibilityState={{ checked: statusPaused }} style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', padding: spacing.sm }}><Ionicons name={statusPaused ? 'play' : 'pause'} size={24} color="#FFFFFF" /></TouchableOpacity><TouchableOpacity onPress={() => { setViewing(null); setStatusPaused(false); }} accessibilityRole="button" accessibilityLabel="Close status viewer" style={{ padding: spacing.md }}><Ionicons name="close" size={28} color="#FFFFFF" /></TouchableOpacity></View>
        {viewing?.media_kind === 'video' && viewing?.media_url && !mediaLoadError ? <StatusVideo uri={viewing.media_url} paused={statusPaused} onError={handleStatusVideoError} /> : null}
        {viewing?.media_kind === 'image' && viewing?.media_url && !mediaLoadError ? <Image key={`${viewing.id}:${viewing.media_url}`} source={{ uri: viewing.media_url }} accessibilityLabel="Opened status photo" onError={handleStatusVideoError} resizeMode="contain" style={{ width: '100%', height: '65%' }} /> : null}
        {viewing && (mediaLoadError || ((viewing.media_kind === 'image' || viewing.media_kind === 'video') && !viewing.media_url)) ? <View accessibilityRole="alert" style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.lg }}><Ionicons name="cloud-offline-outline" size={32} color="#FFFFFF" /><Text style={{ color: '#FFFFFF', textAlign: 'center' }}>This media could not be loaded.</Text><TouchableOpacity onPress={retryStatusMedia} disabled={retryingMedia} accessibilityRole="button" accessibilityLabel="Retry loading status media" style={{ minHeight: 44, minWidth: 120, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#AAAAAA', borderRadius: radii.md, paddingHorizontal: spacing.md, opacity: retryingMedia ? 0.6 : 1 }}><Text style={{ color: '#FFFFFF' }}>{retryingMedia ? 'Retrying…' : 'Retry media'}</Text></TouchableOpacity></View> : null}
        {viewing && statusPaused ? <Text accessibilityLiveRegion="polite" style={[typography.caption, { color: '#FFFFFF', textAlign: 'center', marginTop: spacing.sm }]}>Automatic progression paused</Text> : null}
        {viewing ? <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, marginTop: spacing.sm }}><TouchableOpacity onPress={() => changeStatusDuration(viewing.media_kind === 'image' ? 'image' : viewing.media_kind === 'video' ? 'video' : 'text', -STATUS_DURATION_STEP_MS)} disabled={getStatusDurationMs(viewing, statusDurations) <= 5000} accessibilityRole="button" accessibilityLabel="Decrease this Status display duration by five seconds" accessibilityState={{ disabled: getStatusDurationMs(viewing, statusDurations) <= 5000 }} style={{ minWidth: 44, minHeight: 40, borderWidth: 1, borderColor: '#777777', borderRadius: 12, justifyContent: 'center', alignItems: 'center', opacity: getStatusDurationMs(viewing, statusDurations) <= 5000 ? 0.4 : 1 }}><Ionicons name="remove" size={20} color="#FFFFFF" /></TouchableOpacity><Text accessibilityLiveRegion="polite" style={{ color: '#FFFFFF', minWidth: 100, textAlign: 'center' }}>{Math.round(getStatusDurationMs(viewing, statusDurations) / 1000)}s per status</Text><TouchableOpacity onPress={() => changeStatusDuration(viewing.media_kind === 'image' ? 'image' : viewing.media_kind === 'video' ? 'video' : 'text', STATUS_DURATION_STEP_MS)} disabled={getStatusDurationMs(viewing, statusDurations) >= 60000} accessibilityRole="button" accessibilityLabel="Increase this Status display duration by five seconds" accessibilityState={{ disabled: getStatusDurationMs(viewing, statusDurations) >= 60000 }} style={{ minWidth: 44, minHeight: 40, borderWidth: 1, borderColor: '#777777', borderRadius: 12, justifyContent: 'center', alignItems: 'center', opacity: getStatusDurationMs(viewing, statusDurations) >= 60000 ? 0.4 : 1 }}><Ionicons name="add" size={20} color="#FFFFFF" /></TouchableOpacity></View> : null}
        {viewing?.text ? <Text style={[typography.body, { color: '#FFFFFF', textAlign: 'center', marginTop: spacing.md }]}>{viewing.text}</Text> : null}
        {viewing ? <View accessibilityLabel="Status navigation" style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, marginTop: spacing.md }}><TouchableOpacity onPress={() => { const adjacent = getAdjacentStoryStatus(statuses, viewing.id, -1); if (adjacent) openStatus(adjacent); }} disabled={!getAdjacentStoryStatus(statuses, viewing.id, -1)} accessibilityRole="button" accessibilityLabel="Previous status" accessibilityState={{ disabled: !getAdjacentStoryStatus(statuses, viewing.id, -1) }} style={{ flex: 1, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: radii.md, borderWidth: 1, borderColor: '#777777', opacity: getAdjacentStoryStatus(statuses, viewing.id, -1) ? 1 : 0.4 }}><Text style={{ color: '#FFFFFF' }}>‹ Previous</Text></TouchableOpacity><TouchableOpacity onPress={() => { const adjacent = getAdjacentStoryStatus(statuses, viewing.id, 1); if (adjacent) openStatus(adjacent); }} disabled={!getAdjacentStoryStatus(statuses, viewing.id, 1)} accessibilityRole="button" accessibilityLabel="Next status" accessibilityState={{ disabled: !getAdjacentStoryStatus(statuses, viewing.id, 1) }} style={{ flex: 1, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: radii.md, borderWidth: 1, borderColor: '#777777', opacity: getAdjacentStoryStatus(statuses, viewing.id, 1) ? 1 : 0.4 }}><Text style={{ color: '#FFFFFF' }}>Next ›</Text></TouchableOpacity></View> : null}
        {viewing && !viewing.is_own ? <View accessibilityLabel="Status reactions" style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 10, marginTop: spacing.lg }}>{STATUS_REACTIONS.map((emoji) => { const mine = reactions[viewing.id]?.mine === emoji; const count = reactions[viewing.id]?.counts?.[emoji] || 0; const busy = reactingStatusIds.includes(viewing.id); return <TouchableOpacity key={emoji} disabled={busy} accessibilityRole="button" accessibilityState={{ selected: mine, disabled: busy }} accessibilityLabel={`React ${emoji}${count ? `, ${count} reactions` : ''}${mine ? ', selected' : ''}`} onPress={() => toggleStatusReaction(viewing.id, emoji, mine)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: mine ? '#FFFFFF' : '#777777', backgroundColor: mine ? '#FFFFFF22' : 'transparent', opacity: busy ? 0.5 : 1 }}><Text style={{ color: '#FFFFFF', fontSize: 18 }}>{emoji}{count ? ` ${count}` : ''}</Text></TouchableOpacity>; })}</View> : null}
        {viewing && !viewing.is_own ? <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.lg }}><TextInput value={replyText} onChangeText={(v) => setReplyText(v.slice(0, 1000))} placeholder="Reply privately…" placeholderTextColor="#BBBBBB" accessibilityLabel="Private status reply" multiline style={{ flex: 1, color: '#FFFFFF', borderWidth: 1, borderColor: '#777777', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, maxHeight: 90 }} /><TouchableOpacity onPress={submitReply} disabled={sendingReply || !replyText.trim()} accessibilityRole="button" accessibilityLabel="Send status reply" style={{ alignSelf: 'flex-end', padding: 12, opacity: sendingReply || !replyText.trim() ? 0.45 : 1 }}><Ionicons name="send" size={20} color="#FFFFFF" /></TouchableOpacity></View> : null}
        {viewing?.is_own && (replies.length || repliesHasMore) ? <ScrollView style={{ maxHeight: 190, marginTop: spacing.md }}><Text style={{ color: '#FFFFFF', fontWeight: '600', marginBottom: 6 }}>Private replies · {replies.length}{repliesHasMore ? '+' : ''}</Text>{repliesHasMore ? <TouchableOpacity onPress={loadOlderReplies} disabled={loadingOlderReplies} accessibilityRole="button" accessibilityLabel="Load older private status replies" accessibilityState={{ disabled: loadingOlderReplies }} style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#777777', borderRadius: 12, marginBottom: 6, opacity: loadingOlderReplies ? 0.5 : 1 }}><Text style={{ color: '#FFFFFF' }}>{loadingOlderReplies ? 'Loading older replies…' : 'Load older replies'}</Text></TouchableOpacity> : null}{replies.map((reply) => <View key={reply.id} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#555555' }}><Text style={{ color: '#FFFFFF' }}>{reply.body}</Text><Text style={{ color: '#BBBBBB', fontSize: 11, marginTop: 3 }}>{statusUserNames[reply.sender_id] || String(reply.sender_id).slice(0, 8)} · {new Date(reply.created_at).toLocaleString()}</Text></View>)}</ScrollView> : null}
        <Text style={[typography.caption, { color: '#FFFFFF', textAlign: 'center', marginTop: spacing.md }]}>{viewing ? ageLabel(viewing.created_at) : ''} · expires {viewing ? new Date(viewing.expires_at).toLocaleString() : ''}</Text>
      </View>
    </Modal>
  </SafeAreaView>;
}
