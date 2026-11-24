import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { getLiveCreatorRewardRules, createLiveCreatorRewardRule, activateLiveCreatorRewardRule } from '../services/liveEconomyService';

function money(minor) {
  const value = Number(minor);
  return Number.isSafeInteger(value) ? '₦' + (value / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
}

export default function LiveRewardPolicyAdminScreen({ navigation }) {
  const { colors, spacing, typography, layout } = useTheme();
  const [rules, setRules] = useState([]);
  const [share, setShare] = useState('');
  const [clearance, setClearance] = useState('');
  const [minimum, setMinimum] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await getLiveCreatorRewardRules();
      setRules(Array.isArray(result?.rules) ? result.rules : []);
    } catch (e) { setError(e?.message || 'Creator reward policies could not be loaded.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); return undefined; }, [load]));

  const createDraft = async () => {
    const shareValue = Number(share);
    const shareBps = Math.round(shareValue * 100);
    const clearanceHours = Number(clearance);
    const minimumMinor = Math.round(Number(minimum) * 100);
    if (!Number.isFinite(shareValue) || shareValue <= 0 || shareValue > 100
        || !Number.isInteger(shareBps) || !/^\d{1,3}(\.\d{1,2})?$/.test(share)
        || !/^\\d+$/.test(clearance) || !Number.isInteger(clearanceHours) || clearanceHours < 0 || clearanceHours > 720
        || !/^\d+(\.\d{1,2})?$/.test(minimum) || !Number.isSafeInteger(minimumMinor) || minimumMinor <= 0) {
      setError('Enter a valid creator share (0.01–100%), clearance period (0–720 hours), and withdrawal minimum in NGN.'); return;
    }
    setSaving(true); setError(''); setNotice('');
    try {
      await createLiveCreatorRewardRule({ creatorShareBps: shareBps, clearanceHours, minimumWithdrawalMinor: minimumMinor });
      setShare(''); setClearance(''); setMinimum('');
      setNotice('Inactive reward policy draft created. It does not affect creator earnings until activated.');
      await load();
    } catch (e) { setError(e?.message || 'Could not create the reward policy draft.'); }
    finally { setSaving(false); }
  };

  const activate = (rule) => Alert.alert(
    'Activate creator reward policy?',
    'This replaces the currently active rule and applies to new eligible purchased-Sparks gifts. Existing earnings retain their original rule. Confirm that the commercial terms have been approved.',
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Activate policy', style: 'destructive', onPress: async () => {
      setSaving(true); setError(''); setNotice('');
      try { await activateLiveCreatorRewardRule(rule.id); setNotice('Creator reward policy activated and recorded in the audit log.'); await load(); }
      catch (e) { setError(e?.message || 'Could not activate the reward policy.'); }
      finally { setSaving(false); }
    } }],
  );

  const field = { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 13, color: colors.textPrimary, backgroundColor: colors.surface };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg || 18, gap: 14, maxWidth: layout?.maxContentWidth || 760, width: '100%', alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={{ width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}><Ionicons name="arrow-back" size={20} color={colors.textPrimary} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 21, fontWeight: '900' }}>Creator reward policies</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Restricted financial configuration · NGN</Text>
          </View>
        </View>
        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, backgroundColor: colors.surface, gap: 8 }}>
          <Text style={{ color: colors.textPrimary, fontWeight: '900', fontSize: 16 }}>Create an inactive draft</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>These are commercial decisions, not defaults. Enter only approved terms. The creator share is applied to eligible net purchase value after verified provider fees.</Text>
          <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>Creator share (%)</Text>
          <TextInput value={share} onChangeText={setShare} keyboardType="decimal-pad" placeholder="Approved percentage" placeholderTextColor={colors.textSecondary} accessibilityLabel="Creator share percentage" style={field} />
          <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>Earnings clearance (hours)</Text>
          <TextInput value={clearance} onChangeText={setClearance} keyboardType="number-pad" placeholder="Approved clearance hours" placeholderTextColor={colors.textSecondary} accessibilityLabel="Earnings clearance hours" style={field} />
          <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>Minimum withdrawal (NGN)</Text>
          <TextInput value={minimum} onChangeText={setMinimum} keyboardType="decimal-pad" placeholder="Approved NGN minimum" placeholderTextColor={colors.textSecondary} accessibilityLabel="Minimum withdrawal in naira" style={field} />
          <TouchableOpacity disabled={saving} onPress={createDraft} accessibilityRole="button" accessibilityLabel="Create inactive creator reward policy draft" style={{ minHeight: 48, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: saving ? 0.55 : 1 }}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>Save inactive draft</Text>}
          </TouchableOpacity>
        </View>
        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 17, fontWeight: '900' }}>Policy history</Text>
          {loading ? <ActivityIndicator color={colors.primary} /> : rules.length === 0 ? <Text style={{ color: colors.textSecondary }}>No reward policies have been configured.</Text> : rules.map((rule) => (
            <View key={rule.id} style={{ borderRadius: 15, borderWidth: 1, borderColor: rule.is_active ? colors.primary : colors.border, backgroundColor: colors.surface, padding: 14, gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: colors.textPrimary, fontWeight: '900' }}>{(Number(rule.creator_share_bps) / 100).toFixed(2)}% creator share</Text>
                <Text style={{ color: rule.is_active ? colors.primary : colors.textSecondary, fontWeight: '900', fontSize: 12 }}>{rule.is_active ? 'ACTIVE' : 'INACTIVE DRAFT'}</Text>
              </View>
              <Text style={{ color: colors.textSecondary }}>Clearance: {rule.clearance_hours} hours</Text>
              <Text style={{ color: colors.textSecondary }}>Minimum withdrawal: {money(rule.minimum_withdrawal_minor)}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Created: {rule.created_at ? new Date(rule.created_at).toLocaleString() : '—'}</Text>
              {!rule.is_active ? <TouchableOpacity disabled={saving} onPress={() => activate(rule)} accessibilityRole="button" accessibilityLabel="Activate this creator reward policy" style={{ minHeight: 44, marginTop: 5, borderRadius: 12, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.primary, fontWeight: '900' }}>Review and activate</Text></TouchableOpacity> : null}
            </View>
          ))}
        </View>
        {error ? <Text accessibilityRole="alert" style={{ color: colors.danger || '#D65A72' }}>{error}</Text> : null}
        {notice ? <Text accessibilityRole="status" style={{ color: colors.success || colors.primary }}>{notice}</Text> : null}
        <Text style={[typography.caption, { color: colors.textSecondary }]}>Activating a rule does not verify creators, reconcile Apple fees, enable Paystack transfers, or bypass payout holds. Transfers remain separately gated.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
