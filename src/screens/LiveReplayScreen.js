import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { backendFetch } from '../services/backendClient';
import { useTheme } from '../theme/ThemeContext';

export default function LiveReplayScreen({ route, navigation }) {
  const { colors, typography, resolvedMode } = useTheme();
  const replay = route.params?.replay;
  const replayId = replay?.id || route.params?.replayId;
  const [playbackUrl, setPlaybackUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const player = useVideoPlayer(null, (instance) => {
    instance.loop = false;
    instance.muted = false;
  });

  useEffect(() => {
    let active = true;
    const loadPlayback = async () => {
      if (!replayId) {
        setError('This replay is unavailable.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const result = await backendFetch(`/live/replays/${replayId}/playback`);
        if (!active) return;
        if (!result?.url) throw new Error('The replay link could not be created.');
        await player.replaceAsync({ uri: result.url });
        if (!active) return;
        setPlaybackUrl(result.url);
        player.play();
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
  }, [replayId, attempt, player]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={resolvedMode === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back from LIVE replay" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <Ionicons name="arrow-back" size={21} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={[typography.bodyStrong, { color: colors.textPrimary }]}>{replay?.streamTitle || 'LIVE replay'}</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>Private replay · available for seven days</Text>
        </View>
        <TouchableOpacity onPress={() => setAttempt((value) => value + 1)} accessibilityRole="button" accessibilityLabel="Refresh LIVE replay link" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <Ionicons name="refresh-outline" size={20} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 12 }}>
        {playbackUrl && !error ? (
          <VideoView
            player={player}
            style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 20, overflow: 'hidden', backgroundColor: '#08080C' }}
            nativeControls
            contentFit="contain"
          />
        ) : (
          <View style={{ alignItems: 'center', justifyContent: 'center', padding: 28, minHeight: 220, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            {loading ? <ActivityIndicator size="large" color={colors.accent} /> : <Ionicons name="play-circle-outline" size={42} color={colors.accent} />}
            {!!error && <Text accessibilityRole="alert" style={[typography.body, { color: colors.textPrimary, textAlign: 'center', marginTop: 14 }]}>{error}</Text>}
            {!loading && <TouchableOpacity onPress={() => setAttempt((value) => value + 1)} accessibilityRole="button" style={{ marginTop: 16, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 14, backgroundColor: colors.primary }}>
              <Text style={[typography.bodyStrong, { color: colors.onPrimary }]}>Try again</Text>
            </TouchableOpacity>}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
