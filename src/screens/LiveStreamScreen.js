import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, SafeAreaView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AudioSession, LiveKitRoom, VideoTrack, isTrackReference, useTracks } from '@livekit/react-native';
import { Track } from 'livekit-client';
import { backendFetch } from '../services/backendClient';

function LiveMedia({ creatorMode, title, comments, draft, setDraft, onComment, onReact, onReport, onHide, onEnd, busy }) {
  const tracks = useTracks([Track.Source.Camera]);
  const videos = tracks.filter(isTrackReference);
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, backgroundColor: '#100F18' }}>
        <View style={{ position: 'absolute', zIndex: 2, top: 10, left: 14, right: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ backgroundColor: '#D83A59', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12 }}><Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '900' }}>● LIVE</Text></View>
          <Text numberOfLines={1} style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800', flex: 1, marginHorizontal: 12 }}>{title}</Text>
          <TouchableOpacity onPress={onEnd} accessibilityRole="button" accessibilityLabel={creatorMode ? 'End LIVE stream' : 'Leave LIVE stream'} style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 12 }}><Ionicons name="close" size={20} color="#FFFFFF" /></TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          {videos.length ? (
            <FlatList data={videos} keyExtractor={(item) => item.participant.identity} renderItem={({ item }) => <VideoTrack trackRef={item} style={{ height: 340, margin: 4, borderRadius: 18 }} />} />
          ) : (
            <View style={{ alignItems: 'center', padding: 24 }}><Ionicons name="videocam-outline" size={44} color="#B6AFFF" /><Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginTop: 14 }}>{creatorMode ? 'Your LIVE is starting' : 'Waiting for the creator video'}</Text><Text style={{ color: '#AAA7BD', textAlign: 'center', marginTop: 8 }}>Keep this screen open while you are live.</Text></View>
          )}
        </View>
        <View style={{ maxHeight: 230, paddingHorizontal: 14 }}>
          <FlatList data={comments} keyExtractor={(item) => item.id} renderItem={({ item }) => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 }}>
              <Text style={{ color: '#B6AFFF', fontSize: 11, fontWeight: '900' }}>{String(item.user_id).slice(0, 7)}</Text>
              <Text style={{ color: '#FFFFFF', flex: 1, fontSize: 13 }}>{item.body}</Text>
              {creatorMode && <TouchableOpacity onPress={() => onHide(item.id)} accessibilityRole="button" accessibilityLabel="Hide LIVE comment"><Ionicons name="eye-off-outline" color="#D6D2E5" size={17} /></TouchableOpacity>}
            </View>
          )} ListEmptyComponent={<Text style={{ color: '#AAA7BD', paddingVertical: 8 }}>Be the first to say hello.</Text>} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, paddingBottom: 18 }}>
          <TextInput value={draft} onChangeText={(v) => setDraft(v.slice(0, 500))} maxLength={500} placeholder="Say something kind…" placeholderTextColor="#AAA7BD" style={{ flex: 1, backgroundColor: '#262436', color: '#FFFFFF', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11 }} />
          <TouchableOpacity disabled={busy || !draft.trim()} onPress={onComment} accessibilityRole="button" accessibilityLabel="Send LIVE comment" style={{ backgroundColor: '#6557D9', padding: 12, borderRadius: 14 }}><Ionicons name="send" size={19} color="#FFFFFF" /></TouchableOpacity>
          <TouchableOpacity disabled={busy} onPress={onReact} accessibilityRole="button" accessibilityLabel="Send heart reaction" style={{ backgroundColor: '#3A293D', padding: 12, borderRadius: 14 }}><Ionicons name="heart" size={20} color="#FF6B89" /></TouchableOpacity>
          {!creatorMode && <TouchableOpacity disabled={busy} onPress={onReport} accessibilityRole="button" accessibilityLabel="Report LIVE stream" style={{ backgroundColor: '#262436', padding: 12, borderRadius: 14 }}><Ionicons name="flag-outline" size={19} color="#FFFFFF" /></TouchableOpacity>}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function LiveStreamScreen({ route, navigation }) {
  const connection = route.params?.connection;
  const creatorMode = Boolean(route.params?.creatorMode || connection?.role === 'creator');
  const stream = connection?.stream;
  const [comments, setComments] = useState([]);
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

  if (!connection || !stream) return <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#100F18' }}><Text style={{ color: '#FFFFFF' }}>This LIVE room is unavailable.</Text></SafeAreaView>;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#100F18' }}>
      <StatusBar barStyle="light-content" />
      {error ? <Text style={{ color: '#FFB6C3', paddingHorizontal: 12, paddingTop: 4 }}>{error}</Text> : null}
      <LiveKitRoom serverUrl={connection.livekitUrl} token={connection.token} connect={true} audio={creatorMode} video={creatorMode} options={{ adaptiveStream: true, dynacast: true }}>
        <LiveMedia creatorMode={creatorMode} title={stream.title} comments={comments} draft={draft} setDraft={setDraft} onComment={sendComment} onReact={react} onReport={report} onHide={hideComment} onEnd={leave} busy={busy} />
      </LiveKitRoom>
      {busy && <View style={{ position: 'absolute', top: '50%', alignSelf: 'center' }}><ActivityIndicator color="#FFFFFF" /></View>}
    </SafeAreaView>
  );
}
