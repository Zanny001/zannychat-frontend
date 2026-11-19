import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '../components/GlassCard';
import { backendFetch } from '../services/backendClient';
import { supabase, SUPABASE_ENABLED } from '../services/supabaseClient';
import { useTheme } from '../theme/ThemeContext';
import { showAppAlert } from '../utils/appDialogs';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'resolved', label: 'Resolved' },
];

function formatDate(value) {
  if (!value) return 'Recently';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Recently' : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function titleCase(value) {
  return String(value || 'other').replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function LiveReportsScreen({ route, navigation }) {
  const { colors, spacing, radii, typography } = useTheme();
  const streamId = route.params?.streamId || null;
  const streamTitle = route.params?.title || 'LIVE stage';
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('open');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyReportId, setBusyReportId] = useState(null);
  const [error, setError] = useState('');
  const requestGeneration = useRef(0);
  const actionLock = useRef(false);
  const actionGeneration = useRef(0);

  const refresh = useCallback(async (pull = false) => {
    const generation = ++requestGeneration.current;
    if (pull) setRefreshing(true); else setLoading(true);
    setError('');
    if (!streamId) {
      setReports([]);
      setError('This report queue has no active LIVE stream.');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const result = await backendFetch(`/live/${streamId}/reports`);
      if (generation !== requestGeneration.current) return;
      setReports(Array.isArray(result?.reports) ? result.reports : []);
    } catch (e) {
      if (generation === requestGeneration.current) {
        setReports([]);
        setError(e?.message || 'LIVE reports are temporarily unavailable.');
      }
    } finally {
      if (generation === requestGeneration.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [streamId]);

  useFocusEffect(useCallback(() => {
    refresh();
    return () => { requestGeneration.current += 1; };
  }, [refresh]));

  useEffect(() => {
    if (!SUPABASE_ENABLED || !supabase?.auth?.onAuthStateChange) return undefined;
    const { data } = supabase.auth.onAuthStateChange(() => {
      requestGeneration.current += 1;
      setReports([]);
      setBusyReportId(null);
      actionGeneration.current += 1;
      actionLock.current = false;
      Promise.resolve().then(() => refresh());
    });
    return () => data?.subscription?.unsubscribe?.();
  }, [refresh]);

  const visibleReports = useMemo(() => filter === 'all'
    ? reports
    : reports.filter((item) => item.status === filter), [filter, reports]);

  const review = async (reportId, status) => {
    if (!streamId || !reportId || actionLock.current) return;
    const actionId = ++actionGeneration.current;
    actionLock.current = true;
    setBusyReportId(reportId);
    try {
      const result = await backendFetch(`/live/${streamId}/reports/${reportId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (actionId !== actionGeneration.current) return;
      setReports((current) => current.map((item) => item.id === reportId ? { ...item, ...(result?.report || {}), status } : item));
    } catch (e) {
      if (actionId !== actionGeneration.current) return;
      showAppAlert('Could not update report', e?.message || 'Refresh the report queue and try again.');
      await refresh(true);
    } finally {
      if (actionId === actionGeneration.current) {
        actionLock.current = false;
        setBusyReportId(null);
      }
    }
  };

  const counts = useMemo(() => ({
    open: reports.filter((item) => item.status === 'open').length,
    reviewing: reports.filter((item) => item.status === 'reviewing').length,
    resolved: reports.filter((item) => item.status === 'resolved').length,
  }), [reports]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refresh(true)} tintColor={colors.primary} />} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl || 32, alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: 760, gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back to LIVE moderation" style={{ width: 48, height: 48, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '900', letterSpacing: 1.4 }]}>ZANNYCHAT · LIVE SAFETY</Text>
              <Text style={[typography.heading, { color: colors.textPrimary, fontSize: 23 }]}>Safety reports</Text>
            </View>
            <TouchableOpacity onPress={() => refresh(true)} accessibilityRole="button" accessibilityLabel="Refresh LIVE reports" style={{ width: 48, height: 48, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="refresh" size={19} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <GlassCard contentStyle={{ padding: spacing.lg, gap: spacing.sm }}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>REPORT QUEUE · {streamTitle}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {[['Open', counts.open], ['Reviewing', counts.reviewing], ['Resolved', counts.resolved]].map(([label, value]) => (
                <View key={label} style={{ flex: 1, minWidth: 92, padding: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={[typography.heading, { color: colors.textPrimary, fontSize: 22 }]}>{value}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
                </View>
              ))}
            </View>
            {route.params?.canManageParticipants !== false ? <TouchableOpacity onPress={() => navigation.navigate('LiveModeration', { streamId, title: streamTitle })} accessibilityRole="button" accessibilityLabel="Open LIVE participant moderation" style={{ minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
              <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Participant moderation</Text>
            </TouchableOpacity> : null}
          </GlassCard>

          <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' }}>
            {FILTERS.map((item) => {
              const selected = filter === item.value;
              return <TouchableOpacity key={item.value} onPress={() => setFilter(item.value)} accessibilityRole="radio" accessibilityState={{ checked: selected }} style={{ minHeight: 42, paddingHorizontal: spacing.md, borderRadius: 14, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.surface, justifyContent: 'center' }}>
                <Text style={[typography.caption, { color: selected ? colors.onPrimary : colors.textSecondary, fontWeight: '800' }]}>{item.label}</Text>
              </TouchableOpacity>;
            })}
          </View>

          {loading && !reports.length ? <View style={{ padding: spacing.xl, alignItems: 'center', gap: spacing.sm }}><ActivityIndicator color={colors.primary} /><Text style={[typography.caption, { color: colors.textSecondary }]}>Loading safety reports…</Text></View> : null}
          {!!error ? <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}><Text accessibilityRole="alert" style={[typography.body, { color: colors.danger }]}>{error}</Text><TouchableOpacity onPress={() => refresh()} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}><Text style={[typography.bodyStrong, { color: colors.primary }]}>Try again</Text></TouchableOpacity></GlassCard> : null}
          {!loading && !error && visibleReports.length === 0 ? <GlassCard contentStyle={{ padding: spacing.xl, alignItems: 'center', gap: spacing.sm }}>
            <Ionicons name="shield-checkmark-outline" size={30} color={colors.textSecondary} />
            <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>No reports in this view</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }]}>The queue updates when a viewer reports this LIVE. Review each report promptly and consistently.</Text>
          </GlassCard> : null}

          {visibleReports.map((item) => {
            const busy = busyReportId === item.id;
            const terminal = ['resolved', 'dismissed'].includes(item.status);
            return <GlassCard key={item.id} contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
                <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{titleCase(item.reason)}</Text>
                <View style={{ paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: item.status === 'open' ? colors.warning : colors.border, backgroundColor: colors.surface }}>
                  <Text style={[typography.caption, { color: item.status === 'open' ? colors.warning : colors.textSecondary, fontWeight: '800' }]}>{titleCase(item.status)}</Text>
                </View>
              </View>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Submitted {formatDate(item.created_at)}</Text>
              {item.details ? <Text selectable style={[typography.body, { color: colors.textPrimary, lineHeight: 22 }]}>{item.details}</Text> : <Text style={[typography.caption, { color: colors.textSecondary }]}>No additional details were supplied.</Text>}
              {!terminal ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {item.status === 'open' ? <TouchableOpacity disabled={busy} onPress={() => review(item.id, 'reviewing')} accessibilityRole="button" style={{ flex: 1, minWidth: 110, minHeight: 48, borderRadius: 13, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.6 : 1 }}>
                  <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '800' }]}>Start review</Text>
                </TouchableOpacity> : null}
                <TouchableOpacity disabled={busy} onPress={() => review(item.id, 'dismissed')} accessibilityRole="button" accessibilityLabel="Dismiss LIVE report" style={{ flex: 1, minWidth: 100, minHeight: 48, borderRadius: 13, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.6 : 1 }}>
                  <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '800' }}>Dismiss</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={busy} onPress={() => review(item.id, 'resolved')} accessibilityRole="button" accessibilityLabel="Resolve LIVE report" style={{ flex: 1, minWidth: 100, minHeight: 48, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.6 : 1 }}>
                  <Text style={[typography.caption, { color: colors.onPrimary, fontWeight: '900' }}>{busy ? 'Updating…' : 'Resolve'}</Text>
                </TouchableOpacity>
              </View> : <Text style={[typography.caption, { color: colors.textSecondary }]}>Reviewed by an authorised LIVE moderator.</Text>}
            </GlassCard>;
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
