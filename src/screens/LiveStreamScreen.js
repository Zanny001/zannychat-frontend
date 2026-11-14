import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, KeyboardAvoidingView, Platform, SafeAreaView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AudioSession, LiveKitRoom, VideoTrack, isTrackReference, useTracks } from '@livekit/react-native';
import { Track } from 'livekit-client';
import { backendFetch } from '../services/backendClient';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../utils/color';

const LIVE_REACTION_EMOJI = Object.freeze({ heart: '❤️', clap: '👏', laugh: '😂', wow: '😮', fire: '🔥' });

function FloatingReaction({ item, index, onComplete }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.timing(progress, { toValue: 1, duration: 1800, useNativeDriver: true });
    animation.start(({ finished }) => { if (finished) onComplete(item.id); });
    return () => animation.stop();
  }, [item.id, onComplete, progress]);
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -210] });
  const opacity = progress.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] });
  const scale = progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.65, 1.2, 1] });
  return (
    <Animated.Text pointerEvents="none" style={{ position: 'absolute', bottom: 26, left: (15 + (index * 17) % 70) + '%', opacity, transform: [{ translateY }, { scale }], fontSize: 32 }}>
      {LIVE_REACTION_EMOJI[item.reaction] || LIVE_REACTION_EMOJI.heart}
    </Animated.Text>
  );
}

