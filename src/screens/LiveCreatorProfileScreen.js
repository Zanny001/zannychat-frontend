import React, { useCallback, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { backendFetch } from '../services/backendClient';
import { useTheme } from '../theme/ThemeContext';
import GlassCard from '../components/GlassCard';
import Avatar from '../components/Avatar';

function Metric({ icon, label, value, colors, typography }) {
  return (
    <GlassCard contentStyle={{ padding: 14, gap: 8, minHeight: 106 }}>
      <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={[typography.heading, { color: colors.textPrimary, fontSize: 22 }]}>{Number(value || 0).toLocaleString()}</Text>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
    </GlassCard>
  );
}

export default function LiveCreatorProfileScreen({ navigation }) {
  const { colors, spacing, radii, typography } = useTheme();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await backendFetch('/live/creators/me/profile');
      setSummary(result || null);
      setError('');
    } catch (e) {
      setError(e?.message || 'Your LIVE creator profile is temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const profile = summary?.profile || {};
  const impact = summary?.impact || {};
  const streams = summary?.streams || {};
  const replays = summary?.replays || {};

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl || 32, gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back to LIVE hub" style={{ width: 42, height: 42, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '900', letterSpacing: 1.2 }]}>ZANNYCHAT LIVE</Text>
            <Text style={[typography.heading, { color: colors.textPrimary, fontSize: 25 }]}>Creator profile</Text>
          </View>
          <TouchableOpacity onPress={refresh} accessibilityRole="button" accessibilityLabel="Refresh creator profile" style={{ width: 42, height: 42, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="refresh" size={19} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {loading && !summary ? <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={colors.primary} /><Text style={[typography.caption, { color: colors.textSecondary, marginTop: 10 }]}>Loading your creator studio…</Text></View> : null}
        {!!error ? <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}><Text style={[typography.body, { color: colors.danger }]}>{error}</Text><TouchableOpacity onPress={refresh} accessibilityRole="button"><Text style={[typography.bodyStrong, { color: colors.primary }]}>Try again</Text></TouchableOpacity></GlassCard> : null}

        <GlassCard glow contentStyle={{ padding: spacing.lg, gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Avatar name={profile.name || 'LIVE Creator'} color={profile.avatar_color || colors.primary} size={76} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={2} style={[typography.heading, { color: colors.textPrimary, fontSize: 23 }]}>{profile.name || 'Your LIVE identity'}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>Your creator identity is separate from your main ZannyChat profile</Text>
              <View style={{ alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: colors.primary + '20' }}>
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '900' }]}>LIVE CREATOR</Text>
              </View>
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]}>A dedicated home for your broadcasts, community impact, audience growth and replay library. Your personal profile settings remain unchanged.</Text>
          <TouchableOpacity onPress={() => navigation.navigate('LIVE')} accessibilityRole="button" style={{ minHeight: 46, borderRadius: radii.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[typography.bodyStrong, { color: colors.onPrimary }]}>Open LIVE Hub</Text>
          </TouchableOpacity>
        </GlassCard>

        <View style={{ gap: spacing.xs }}>
          <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 17 }]}>Creator impact</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Your community's reactions and daily support score</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <View style={{ width: '48%', flexGrow: 1 }}><Metric icon="sparkles" label="Impact score" value={impact.impact_score} colors={colors} typography={typography} /></View>
            <View style={{ width: '48%', flexGrow: 1 }}><Metric icon="heart" label="Total reactions" value={impact.total_reactions} colors={colors} typography={typography} /></View>
            <View style={{ width: '48%', flexGrow: 1 }}><Metric icon="people" label="Unique supporters" value={impact.unique_supporters} colors={colors} typography={typography} /></View>
            <View style={{ width: '48%', flexGrow: 1 }}><Metric icon="person-add" label="Followers" value={summary?.followers} colors={colors} typography={typography} /></View>
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 17 }]}>Broadcast collection</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}><Metric icon="radio" label="Broadcasts" value={streams.total} colors={colors} typography={typography} /></View>
            <View style={{ flex: 1 }}><Metric icon="radio-outline" label="Live now" value={streams.liveNow} colors={colors} typography={typography} /></View>
            <View style={{ flex: 1 }}><Metric icon="film" label="Replays ready" value={replays.ready} colors={colors} typography={typography} /></View>
          </View>
        </View>

        <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Recent broadcasts</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>{streams.total || 0} total</Text>
          </View>
          {(streams.recent || []).length ? streams.recent.map((item) => (
            <View key={item.id} style={{ paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name={item.status === 'live' ? 'radio' : 'videocam-outline'} size={18} color={item.status === 'live' ? colors.danger : colors.primary} />
              <View style={{ flex: 1 }}><Text numberOfLines={1} style={[typography.bodyStrong, { color: colors.textPrimary }]}>{item.title || 'LIVE broadcast'}</Text><Text style={[typography.caption, { color: colors.textSecondary }]}>{item.status === 'live' ? 'Currently live' : item.status}</Text></View>
            </View>
          )) : <Text style={[typography.caption, { color: colors.textSecondary }]}>Your broadcasts will appear here after your first LIVE session.</Text>}
        </GlassCard>

        <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Replay collection</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>{replays.total || 0} total</Text>
          </View>
          {(replays.recent || []).length ? replays.recent.map((item) => (
            <TouchableOpacity key={item.id} onPress={() => navigation.navigate('LiveReplay', { replay: { ...item, streamId: item.stream_id, status: item.status } })} accessibilityRole="button" accessibilityLabel="Open LIVE replay" style={{ paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name="play-circle" size={22} color={colors.primary} />
              <View style={{ flex: 1 }}><Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>LIVE replay</Text><Text style={[typography.caption, { color: colors.textSecondary }]}>{item.status === 'ready' ? 'Ready to watch' : item.status}</Text></View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )) : <Text style={[typography.caption, { color: colors.textSecondary }]}>Your saved replay collection will appear here.</Text>}
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}
