import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, SafeAreaView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { backendFetch } from '../services/backendClient';
import { getCurrentUser } from '../services/api';
import { supabase, SUPABASE_ENABLED } from '../services/supabaseClient';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../utils/color';
import { confirmAction, showAppAlert } from '../utils/appDialogs';

export default function LiveReplayScreen({ route, navigation }) {
  const { colors, typography, resolvedMode } = useTheme();
  const replay = route.params?.replay;
  const replayId = replay?.id || route.params?.replayId;
  const [playbackUrl, setPlaybackUrl] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const currentUserIdRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const player = useVideoPlayer(null, (instance) => {
    instance.loop = false;
    instance.muted = false;
  });

  useEffect(() => {
    if (SUPABASE_ENABLED && supabase?.auth?.onAuthStateChange) {
      // Supabase emits INITIAL_SESSION through this same listener, making it
      // the single source of truth for both initial identity and later changes.
      // Avoid racing a separate getCurrentUser request against a SIGNED_IN event.
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        const nextUserId = session?.user?.id || null;
        if (currentUserIdRef.current === nextUserId) return;
        currentUserIdRef.current = nextUserId;
        // Stop and hide any previous account's signed playback URL immediately.
        player.pause();
        setPlaybackUrl(null);
        setError(nextUserId ? '' : 'Sign in to access this LIVE replay.');
        setLoading(Boolean(nextUserId));
        setCurrentUserId(nextUserId);
      });
      return () => data?.subscription?.unsubscribe?.();
    }

    // Mock mode has no Supabase auth event source.
    let active = true;
    getCurrentUser().then((user) => {
      if (!active) return;
      const userId = user?.id || null;
      currentUserIdRef.current = userId;
      setCurrentUserId(userId);
    }).catch(() => {
      if (!active) return;
      currentUserIdRef.current = null;
      setCurrentUserId(null);
    });
    return () => { active = false; };
  }, [player]);

  useEffect(() => {
    let active = true;
    const loadPlayback = async () => {
      if (!currentUserId) {
        setPlaybackUrl(null);
        setError('Sign in to access this LIVE replay.');
        setLoading(false);
        return;
      }
      if (!replayId) {
        setError('This replay is unavailable.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setPlaybackUrl(null);
      player.pause();
      setError('');
      try {
        const result = await backendFetch(`/live/replays/${replayId}/playback`);
        if (!active) return;
        if (!result?.url) throw new Error('The replay link could not be created.');
        await player.replaceAsync({ uri: result.url });
        if (!active) return;
        setPlaybackUrl(result.url);
        if (Platform.OS !== 'web') player.play();
      } catch (e) {
        if (active) {
          setPlaybackUrl(null);
          setError(e?.message || 'The replay could not be loaded.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    loadPlayback();
    return () => {
      active = false;
      player.pause();
    };
  }, [replayId, attempt, player, currentUserId]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={resolvedMode === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back from LIVE replay" style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <Ionicons name="arrow-back" size={21} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '900', letterSpacing: 1.2 }]}>ZANNYCHAT · LIVE ARCHIVE</Text>
          <Text numberOfLines={1} style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 16, marginTop: 2 }]}>{replay?.streamTitle || 'LIVE replay'}</Text>
        </View>
        {replay?.creatorId && replay.creatorId === currentUserId ? (
          <TouchableOpacity onPress={async () => {
            const confirmed = await confirmAction({ title: 'Delete LIVE replay?', message: 'This permanently deletes the saved video.', confirmText: 'Delete' });
            if (!confirmed) return;
            try {
              await backendFetch('/live/replays/' + encodeURIComponent(replayId), { method: 'DELETE' });
              navigation.goBack();
            } catch (e) {
              showAppAlert('Could not delete replay', e?.message || 'Please try again.');
            }
          }} accessibilityRole="button" accessibilityLabel="Delete this LIVE replay" style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.danger + '55' }}>
            <Ionicons name="trash-outline" size={19} color={colors.danger} />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity onPress={() => setAttempt((value) => value + 1)} accessibilityRole="button" accessibilityLabel="Refresh LIVE replay link" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <Ionicons name="refresh-outline" size={20} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 22, gap: 18 }}>
        {playbackUrl && !error ? (
          <VideoView
            player={player}
            style={{ width: '100%', maxWidth: 720, maxHeight: 405, alignSelf: 'center', aspectRatio: 16 / 9, borderRadius: 20, overflow: 'hidden', backgroundColor: '#08080C' }}
            nativeControls
            contentFit="contain"
          />
        ) : (
          <View style={{ width: '100%', maxWidth: 560, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', padding: 30, minHeight: 250, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: hexToRgba(colors.primary, 0.25), gap: 4 }}>
            {loading ? <ActivityIndicator size="large" color={colors.accent} /> : <Ionicons name="play-circle-outline" size={52} color={colors.accent} />}
            <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginTop: 8 }]}>{loading ? 'Preparing your replay' : 'Replay unavailable'}</Text>
            {!!error && <Text accessibilityRole="alert" style={[typography.body, { color: colors.textPrimary, textAlign: 'center', marginTop: 14 }]}>{error}</Text>}
            {!loading && <TouchableOpacity onPress={() => setAttempt((value) => value + 1)} accessibilityRole="button" accessibilityLabel="Retry LIVE replay playback" style={{ minHeight: 48, marginTop: 16, paddingHorizontal: 18, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.primary }}>
              <Text style={[typography.bodyStrong, { color: colors.onPrimary }]}>Try again</Text>
            </TouchableOpacity>}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