function LiveMedia({ creatorMode, publisherMode, cameraEnabled, microphoneEnabled, onToggleCamera, onToggleMicrophone, moderatorMode, canManageGuests, canRequestGuest, guestApproved, guestRequestStatus, guestRequests, showGuestRequests, title, comments, reports, showReports, participants, showParticipants, draft, setDraft, onComment, onReact, floatingReactions, onRemoveFloatingReaction, onReport, onHide, onEnd, onToggleReports, onReviewReport, onToggleParticipants, onSetModerator, onRequestGuest, onJoinGuest, onToggleGuestRequests, onReviewGuestRequest, busy }) {
  const { colors, typography } = useTheme();
  const tracks = useTracks([Track.Source.Camera]);
  const audioTracks = useTracks([Track.Source.Microphone]);
  const videos = tracks.filter(isTrackReference);
  const videoIdentities = new Set(videos.map((track) => track.participant.identity));
  const audioOnlyParticipants = audioTracks.filter(isTrackReference)
    .filter((track) => !track.participant.isLocal && !videoIdentities.has(track.participant.identity));
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, backgroundColor: '#100F18' }}>
        <View style={{ position: 'absolute', zIndex: 2, top: 10, left: 14, right: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ backgroundColor: colors.danger, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12 }}><Text style={[typography.small, { color: colors.onDanger }]}>● LIVE</Text></View>
          <Text numberOfLines={1} style={[typography.bodyStrong, { color: '#FFFFFF', flex: 1, minWidth: 0, marginHorizontal: 12 }]}>{title}</Text>
          {creatorMode && <TouchableOpacity onPress={onToggleParticipants} accessibilityRole="button" accessibilityLabel="Manage LIVE moderators" style={{ backgroundColor: hexToRgba(colors.surface, 0.82), borderWidth: 1, borderColor: colors.border, padding: 8, borderRadius: 12, marginRight: 8 }}><Ionicons name="people-outline" size={19} color={colors.textPrimary} /></TouchableOpacity>}
          {creatorMode && canManageGuests && <TouchableOpacity onPress={onToggleGuestRequests} accessibilityRole="button" accessibilityLabel="Review guest requests" style={{ backgroundColor: hexToRgba(colors.surface, 0.82), borderWidth: 1, borderColor: colors.border, padding: 8, borderRadius: 12, marginRight: 8 }}><Ionicons name="person-add-outline" size={19} color={colors.textPrimary} /></TouchableOpacity>}
          {moderatorMode && <TouchableOpacity onPress={onToggleReports} accessibilityRole="button" accessibilityLabel="Open LIVE safety reports" style={{ backgroundColor: hexToRgba(colors.surface, 0.82), borderWidth: 1, borderColor: colors.border, padding: 8, borderRadius: 12, marginRight: 8 }}><Ionicons name="shield-checkmark-outline" size={19} color={colors.textPrimary} /></TouchableOpacity>}
          <TouchableOpacity onPress={onEnd} accessibilityRole="button" accessibilityLabel={creatorMode ? 'End LIVE stream' : 'Leave LIVE stream'} style={{ backgroundColor: hexToRgba(colors.surface, 0.82), borderWidth: 1, borderColor: colors.border, padding: 8, borderRadius: 12 }}><Ionicons name="close" size={20} color={colors.textPrimary} /></TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', position: 'relative' }}>
          {videos.length ? (
            <FlatList
              key={videos.length === 1 ? 'live-stage-single' : 'live-stage-grid'}
              keyboardShouldPersistTaps="handled"
              data={videos}
              numColumns={videos.length === 1 ? 1 : 2}
              keyExtractor={(item) => item.participant.identity}
              renderItem={({ item }) => (
                <View style={{ flex: 1, minWidth: 0, margin: 4, borderRadius: 18, overflow: 'hidden', backgroundColor: '#211F2B' }}>
                  <VideoTrack trackRef={item} style={{ height: videos.length === 1 ? 340 : 220, borderRadius: 18 }} />
                  <View style={{ position: 'absolute', left: 10, bottom: 10, maxWidth: '85%', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.62)' }}>
                    <Text numberOfLines={1} style={[typography.caption, { color: '#FFFFFF' }]}>{item.participant.name || item.participant.identity}</Text>
                  </View>
                </View>
              )}
            />
          ) : (
            <View style={{ alignItems: 'center', padding: 24 }}>
              {audioOnlyParticipants.length > 0
                ? <Ionicons name="mic" size={44} color={colors.accent} />
                : <Ionicons name="videocam-outline" size={44} color={colors.accent} />}
              <Text style={[typography.heading, { color: '#FFFFFF', marginTop: 14 }]}>
                {audioOnlyParticipants.length > 0 ? 'LIVE audio is on' : creatorMode ? 'Your LIVE is starting' : 'Waiting for the creator video'}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: 8 }]}>
                {audioOnlyParticipants.length > 0 ? 'The stage is continuing with microphones while cameras are off.' : 'Keep this screen open while you are live.'}
              </Text>
              {audioOnlyParticipants.map((track) => (
                <View key={track.participant.identity} style={{ marginTop: 10, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14, backgroundColor: hexToRgba(colors.surface, 0.88), borderWidth: 1, borderColor: colors.border }}>
                  <Text style={[typography.small, { color: '#FFFFFF' }]}>{track.participant.name || track.participant.identity} · Audio only</Text>
                </View>
              ))}
            </View>
          )}
          {videos.length > 0 && audioOnlyParticipants.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingVertical: 8 }}>
              {audioOnlyParticipants.map((track) => (
                <View key={track.participant.identity} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: hexToRgba(colors.surface, 0.88), borderWidth: 1, borderColor: colors.border }}>
                  <Text style={[typography.caption, { color: '#FFFFFF' }]}>{track.participant.name || track.participant.identity} · Audio only</Text>
                </View>
              ))}
            </View>
          )}
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            {floatingReactions.map((item, index) => (
              <FloatingReaction key={item.id} item={item} index={index} onComplete={onRemoveFloatingReaction} />
            ))}
          </View>
        </View>
        {publisherMode && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 8 }}>
            <TouchableOpacity onPress={onToggleCamera} accessibilityRole="button" accessibilityLabel={cameraEnabled ? 'Turn camera off and keep audio live' : 'Turn camera on'} style={{ minHeight: 44, minWidth: 132, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12, borderRadius: 14, backgroundColor: cameraEnabled ? hexToRgba(colors.accent, 0.2) : hexToRgba(colors.surface, 0.9), borderWidth: 1, borderColor: colors.border }}>
              <Ionicons name={cameraEnabled ? 'videocam' : 'videocam-off'} size={18} color={colors.textPrimary} />
              <Text style={[typography.small, { color: colors.textPrimary }]}>{cameraEnabled ? 'Camera on' : 'Camera off'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onToggleMicrophone} accessibilityRole="button" accessibilityLabel={microphoneEnabled ? 'Mute microphone' : 'Unmute microphone'} style={{ minHeight: 44, minWidth: 132, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12, borderRadius: 14, backgroundColor: microphoneEnabled ? hexToRgba(colors.accent, 0.2) : hexToRgba(colors.danger, 0.16), borderWidth: 1, borderColor: colors.border }}>
              <Ionicons name={microphoneEnabled ? 'mic' : 'mic-off'} size={18} color={colors.textPrimary} />
              <Text style={[typography.small, { color: colors.textPrimary }]}>{microphoneEnabled ? 'Mic on' : 'Mic muted'}</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ maxHeight: 230, paddingHorizontal: 14 }}>
          <FlatList keyboardShouldPersistTaps="handled" data={comments} keyExtractor={(item) => item.id} renderItem={({ item }) => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 }}>
              <Text numberOfLines={1} style={[typography.small, { color: colors.accent, flexShrink: 1, maxWidth: '38%' }]}>{item.user_name || 'ZannyChat user'}</Text>
              <Text style={[typography.caption, { color: '#FFFFFF', flex: 1, minWidth: 0 }]}>{item.body}</Text>
              {moderatorMode && <TouchableOpacity onPress={() => onHide(item.id)} accessibilityRole="button" accessibilityLabel="Hide LIVE comment"><Ionicons name="eye-off-outline" color={colors.textSecondary} size={17} /></TouchableOpacity>}
            </View>
          )} ListEmptyComponent={<Text style={{ color: colors.textSecondary, paddingVertical: 8 }}>Be the first to say hello.</Text>} />
        </View>
        {showParticipants && creatorMode && (
          <View style={{ maxHeight: 190, marginHorizontal: 14, marginBottom: 8, padding: 10, borderRadius: 14, backgroundColor: hexToRgba(colors.surface, 0.94), borderWidth: 1, borderColor: colors.border }}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginBottom: 6 }]}>Manage LIVE moderators</Text>
            <FlatList keyboardShouldPersistTaps="handled" data={participants} keyExtractor={(item) => item.userId} renderItem={({ item }) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Text numberOfLines={1} style={[typography.small, { color: colors.textPrimary, flex: 1 }]}>{item.name}{!item.joined ? ' · offline' : ''}</Text>
                {(item.moderator || item.joined) && <TouchableOpacity onPress={() => onSetModerator(item.userId, !item.moderator)} accessibilityRole="button" accessibilityLabel={item.moderator ? `Remove ${item.name} as LIVE moderator` : `Make ${item.name} a LIVE moderator`}>
                  <Text style={{ color: item.moderator ? colors.danger : colors.accent, fontWeight: '800', fontSize: 11 }}>{item.moderator ? 'Remove moderator' : 'Make moderator'}</Text>
                </TouchableOpacity>}
              </View>
            )} ListEmptyComponent={<Text style={[typography.caption, { color: colors.textSecondary }]}>No viewers are currently connected.</Text>} />
          </View>
        )}
        {showGuestRequests && creatorMode && (
          <View style={{ maxHeight: 190, marginHorizontal: 14, marginBottom: 8, padding: 10, borderRadius: 14, backgroundColor: hexToRgba(colors.surface, 0.94), borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.textPrimary, fontWeight: '900', marginBottom: 6 }}>Guest requests ({guestRequests.length})</Text>
            <FlatList keyboardShouldPersistTaps="handled" data={guestRequests} keyExtractor={(item) => item.user_id} renderItem={({ item }) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Text numberOfLines={1} style={{ color: colors.textPrimary, flex: 1, fontSize: 12 }}>{item.name}</Text>
                <TouchableOpacity onPress={() => onReviewGuestRequest(item.user_id, 'accepted')} accessibilityRole="button" accessibilityLabel={`Approve LIVE guest request from ${item.name}`}><Text style={{ color: colors.success, fontWeight: '800', fontSize: 11, marginRight: 10 }}>Approve</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => onReviewGuestRequest(item.user_id, 'declined')} accessibilityRole="button" accessibilityLabel={`Decline LIVE guest request from ${item.name}`}><Text style={{ color: colors.danger, fontWeight: '800', fontSize: 11 }}>Decline</Text></TouchableOpacity>
              </View>
            )} ListEmptyComponent={<Text style={{ color: colors.textSecondary, fontSize: 12 }}>No pending guest requests.</Text>} />
          </View>
        )}
        {showReports && moderatorMode && (
          <View style={{ maxHeight: 190, marginHorizontal: 14, marginBottom: 8, padding: 10, borderRadius: 14, backgroundColor: hexToRgba(colors.surface, 0.94), borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.textPrimary, fontWeight: '900', marginBottom: 6 }}>LIVE safety reports ({reports.length})</Text>
            <FlatList keyboardShouldPersistTaps="handled" data={reports} keyExtractor={(item) => item.id} renderItem={({ item }) => (
              <View style={{ paddingVertical: 7, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{item.reason} · {item.status}</Text>
                {!!item.details && <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>{item.details}</Text>}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                  {item.status === 'open' && <TouchableOpacity onPress={() => onReviewReport(item.id, 'reviewing')} accessibilityRole="button" accessibilityLabel={`Review ${item.reason} LIVE report`}><Text style={{ color: colors.accent, fontWeight: '800', fontSize: 11 }}>Review</Text></TouchableOpacity>}
                  {['open','reviewing'].includes(item.status) && <TouchableOpacity onPress={() => onReviewReport(item.id, 'resolved')} accessibilityRole="button" accessibilityLabel={`Resolve ${item.reason} LIVE report`}><Text style={{ color: colors.success, fontWeight: '800', fontSize: 11 }}>Resolve</Text></TouchableOpacity>}
                  {['open','reviewing'].includes(item.status) && <TouchableOpacity onPress={() => onReviewReport(item.id, 'dismissed')} accessibilityRole="button" accessibilityLabel={`Dismiss ${item.reason} LIVE report`}><Text style={{ color: colors.danger, fontWeight: '800', fontSize: 11 }}>Dismiss</Text></TouchableOpacity>}
                </View>
              </View>
            )} ListEmptyComponent={<Text style={{ color: colors.textSecondary, fontSize: 12 }}>No reports have been submitted.</Text>} />
          </View>
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9, paddingHorizontal: 12, paddingTop: 6 }}>
          {Object.entries(LIVE_REACTION_EMOJI).map(([reaction, emoji]) => (
            <TouchableOpacity key={reaction} disabled={busy} onPress={() => onReact(reaction)} accessibilityRole="button" accessibilityLabel={'Send ' + reaction + ' reaction'} style={{ minWidth: 42, minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: hexToRgba(colors.surface, 0.78), borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, borderRadius: 13 }}>
              <Text style={{ fontSize: 20 }}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, paddingBottom: 18 }}>
          <TextInput value={draft} onChangeText={(v) => setDraft(v.slice(0, 500))} maxLength={500} placeholder="Say something kind…" placeholderTextColor={colors.textSecondary} style={{ flex: 1, minWidth: 0, backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11 }} />
          <TouchableOpacity disabled={busy || !draft.trim()} onPress={onComment} accessibilityRole="button" accessibilityLabel="Send LIVE comment" style={{ backgroundColor: colors.primary, padding: 12, borderRadius: 14 }}><Ionicons name="send" size={19} color={colors.onPrimary} /></TouchableOpacity>

          {!creatorMode && canRequestGuest && <TouchableOpacity disabled={busy || (guestRequestStatus === 'requested' && !guestApproved)} onPress={guestApproved ? onJoinGuest : onRequestGuest} accessibilityRole="button" accessibilityLabel={guestApproved ? 'Join LIVE as guest' : guestRequestStatus === 'requested' ? 'Guest request pending' : 'Request to join LIVE on stage'} style={{ backgroundColor: hexToRgba(colors.primary, 0.24), padding: 12, borderRadius: 14 }}><Ionicons name={guestApproved ? 'checkmark-circle-outline' : 'person-add-outline'} size={19} color={colors.onPrimary} /></TouchableOpacity>}
          {!creatorMode && <TouchableOpacity disabled={busy} onPress={onReport} accessibilityRole="button" accessibilityLabel="Report LIVE stream" style={{ backgroundColor: colors.surfaceAlt, padding: 12, borderRadius: 14 }}><Ionicons name="flag-outline" size={19} color={colors.textPrimary} /></TouchableOpacity>}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function LiveStreamScreen({ route, navigation }) {
  const { colors } = useTheme();
  const connection = route.params?.connection;
  const creatorMode = Boolean(route.params?.creatorMode || connection?.role === 'creator');
  const moderatorMode = Boolean(creatorMode || connection?.canModerate);
  const stream = connection?.stream;
  const publisherMode = Boolean(creatorMode || connection?.role === 'guest');
  const canRequestGuest = Boolean(!publisherMode && stream?.allow_guests);
  const [comments, setComments] = useState([]);
  const [reports, setReports] = useState([]);
  const [showReports, setShowReports] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const [guestRequests, setGuestRequests] = useState([]);
  const [showGuestRequests, setShowGuestRequests] = useState(false);
  const [guestApproved, setGuestApproved] = useState(false);
  const [guestRequestStatus, setGuestRequestStatus] = useState('none');
  const [floatingReactions, setFloatingReactions] = useState([]);
  const seenReactionIds = useRef(new Set());
  const [cameraEnabled, setCameraEnabled] = useState(publisherMode);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(publisherMode);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endedRef = useRef(false);

  useEffect(() => {
    if (publisherMode) {
      setCameraEnabled(true);
      setMicrophoneEnabled(true);
    }
  }, [publisherMode]);

  const toggleCamera = () => setCameraEnabled((value) => !value);
  const toggleMicrophone = () => setMicrophoneEnabled((value) => !value);

  const refreshComments = useCallback(async () => {
    if (!stream?.id) return;
    try {
      const result = await backendFetch(`/live/${stream.id}/comments`);
      setComments(Array.isArray(result?.comments) ? result.comments : []);
      const incomingReactions = (Array.isArray(result?.reactions) ? result.reactions : [])
        .filter((item) => item?.id && !seenReactionIds.current.has(item.id));
      incomingReactions.forEach((item) => {
        seenReactionIds.current.add(item.id);
        if (seenReactionIds.current.size > 500) {
          seenReactionIds.current.delete(seenReactionIds.current.values().next().value);
        }
      });
      if (incomingReactions.length) {
        setFloatingReactions((current) => [...current, ...incomingReactions].slice(-16));
      }
    } catch (e) {
      if (!endedRef.current) setError(e?.message || 'LIVE comments are unavailable.');
    }
  }, [stream?.id]);

  useEffect(() => {
    AudioSession.startAudioSession().catch(() => {});
    refreshComments();
    const interval = setInterval(refreshComments, 4000);
    return () => {
      clearInterval(interval);
      AudioSession.stopAudioSession();
      if (stream?.id && !endedRef.current) {
        backendFetch(`/live/${stream.id}/${creatorMode ? 'end' : 'leave'}`, { method: 'POST' }).catch(() => {});
      }
    };
  }, [stream?.id, creatorMode, refreshComments]);

  useEffect(() => {
    if (!stream?.id || creatorMode || publisherMode || !stream.allow_guests) return undefined;
    let active = true;
    const checkApproval = async () => {
      try {
        const result = await backendFetch(`/live/${stream.id}/guest-status`);
        if (active) { setGuestRequestStatus(result?.status || 'none'); setGuestApproved(result?.status === 'accepted'); }
      } catch (_) {}
    };
    checkApproval();
    const interval = setInterval(checkApproval, 15000);
    return () => { active = false; clearInterval(interval); };
  }, [stream?.id, creatorMode, publisherMode, stream?.allow_guests]);

  const leave = async () => {
    if (!stream?.id || endedRef.current) return;
    endedRef.current = true;
    setBusy(true);
    try {
      await backendFetch(`/live/${stream.id}/${creatorMode ? 'end' : 'leave'}`, { method: 'POST' });
    } catch (_) {}
    setBusy(false);
    navigation.goBack();
  };

  const sendComment = async () => {
    if (!draft.trim() || !stream?.id) return;
    setBusy(true);
    try {
      const result = await backendFetch(`/live/${stream.id}/comment`, { method: 'POST', body: JSON.stringify({ body: draft.trim() }) });
      setComments((current) => [...current, result.comment].slice(-50));
      setDraft('');
    } catch (e) {
      Alert.alert('Comment not sent', e?.message || 'Please try again.');
    } finally { setBusy(false); }
  };

  const react = async (reaction = 'heart') => {
    try { await backendFetch(`/live/${stream.id}/react`, { method: 'POST', body: JSON.stringify({ reaction }) }); }
    catch (e) { Alert.alert('Reaction not sent', e?.message || 'Please try again.'); }
  };
  const removeFloatingReaction = useCallback((reactionId) => {
    setFloatingReactions((current) => current.filter((item) => item.id !== reactionId));
  }, []);

  const report = () => Alert.alert('Report LIVE stream', 'Choose a reason for reporting this stream.', [
    { text: 'Harassment', onPress: () => submitReport('harassment') },
    { text: 'Hate or violence', onPress: () => submitReport('hate') },
    { text: 'Spam', onPress: () => submitReport('spam') },
    { text: 'Other', onPress: () => submitReport('other') },
    { text: 'Cancel', style: 'cancel' },
  ]);
  const submitReport = async (reason) => {
    try {
      await backendFetch(`/live/${stream.id}/report`, { method: 'POST', body: JSON.stringify({ reason }) });
      Alert.alert('Report submitted', 'Thanks for helping keep ZannyChat safe.');
    } catch (e) { Alert.alert('Report not sent', e?.message || 'Please try again.'); }
  };
  const hideComment = async (commentId) => {
    try {
      await backendFetch(`/live/${stream.id}/comments/${commentId}/hide`, { method: 'POST' });
      setComments((current) => current.filter((item) => item.id !== commentId));
    } catch (e) { Alert.alert('Could not hide comment', e?.message || 'Please try again.'); }
  };

  const loadReports = async () => {
    try {
      const result = await backendFetch(`/live/${stream.id}/reports`);
      setReports(Array.isArray(result?.reports) ? result.reports : []);
      setShowReports(true);
    } catch (e) { Alert.alert('Reports unavailable', e?.message || 'Please try again.'); }
  };

  const reviewReport = async (reportId, status) => {
    try {
      const result = await backendFetch(`/live/${stream.id}/reports/${reportId}`, {
        method: 'PATCH', body: JSON.stringify({ status }),
      });
      setReports((current) => current.map((item) => item.id === reportId ? { ...item, ...result.report } : item));
    } catch (e) { Alert.alert('Could not update report', e?.message || 'Please try again.'); }
  };

  const loadParticipants = async () => {
    try {
      const result = await backendFetch(`/live/${stream.id}/participants`);
      setParticipants(Array.isArray(result?.participants) ? result.participants : []);
      setShowParticipants(true);
    } catch (e) { Alert.alert('Participants unavailable', e?.message || 'Please try again.'); }
  };

  const loadGuestRequests = async () => {
    try {
      const result = await backendFetch(`/live/${stream.id}/guest-requests`);
      setGuestRequests(Array.isArray(result?.requests) ? result.requests : []);
      setShowGuestRequests(true);
    } catch (e) { Alert.alert('Guest requests unavailable', e?.message || 'Please try again.'); }
  };

  const requestGuest = async () => {
    try {
      await backendFetch(`/live/${stream.id}/guest-requests`, { method: 'POST' });
      setGuestRequestStatus('requested');
      Alert.alert('Request sent', 'The creator will decide whether to bring you on stage.');
    } catch (e) { Alert.alert('Could not request guest access', e?.message || 'Please try again.'); }
  };

  const joinAsGuest = async () => {
    try {
      const nextConnection = await backendFetch(`/live/${stream.id}/join`, { method: 'POST' });
      if (nextConnection?.role !== 'guest' || !nextConnection?.canPublish) {
        throw new Error('Guest access has not been approved yet.');
      }
      navigation.setParams({ connection: nextConnection, creatorMode: false });
      setGuestApproved(false);
      setGuestRequestStatus('accepted');
    } catch (e) { Alert.alert('Could not join as guest', e?.message || 'Please try again.'); }
  };

  const reviewGuestRequest = async (userId, status) => {
    try {
      await backendFetch(`/live/${stream.id}/guest-requests/${userId}`, {
        method: 'PATCH', body: JSON.stringify({ status }),
      });
      setGuestRequests((current) => current.filter((item) => item.user_id !== userId));
    } catch (e) { Alert.alert('Could not update guest request', e?.message || 'Please try again.'); }
  };

  const setModerator = async (userId, makeModerator) => {
    try {
      await backendFetch(`/live/${stream.id}/moderators${makeModerator ? '' : `/${userId}`}`, {
        method: makeModerator ? 'POST' : 'DELETE',
        ...(makeModerator ? { body: JSON.stringify({ userId }) } : {}),
      });
      setParticipants((current) => current.flatMap((item) => item.userId === userId
        ? (makeModerator || item.joined ? [{ ...item, moderator: makeModerator }] : [])
        : [item]));
    } catch (e) { Alert.alert('Could not update moderator', e?.message || 'Please try again.'); }
  };

  if (!connection || !stream) return <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}><Text style={{ color: colors.textPrimary }}>This LIVE room is unavailable.</Text></SafeAreaView>;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#100F18' }}>
      <StatusBar barStyle="light-content" />
      {error ? <Text accessibilityRole="alert" style={{ color: colors.danger, paddingHorizontal: 12, paddingTop: 4 }}>{error}</Text> : null}
      <LiveKitRoom key={connection.token} serverUrl={connection.livekitUrl} token={connection.token} connect={true} audio={publisherMode && microphoneEnabled} video={publisherMode && cameraEnabled} options={{ adaptiveStream: true, dynacast: true }}>
        <LiveMedia creatorMode={creatorMode} publisherMode={publisherMode} cameraEnabled={cameraEnabled} microphoneEnabled={microphoneEnabled} onToggleCamera={toggleCamera} onToggleMicrophone={toggleMicrophone} moderatorMode={moderatorMode} canManageGuests={Boolean(stream.allow_guests)} canRequestGuest={canRequestGuest} guestRequests={guestRequests} showGuestRequests={showGuestRequests} title={stream.title} comments={comments} reports={reports} showReports={showReports} participants={participants} showParticipants={showParticipants} draft={draft} setDraft={setDraft} onComment={sendComment} onReact={react} floatingReactions={floatingReactions} onRemoveFloatingReaction={removeFloatingReaction} onReport={report} onHide={hideComment} onEnd={leave} onRequestGuest={requestGuest} guestApproved={guestApproved} guestRequestStatus={guestRequestStatus} onJoinGuest={joinAsGuest} onToggleGuestRequests={() => { setShowReports(false); setShowParticipants(false); showGuestRequests ? setShowGuestRequests(false) : loadGuestRequests(); }} onReviewGuestRequest={reviewGuestRequest} onToggleReports={() => { setShowParticipants(false); setShowGuestRequests(false); showReports ? setShowReports(false) : loadReports(); }} onReviewReport={reviewReport} onToggleParticipants={() => { setShowReports(false); setShowGuestRequests(false); showParticipants ? setShowParticipants(false) : loadParticipants(); }} onSetModerator={setModerator} busy={busy} />
      </LiveKitRoom>
      {busy && <View style={{ position: 'absolute', top: '50%', alignSelf: 'center' }}><ActivityIndicator color={colors.accent} /></View>}
    </SafeAreaView>
  );
}
