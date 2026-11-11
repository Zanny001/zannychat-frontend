import React, { useCallback, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import { useTheme } from '../theme/ThemeContext';
import { listCallHistory } from '../services/calls';
import { getCallHistoryLabel } from '../utils/callHistory';

function formatDate(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : 'Date unavailable';
}
function formatDuration(seconds) {
  if (!seconds) return '';
  const minutes = Math.floor(seconds / 60), remainder = seconds % 60;
  return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

export default function CallHistoryScreen({ navigation }) {
  const { colors, spacing, typography, radii } = useTheme();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError('');
    try { setCalls(await listCallHistory()); }
    catch (e) { setError(e?.message || 'Call history could not be loaded.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); return undefined; }, [load]));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Calls" subtitle="Your audio and video call history" />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl || spacing.xl }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
          {[
            { title: 'Audio', subtitle: 'Voice call', icon: 'call-outline', action: () => navigation.navigate('NewChat', { callType: 'audio', directoryFilter: 'all' }) },
            { title: 'Video', subtitle: 'Video call', icon: 'videocam-outline', action: () => navigation.navigate('NewChat', { callType: 'video', directoryFilter: 'all' }) },
            { title: 'Favourites', subtitle: 'Saved people', icon: 'star-outline', action: () => navigation.navigate('NewChat', { directoryFilter: 'favorites', callType: null }) },
          ].map((item) => (
            <TouchableOpacity
              key={item.title}
              onPress={item.action}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={item.title === 'Favourites' ? 'Open favourite contacts' : `Start ${item.title.toLowerCase()} call`}
              style={{ flex: 1, minHeight: 104, padding: spacing.sm, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: 'space-between' }}
            >
              <View style={{ width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
                <Ionicons name={item.icon} size={19} color={colors.accent || colors.primary} />
              </View>
              <View style={{ gap: 2 }}>
                <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{item.title}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={2}>{item.subtitle}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        {error ? <View style={{ padding: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm }}>
          <Text accessibilityRole="alert" style={[typography.body, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity onPress={() => load(true)} accessibilityRole="button"><Text style={[typography.bodyStrong, { color: colors.primary }]}>Try again</Text></TouchableOpacity>
        </View> : null}
        {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} /> : null}
        {!loading && !error && calls.length === 0 ? <View style={{ alignItems: 'center', paddingVertical: spacing.xxl || spacing.xl, gap: spacing.sm }}>
          <Ionicons name="call-outline" size={38} color={colors.textSecondary} />
          <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>No calls yet</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>Audio and video calls will appear here for both participants, including missed calls</Text>
        </View> : null}
        {calls.map((item) => {
          const missed = item.status === 'missed' || (item.status === 'ringing' && Date.parse(item.expires_at) <= Date.now());
          const userId = item.direction === 'incoming' ? item.callee_id : item.caller_id;
          const label = getCallHistoryLabel(item, userId);
          const kind = item.call_type === 'video' ? 'Video call' : 'Audio call';
          return <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Avatar name={item.participantName} color={item.avatarColor || colors.primary} size={48} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{item.participantName}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name={item.call_type === 'video' ? 'videocam-outline' : 'call-outline'} size={14} color={missed ? '#D64545' : colors.textSecondary} />
                <Text style={[typography.caption, { color: missed ? '#D64545' : colors.textSecondary }]}>{label} · {kind}</Text>
              </View>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>{formatDate(item.created_at)}{item.durationSeconds ? ` · ${formatDuration(item.durationSeconds)}` : ''}</Text>
            </View>
            <Ionicons name={item.direction === 'incoming' ? 'arrow-down-left' : 'arrow-up-right'} size={18} color={missed ? '#D64545' : colors.textSecondary} />
          </View>;
        })}
        {refreshing ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} /> : null}
        {!loading && calls.length > 0 ? <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md }]}>Call records are shared between both participants</Text> : null}
      </ScrollView>
      <TouchableOpacity onPress={() => load(true)} accessibilityRole="button" accessibilityLabel="Refresh call history" style={{ position: 'absolute', right: 18, bottom: 18, width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="refresh" size={20} color={colors.background} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
