import React, { useCallback, useState } from 'react';
import { ActivityIndicator, SafeAreaView, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../theme/ThemeContext';
import { hideCallHistory, listCallHistory } from '../services/calls';
import { getCallHistoryLabel } from '../utils/callHistory';
import { hexToRgba } from '../utils/color';
import { confirmAction, showAppAlert } from '../utils/appDialogs';

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
  const { colors, spacing, typography, radii, layout } = useTheme();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [deletingCallId, setDeletingCallId] = useState(null);
  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError('');
    try { setCalls(await listCallHistory()); }
    catch (e) { setError(e?.message || 'Call history could not be loaded.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); return undefined; }, [load]));


  const removeCall = async (item) => {
    const confirmed = await confirmAction({
      title: 'Delete call record?',
      message: 'This removes the record from your call history only. The other participant keeps their copy.',
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    setDeletingCallId(item.id);
    try {
      await hideCallHistory(item);
      setCalls((current) => current.filter((call) => !(call.id === item.id && Boolean(call.isGroupCall) === Boolean(item.isGroupCall))));
    } catch (e) {
      showAppAlert('Could not delete call record', e?.message || 'Please try again.');
    } finally {
      setDeletingCallId(null);
    }
  };

  const redialCall = (item, peerId, callType) => {
    if (item.isGroupCall) {
      navigation.navigate('GroupCall', {
        conversationId: item.conversation_id,
        conversationName: item.participantName || 'Group',
        callType,
      });
      return;
    }
    navigation.navigate('NewChat', {
      callType,
      directoryFilter: 'all',
      targetUserId: peerId,
    });
  };

  const actions = [
    { title: 'Audio', subtitle: 'Start a voice call', icon: 'call-outline', accent: colors.primary, action: () => navigation.navigate('NewChat', { callType: 'audio', directoryFilter: 'all' }) },
    { title: 'Video', subtitle: 'Face to face', icon: 'videocam-outline', accent: colors.accent || colors.primary, action: () => navigation.navigate('NewChat', { callType: 'video', directoryFilter: 'all' }) },
    { title: 'Favourites', subtitle: 'Your people', icon: 'star-outline', accent: colors.gold, action: () => navigation.navigate('NewChat', { directoryFilter: 'favorites', callType: null }) },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Calls" subtitle="Your moments, one connection away" />
      <FlatList
        style={{ flex: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}
        data={calls}
        keyExtractor={(item) => `${item.isGroupCall ? 'group' : 'direct'}:${item.id}`}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 104, gap: spacing.lg, flexGrow: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}
        ListHeaderComponent={<View style={{ gap: spacing.lg }}><View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Quick connect</Text>
            <Text style={[typography.small, { color: colors.textSecondary }]}>INSTANT ACCESS</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {actions.map((item) => (
              <TouchableOpacity
                key={item.title}
                onPress={item.action}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel={item.title === 'Favourites' ? 'Open favourite contacts' : `Start ${item.title.toLowerCase()} call`}
                style={{ flex: 1, minWidth: 0 }}
              >
                <GlassCard glow={item.title === 'Video'} tintAlpha={0.34} contentStyle={{ padding: spacing.sm, minHeight: 126, justifyContent: 'space-between', gap: spacing.sm }}>
                  <View style={{ width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: hexToRgba(item.accent, 0.16), borderWidth: 1, borderColor: hexToRgba(item.accent, 0.35) }}>
                    <Ionicons name={item.icon} size={21} color={item.accent} />
                  </View>
                  <View style={{ gap: 3, minWidth: 0 }}>
                    <Text style={[typography.bodyStrong, { color: colors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
                    <Text style={[typography.small, { color: colors.textSecondary }]} numberOfLines={2}>{item.subtitle}</Text>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ gap: 2 }}>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Recent calls</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Your call activity, kept in one place</Text>
            </View>
            <TouchableOpacity onPress={() => load(true)} disabled={refreshing || loading} accessibilityRole="button" accessibilityLabel="Refresh call history" style={{ width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: hexToRgba(colors.primary, 0.13), borderWidth: 1, borderColor: hexToRgba(colors.primary, 0.28) }}>
              {refreshing ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh" size={19} color={colors.primary} />}
            </TouchableOpacity>
          </View>

          {error ? (
            <GlassCard tintAlpha={0.42}>
              <Text accessibilityRole="alert" style={[typography.body, { color: colors.danger }]}>{error}</Text>
              <TouchableOpacity onPress={() => load(true)} accessibilityRole="button" accessibilityLabel="Retry loading call history" style={{ minHeight: 48, justifyContent: 'center', marginTop: spacing.xs }}>
                <Text style={[typography.bodyStrong, { color: colors.primary }]}>Try again</Text>
              </TouchableOpacity>
            </GlassCard>
          ) : null}

          {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} /> : null}</View></View>}
        renderItem={({ item }) => {
          const missed = item.status === 'missed' || (item.status === 'ringing' && Date.parse(item.expires_at) <= Date.now());
            const userId = item.direction === 'incoming' ? item.callee_id : item.caller_id;
            const peerUserId = item.direction === 'incoming' ? item.caller_id : item.callee_id;
            const label = getCallHistoryLabel(item, userId);
            const isVideo = item.call_type === 'video';
            const kind = isVideo ? 'Video call' : 'Audio call';
            const callAccent = missed ? colors.danger : colors.accent || colors.primary;
            return (
              <GlassCard key={item.id} tintAlpha={0.28} noPadding>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm }}>
                  <Avatar name={item.participantName} color={item.avatarColor || colors.primary} imageUrl={item.participantAvatarUrl} size={50} />
                  <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                    <Text style={[typography.bodyStrong, { color: colors.textPrimary }]} numberOfLines={1}>{item.participantName || 'ZannyChat contact'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0 }}>
                      <Ionicons name={isVideo ? 'videocam-outline' : 'call-outline'} size={14} color={callAccent} />
                      <Text style={[typography.caption, { color: callAccent, flexShrink: 1 }]} numberOfLines={1}>{label} · {kind}</Text>
                    </View>
                    <Text style={[typography.small, { color: colors.textSecondary }]} numberOfLines={1}>{formatDate(item.created_at)}{item.durationSeconds ? ` · ${formatDuration(item.durationSeconds)}` : ''}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <TouchableOpacity onPress={() => redialCall(item, peerUserId, 'audio')} accessibilityRole="button" accessibilityLabel={'Call ' + (item.participantName || 'contact') + ' again'} style={{ width: 48, height: 48, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: hexToRgba(colors.primary, 0.13) }}>
                      <Ionicons name="call" size={17} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => redialCall(item, peerUserId, 'video')} accessibilityRole="button" accessibilityLabel={'Video call ' + (item.participantName || 'contact') + ' again'} style={{ width: 48, height: 48, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: hexToRgba(colors.accent || colors.primary, 0.13) }}>
                      <Ionicons name="videocam" size={17} color={colors.accent || colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeCall(item)} disabled={deletingCallId === item.id} accessibilityRole="button" accessibilityLabel={'Delete call record with ' + (item.participantName || 'contact')} accessibilityState={{ disabled: deletingCallId === item.id }} style={{ width: 48, height: 48, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: hexToRgba(colors.danger, 0.12) }}>
                      {deletingCallId === item.id ? <ActivityIndicator size="small" color={colors.danger} /> : <Ionicons name="trash-outline" size={17} color={colors.danger} />}
                    </TouchableOpacity>
                  </View>
                </View>
              </GlassCard>
            );
        }}
        ListEmptyComponent={!loading && !error ? <GlassCard glow tintAlpha={0.3} contentStyle={{ alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm }}>
              <View style={{ width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: hexToRgba(colors.primary, 0.15), borderWidth: 1, borderColor: hexToRgba(colors.primary, 0.32) }}>
                <Ionicons name="call-outline" size={30} color={colors.primary} />
              </View>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Your next hello is one tap away</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', maxWidth: 260 }]}>Audio and video calls will appear here, including missed calls and call durations.</Text>
            </GlassCard> : null}
        ListFooterComponent={<View>{refreshing ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} /> : null}
          {!loading && calls.length > 0 ? <Text style={[typography.small, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>Deleting a record hides it only from your history</Text> : null}
        </View>}
      />
    </SafeAreaView>
  );
}
