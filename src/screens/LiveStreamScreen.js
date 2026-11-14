import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, SafeAreaView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AudioSession, LiveKitRoom, VideoTrack, isTrackReference, useLocalParticipant, useTracks } from '@livekit/react-native';
import { Track } from 'livekit-client';
import { backendFetch } from '../services/backendClient';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../utils/color';

function LiveMedia({ creatorMode, publisherMode, moderatorMode, canManageGuests, canRequestGuest, guestApproved, guestRequestStatus, guestRequests, showGuestRequests, title, comments, reports, showReports, participants, showParticipants, draft, setDraft, onComment, onReact, onReport, onHide, onEnd, onToggleReports, onReviewReport, onToggleParticipants, onSetModerator, onRequestGuest, onJoinGuest, onToggleGuestRequests, onReviewGuestRequest, busy }) {
  const { colors, typography } = useTheme();
  const tracks = useTracks([Track.Source.Camera]);
  const videos = tracks.filter(isTrackReference);
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled } = useLocalParticipant();
  const [mediaBusy, setMediaBusy] = useState(false);

  const toggleCamera = async () => {
    if (!publisherMode || mediaBusy) return;
    setMediaBusy(true);
    try {
      await localParticipant.setCameraEnabled(!isCameraEnabled);
    } catch (e) {
      Alert.alert('Camera unavailable', e?.message || 'Could not change your camera setting.');
    } finally {
      setMediaBusy(false);
    }
  };

  const toggleMicrophone = async () => {
    if (!publisherMode || mediaBusy) return;
    setMediaBusy(true);
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch (e) {
      Alert.alert('Microphone unavailable', e?.message || 'Could not change your microphone setting.');
    } finally {
      setMediaBusy(false);
    }
  };
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
        <View style={{ flex: 1, justifyContent: 'center' }}>
          {videos.length ? (
            <FlatList
              keyboardShouldPersistTaps="handled"
              key={videos.length > 1 ? 'live-stage-grid' : 'live-stage-single'}
              data={videos}
              numColumns={videos.length > 1 ? 2 : 1}
              keyExtractor={(item) => item.publication?.trackSid || item.participant.sid || item.participant.identity}
              contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 54, paddingBottom: 8 }}
              renderItem={({ item }) => (
                <View style={{ flex: 1, minWidth: 0, padding: 4 }}>
                  <VideoTrack trackRef={item} style={{ height: videos.length > 1 ? 220 : 360, borderRadius: 18 }} />
                  <Text numberOfLines={1} style={[typography.caption, { color: '#FFFFFF', marginTop: 4, textAlign: 'center' }]}>
                    {item.participant.name || item.participant.identity}
                  </Text>
                </View>
              )}
            />
          ) : (
            <View style={{ alignItems: 'center', padding: 24 }}><Ionicons name="videocam-outline" size={44} color={colors.accent} /><Text style={[typography.heading, { color: '#FFFFFF', marginTop: 14 }]}>{creatorMode ? 'Your LIVE is starting' : 'Waiting for the creator video'}</Text><Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: 8 }]}>Keep this screen open while you are live.</Text></View>
          )}
        </View>
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
        {publisherMode && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingTop: 8 }}>
          {publisherMode && <TouchableOpacity disabled={busy || mediaBusy} onPress={toggleMicrophone} accessibilityRole="button" accessibilityLabel={isMicrophoneEnabled ? 'Mute microphone' : 'Unmute microphone'} style={{ backgroundColor: isMicrophoneEnabled ? colors.surfaceAlt : hexToRgba(colors.danger, 0.2), padding: 12, borderRadius: 14 }}><Ionicons name={isMicrophoneEnabled ? 'mic' : 'mic-off'} size={19} color={isMicrophoneEnabled ? colors.textPrimary : colors.danger} /></TouchableOpacity>}
          {publisherMode && <TouchableOpacity disabled={busy || mediaBusy} onPress={toggleCamera} accessibilityRole="button" accessibilityLabel={isCameraEnabled ? 'Turn camera off and keep audio on' : 'Turn camera on'} style={{ backgroundColor: isCameraEnabled ? colors.surfaceAlt : hexToRgba(colors.danger, 0.2), padding: 12, borderRadius: 14 }}><Ionicons name={isCameraEnabled ? 'videocam' : 'videocam-off'} size={19} color={isCameraEnabled ? colors.textPrimary : colors.danger} /></TouchableOpacity>}
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, paddingBottom: 18 }}>
          <TextInput value={draft} onChangeText={(v) => setDraft(v.slice(0, 500))} maxLength={500} placeholder="Say something kind…" placeholderTextColor={colors.textSecondary} style={{ flex: 1, minWidth: 0, backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11 }} />
          <TouchableOpacity disabled={busy || !draft.trim()} onPress={onComment} accessibilityRole="button" accessibilityLabel="Send LIVE comment" style={{ backgroundColor: colors.primary, padding: 12, borderRadius: 14 }}><Ionicons name="send" size={19} color={colors.onPrimary} /></TouchableOpacity>
          <TouchableOpacity disabled={busy} onPress={onReact} accessibilityRole="button" accessibilityLabel="Send heart reaction" style={{ backgroundColor: hexToRgba(colors.danger, 0.16), padding: 12, borderRadius: 14 }}><Ionicons name="heart" size={20} color={colors.danger} /></TouchableOpacity>
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
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endedRef = useRef(false);

  const refreshComments = useCallback(async () => {
    if (!stream?.id) return;
    try {
      const result = await backendFetch(`/live/${stream.id}/comments`);
      setComments(Array.isArray(result?.comments) ? result.comments : []);
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

  const react = async () => {
    try { await backendFetch(`/live/${stream.id}/react`, { method: 'POST', body: JSON.stringify({ reaction: 'heart' }) }); }
    catch (e) { Alert.alert('Reaction not sent', e?.message || 'Please try again.'); }
  };

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
      <LiveKitRoom key={connection.token} serverUrl={connection.livekitUrl} token={connection.token} connect={true} audio={publisherMode} video={publisherMode} options={{ adaptiveStream: true, dynacast: true }}>
        <LiveMedia creatorMode={creatorMode} publisherMode={publisherMode} moderatorMode={moderatorMode} canManageGuests={Boolean(stream.allow_guests)} canRequestGuest={canRequestGuest} guestRequests={guestRequests} showGuestRequests={showGuestRequests} title={stream.title} comments={comments} reports={reports} showReports={showReports} participants={participants} showParticipants={showParticipants} draft={draft} setDraft={setDraft} onComment={sendComment} onReact={react} onReport={report} onHide={hideComment} onEnd={leave} onRequestGuest={requestGuest} guestApproved={guestApproved} guestRequestStatus={guestRequestStatus} onJoinGuest={joinAsGuest} onToggleGuestRequests={() => { setShowReports(false); setShowParticipants(false); showGuestRequests ? setShowGuestRequests(false) : loadGuestRequests(); }} onReviewGuestRequest={reviewGuestRequest} onToggleReports={() => { setShowParticipants(false); setShowGuestRequests(false); showReports ? setShowReports(false) : loadReports(); }} onReviewReport={reviewReport} onToggleParticipants={() => { setShowReports(false); setShowGuestRequests(false); showParticipants ? setShowParticipants(false) : loadParticipants(); }} onSetModerator={setModerator} busy={busy} />
      </LiveKitRoom>
      {busy && <View style={{ position: 'absolute', top: '50%', alignSelf: 'center' }}><ActivityIndicator color={colors.accent} /></View>}
    </SafeAreaView>
  );
}
