import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { getLiveCreatorEarningsHistory, getLiveCreatorEarningsSummary } from '../services/liveEconomyService';

function formatNaira(amountMinor) {
  const amount = Number(amountMinor || 0);
  if (!Number.isSafeInteger(amount) || amount < 0) return '—';
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount / 100);
}

function Surface({ children, colors, style }) {
  return <View style={[{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: 16 }, style]}>{children}</View>;
}

export default function LiveCreatorEarningsScreen({ navigation }) {
  const { colors, spacing, typography, layout } = useTheme();
  const [summary, setSummary] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [summaryResult, historyResult] = await Promise.allSettled([
      getLiveCreatorEarningsSummary(),
      getLiveCreatorEarningsHistory(),
    ]);
    if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value?.earnings || null);
    if (historyResult.status === 'fulfilled') setEntries(Array.isArray(historyResult.value?.entries) ? historyResult.value.entries : []);
    const failed = [summaryResult, historyResult].find((item) => item.status === 'rejected');
    if (failed) setError(failed.reason?.message || 'Creator earnings could not be loaded.');
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); return undefined; }, [load]));

  const metrics = [
    { label: 'Available', value: summary?.availableMinor, icon: 'wallet-outline' },
    { label: 'Pending', value: summary?.pendingMinor, icon: 'time-outline' },
    { label: 'On hold', value: summary?.heldMinor, icon: 'shield-outline' },
    { label: 'Paid out', value: summary?.paidOutMinor, icon: 'checkmark-circle-outline' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl || 32, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back"
            style={{ width: 44, height: 44, borderRadius: 15, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[typography.title, { color: colors.textPrimary, fontWeight: '900' }]}>Creator Earnings</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Verified rewards from eligible LIVE gifts</Text>
          </View>
          <TouchableOpacity onPress={load} accessibilityRole="button" accessibilityLabel="Refresh creator earnings"
            style={{ width: 44, height: 44, borderRadius: 15, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
            <Ionicons name="refresh" size={19} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <Surface colors={colors} style={{ borderColor: colors.gold || colors.primary }}>
          <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '800', letterSpacing: 1.2 }]}>LIFETIME NET EARNINGS</Text>
          <Text style={{ color: colors.textPrimary, fontSize: 34, fontWeight: '900', marginTop: 8 }}>
            {loading && !summary ? '—' : formatNaira(summary?.lifetimeNetMinor)}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 6 }]}>
            {summary?.earningEnabled
              ? 'Creator rewards are enabled under the current server policy.'
              : 'Creator rewards are not activated yet. No cash earnings are being generated.'}
          </Text>
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 14 }} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {metrics.map((item) => (
              <View key={item.label} style={{ width: '47%', minWidth: 120, paddingVertical: 7 }}>
                <Ionicons name={item.icon} size={17} color={colors.primary} />
                <Text style={{ color: colors.textPrimary, fontSize: 17, fontWeight: '900', marginTop: 6 }}>{formatNaira(item.value)}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </Surface>

        <TouchableOpacity onPress={() => navigation.navigate('LiveCreatorPayout')} accessibilityRole="button" accessibilityLabel="Open bank payout setup"
          style={{ minHeight: 54, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="business-outline" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textPrimary, fontWeight: '900' }}>Bank and withdrawals</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Verify a bank account and track payouts</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <Surface colors={colors}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontWeight: '900' }}>How creator rewards work</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 5 }]}>
                Only the verified purchase value of Sparks spent on gifts can create creator earnings. Promotional and legacy Sparks may contribute to PK scores, but do not create cash rewards. A server-defined clearance period applies before funds become withdrawable.
              </Text>
            </View>
          </View>
        </Surface>

        {summary?.minimumWithdrawalMinor ? (
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Minimum withdrawal under the active policy: {formatNaira(summary.minimumWithdrawalMinor)}</Text>
        ) : null}

        {error ? <Surface colors={colors} style={{ borderColor: colors.danger || '#D65A72' }}>
          <Text style={{ color: colors.danger || '#D65A72', fontWeight: '800' }}>{error}</Text>
        </Surface> : null}

        <View style={{ gap: 8 }}>
          <Text style={[typography.heading, { color: colors.textPrimary, fontWeight: '900' }]}>Earnings activity</Text>
          {loading ? <ActivityIndicator color={colors.primary} /> : entries.length === 0 ? (
            <Surface colors={colors}><Text style={{ color: colors.textSecondary }}>No creator earnings have been recorded yet.</Text></Surface>
          ) : entries.map((item) => (
            <Surface key={item.id} colors={colors} style={{ padding: 13 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>{item.entry_type === 'reversal' ? 'Reward reversal' : item.entry_type === 'adjustment' ? 'Account adjustment' : 'LIVE gift reward'}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>{new Date(item.created_at).toLocaleString()}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>{item.status.toUpperCase()}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: '900' }}>{formatNaira(item.net_minor)}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>Net reward</Text>
                </View>
              </View>
            </Surface>
          ))}
        </View>
        <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>Withdrawals will become available only after identity verification, bank-beneficiary verification and payout processing are enabled.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
