import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import {
  addLiveCreatorPayoutBeneficiary,
  disableLiveCreatorPayoutBeneficiary,
  getLiveCreatorEarningsSummary,
  getLiveCreatorPayoutBanks,
  getLiveCreatorPayoutBeneficiaries,
  getLiveCreatorPayoutEligibility,
  getLiveCreatorPayoutHistory,
  getLiveCreatorPayoutReviewAccess,
  getLiveCreatorRewardPolicyAccess,
  requestLiveCreatorPayout,
} from '../services/liveEconomyService';

function formatNaira(amountMinor) {
  const amount = Number(amountMinor || 0);
  if (!Number.isSafeInteger(amount) || amount < 0) return '—';
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount / 100);
}

function Surface({ children, colors, style }) {
  return <View style={[{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: 15 }, style]}>{children}</View>;
}

export default function LiveCreatorPayoutScreen({ navigation }) {
  const { colors, spacing, typography, layout } = useTheme();
  const [eligibility, setEligibility] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [banks, setBanks] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [amountNaira, setAmountNaira] = useState('');
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingBank, setSavingBank] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [canReviewPayouts, setCanReviewPayouts] = useState(false);
  const [canManageRewardPolicy, setCanManageRewardPolicy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const results = await Promise.allSettled([
      getLiveCreatorPayoutEligibility(),
      getLiveCreatorEarningsSummary(),
      getLiveCreatorPayoutBanks(),
      getLiveCreatorPayoutBeneficiaries(),
      getLiveCreatorPayoutHistory(),
      getLiveCreatorPayoutReviewAccess(),
      getLiveCreatorRewardPolicyAccess(),
    ]);
    if (results[0].status === 'fulfilled') setEligibility(results[0].value);
    if (results[1].status === 'fulfilled') setEarnings(results[1].value?.earnings || null);
    if (results[2].status === 'fulfilled') setBanks(Array.isArray(results[2].value?.banks) ? results[2].value.banks : []);
    if (results[3].status === 'fulfilled') {
      const list = Array.isArray(results[3].value?.beneficiaries) ? results[3].value.beneficiaries : [];
      setBeneficiaries(list);
      setSelectedBeneficiaryId((current) => list.some((item) => item.id === current && item.status === 'verified')
        ? current : (list.find((item) => item.status === 'verified')?.id || ''));
    }
    if (results[4].status === 'fulfilled') setPayouts(Array.isArray(results[4].value?.payouts) ? results[4].value.payouts : []);
    setCanReviewPayouts(results[5].status === 'fulfilled' && results[5].value?.isAdmin === true);
    setCanManageRewardPolicy(results[6].status === 'fulfilled' && results[6].value?.isAdmin === true);
    const failed = results.find((item) => item.status === 'rejected');
    if (failed) setError(failed.reason?.message || 'Some payout information could not be loaded.');
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); return undefined; }, [load]));

  const saveBank = async () => {
    if (!eligibility?.providerConfigured || !/^[0-9]{10}$/.test(accountNumber) || !bankCode || savingBank) return;
    setSavingBank(true);
    setError('');
    setNotice('');
    try {
      const result = await addLiveCreatorPayoutBeneficiary({ bankCode, accountNumber });
      setAccountNumber('');
      setBankCode('');
      setNotice('Bank account verified and saved. Only the masked account details are retained by ZannyChat.');
      await load();
      if (result?.beneficiary?.id) setSelectedBeneficiaryId(result.beneficiary.id);
    } catch (saveError) {
      setError(saveError?.message || 'Could not verify this bank account.');
    } finally {
      setSavingBank(false);
    }
  };

  const disableBank = (beneficiary) => {
    if (!beneficiary?.id) return;
    Alert.alert(
      'Remove bank account',
      'Remove ' + beneficiary.bank_name + ' account ending ' + beneficiary.account_last4 + ' from your payout methods? This does not reverse transfers already submitted.',
      [
        { text: 'Keep account', style: 'cancel' },
        {
          text: 'Remove account',
          style: 'destructive',
          onPress: async () => {
            setError('');
            setNotice('');
            try {
              await disableLiveCreatorPayoutBeneficiary(beneficiary.id);
              if (selectedBeneficiaryId === beneficiary.id) setSelectedBeneficiaryId('');
              setNotice('Bank account removed from your payout methods.');
              await load();
            } catch (removeError) {
              setError(removeError?.message || 'Could not remove this bank account.');
            }
          },
        },
      ],
    );
  };

  const performWithdrawal = async () => {
    if (!eligibility?.enabled || !selectedBeneficiaryId || withdrawing) return;
    const naira = Number(amountNaira);
    const amountMinor = Math.round(naira * 100);
    if (!Number.isFinite(naira) || !Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
      setError('Enter a valid withdrawal amount in naira.');
      return;
    }
    setWithdrawing(true);
    setError('');
    setNotice('');
    try {
      const result = await requestLiveCreatorPayout({ beneficiaryId: selectedBeneficiaryId, amountMinor });
      setAmountNaira('');
      setNotice(result?.payout?.reconciliationPending
        ? 'Your request is reserved while the payment provider confirms the transfer. Do not submit another request.'
        : 'Withdrawal request submitted. Follow its status in payout history.');
      await load();
    } catch (withdrawError) {
      setError(withdrawError?.message || 'Could not submit this withdrawal.');
    } finally {
      setWithdrawing(false);
    }
  };

  const confirmWithdrawal = () => {
    const naira = Number(amountNaira);
    if (!Number.isFinite(naira) || naira <= 0) {
      setError('Enter a valid withdrawal amount in naira.');
      return;
    }
    Alert.alert(
      'Confirm withdrawal',
      'Request a transfer of ' + formatNaira(Math.round(naira * 100)) + ' to your selected verified bank account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm withdrawal', onPress: performWithdrawal },
      ],
    );
  };

  const verifiedBeneficiaries = beneficiaries.filter((item) => item.status === 'verified');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl || 32, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back"
            style={{ width: 44, height: 44, borderRadius: 15, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[typography.title, { color: colors.textPrimary, fontWeight: '900' }]}>Withdraw Earnings</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Verified Nigerian bank payouts</Text>
          </View>
          <TouchableOpacity onPress={load} accessibilityRole="button" accessibilityLabel="Refresh payout status"
            style={{ width: 44, height: 44, borderRadius: 15, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
            <Ionicons name="refresh" size={19} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {canManageRewardPolicy ? (
          <TouchableOpacity onPress={() => navigation.navigate('LiveRewardPolicyAdmin')} accessibilityRole="button" accessibilityLabel="Open creator reward policy administration"
            style={{ minHeight: 48, borderRadius: 14, paddingHorizontal: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <Ionicons name="settings" size={19} color={colors.primary} />
              <Text style={{ color: colors.textPrimary, fontWeight: '900' }}>Admin · Creator reward policies</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
        {canManageRewardPolicy ? (
          <TouchableOpacity onPress={() => navigation.navigate('LiveSparkCatalogueAdmin')} accessibilityRole="button" accessibilityLabel="Open Sparks store catalogue administration"
            style={{ minHeight: 48, borderRadius: 14, paddingHorizontal: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <Ionicons name="flash" size={19} color={colors.primary} />
              <Text style={{ color: colors.textPrimary, fontWeight: '900' }}>Admin · Sparks store catalogue</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
        {canReviewPayouts ? (
          <TouchableOpacity onPress={() => navigation.navigate('LivePayoutReview')} accessibilityRole="button" accessibilityLabel="Open creator payout review queue"
            style={{ minHeight: 48, borderRadius: 14, paddingHorizontal: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <Ionicons name="shield-checkmark" size={19} color={colors.primary} />
              <Text style={{ color: colors.textPrimary, fontWeight: '900' }}>Admin · Payout verification reviews</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
        <Surface colors={colors} style={{ borderColor: eligibility?.enabled ? (colors.success || colors.primary) : colors.border }}>
          <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '800', letterSpacing: 1.2 }]}>WITHDRAWABLE BALANCE</Text>
          <Text style={{ color: colors.textPrimary, fontSize: 32, fontWeight: '900', marginTop: 7 }}>{loading ? '—' : formatNaira(earnings?.availableMinor)}</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 5 }]}>
            {eligibility?.enabled
              ? 'Payout eligibility is active. Only cleared creator earnings can be withdrawn.'
              : eligibility?.reason === 'PAYOUT_KYC_REQUIRED'
                ? 'Identity verification is required before withdrawals can be activated.'
                : eligibility?.reason === 'CREATOR_REWARD_POLICY_NOT_CONFIGURED'
                  ? 'Creator reward and withdrawal terms have not been activated yet.'
                  : eligibility?.reason === 'PAYOUT_TRANSFER_APPROVAL_REQUIRED'
                    ? 'Automated payouts are waiting for the Paystack transfer-approval setting to be securely configured.'
                    : eligibility?.reason === 'PAYOUT_FEE_POLICY_REQUIRED'
                      ? 'Withdrawal fees, provider charges and applicable transfer levies must be configured before withdrawals can be enabled.'
                      : 'Payout services are not active yet. No withdrawal can be submitted.'}
          </Text>
          {eligibility?.minimumWithdrawalMinor ? <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 7 }]}>Minimum withdrawal: {formatNaira(eligibility.minimumWithdrawalMinor)}</Text> : null}
        </Surface>

        {eligibility?.providerConfigured ? (
          <View style={{ gap: 10 }}>
            <Text style={[typography.heading, { color: colors.textPrimary, fontWeight: '900' }]}>Bank account</Text>
            {verifiedBeneficiaries.length ? verifiedBeneficiaries.map((item) => (
              <View key={item.id} style={{ borderRadius: 16, padding: 13, borderWidth: 1, borderColor: selectedBeneficiaryId === item.id ? colors.primary : colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TouchableOpacity onPress={() => setSelectedBeneficiaryId(item.id)} accessibilityRole="radio" accessibilityLabel={'Select ' + item.bank_name + ' account ending ' + item.account_last4} accessibilityState={{ checked: selectedBeneficiaryId === item.id }}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name={selectedBeneficiaryId === item.id ? 'radio-button-on' : 'radio-button-off'} size={20} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textPrimary, fontWeight: '900' }}>{item.bank_name}</Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>{item.account_name} · •••• {item.account_last4}</Text>
                  </View>
                </TouchableOpacity>
                <View style={{ alignItems: 'flex-end', gap: 7 }}>
                  <Text style={[typography.caption, { color: colors.success || colors.primary }]}>Verified</Text>
                  <TouchableOpacity onPress={() => disableBank(item)} accessibilityRole="button"
                    accessibilityLabel={'Remove ' + item.bank_name + ' account ending ' + item.account_last4}
                    style={{ paddingVertical: 5, paddingHorizontal: 8, borderRadius: 9, borderWidth: 1, borderColor: colors.danger || '#D65A72' }}>
                    <Text style={{ color: colors.danger || '#D65A72', fontSize: 12, fontWeight: '800' }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )) : <Surface colors={colors}><Text style={{ color: colors.textSecondary }}>No verified bank account saved yet.</Text></Surface>}

            <Surface colors={colors} style={{ gap: 10 }}>
              <Text style={{ color: colors.textPrimary, fontWeight: '900' }}>Add a Nigerian bank account</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>The account number is sent to Paystack for verification and is not stored by ZannyChat. We retain only the provider recipient token and masked details.</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '800' }]}>Select bank</Text>
              <View style={{ gap: 6, maxHeight: 190 }}>
                <ScrollView nestedScrollEnabled>
                  {banks.map((bank) => (
                    <TouchableOpacity key={bank.code} onPress={() => setBankCode(String(bank.code))} accessibilityRole="radio" accessibilityLabel={'Select ' + bank.name} accessibilityState={{ checked: bankCode === String(bank.code) }}
                      style={{ paddingVertical: 9, paddingHorizontal: 10, borderRadius: 10, backgroundColor: bankCode === String(bank.code) ? colors.primary + '20' : 'transparent' }}>
                      <Text style={{ color: colors.textPrimary, fontWeight: bankCode === String(bank.code) ? '900' : '600' }}>{bank.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <TextInput value={accountNumber} onChangeText={(value) => setAccountNumber(value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit account number" placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad" maxLength={10}
                style={{ minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, color: colors.textPrimary, backgroundColor: colors.background }} />
              <TouchableOpacity onPress={saveBank} accessibilityRole="button" accessibilityLabel="Verify and save bank account" disabled={savingBank || !bankCode || accountNumber.length !== 10}
                style={{ minHeight: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, opacity: savingBank || !bankCode || accountNumber.length !== 10 ? 0.5 : 1 }}>
                {savingBank ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>Verify and save bank</Text>}
              </TouchableOpacity>
            </Surface>
          </View>
        ) : (
          <Surface colors={colors}>
            <Text style={{ color: colors.textPrimary, fontWeight: '900' }}>Bank payouts awaiting provider setup</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 5 }]}>Bank verification and transfer initiation will be available after Paystack onboarding and server credentials are configured.</Text>
          </Surface>
        )}

        {eligibility?.enabled ? (
          <Surface colors={colors} style={{ gap: 10 }}>
            <Text style={{ color: colors.textPrimary, fontWeight: '900' }}>Request withdrawal</Text>
            <TextInput value={amountNaira} onChangeText={setAmountNaira} placeholder="Amount in NGN" placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              style={{ minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, color: colors.textPrimary, backgroundColor: colors.background }} />
            <TouchableOpacity onPress={confirmWithdrawal} accessibilityRole="button" accessibilityLabel="Review withdrawal request" disabled={withdrawing || !selectedBeneficiaryId}
              style={{ minHeight: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, opacity: withdrawing || !selectedBeneficiaryId ? 0.5 : 1 }}>
              {withdrawing ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>Review withdrawal</Text>}
            </TouchableOpacity>
          </Surface>
        ) : null}

        {error ? <Surface colors={colors} style={{ borderColor: colors.danger || '#D65A72' }}><Text style={{ color: colors.danger || '#D65A72', fontWeight: '800' }}>{error}</Text></Surface> : null}
        {notice ? <Surface colors={colors}><Text style={{ color: colors.success || colors.primary, fontWeight: '700' }}>{notice}</Text></Surface> : null}

        <View style={{ gap: 8 }}>
          <Text style={[typography.heading, { color: colors.textPrimary, fontWeight: '900' }]}>Payout history</Text>
          {loading ? <ActivityIndicator color={colors.primary} /> : payouts.length === 0 ? (
            <Surface colors={colors}><Text style={{ color: colors.textSecondary }}>No withdrawal requests yet.</Text></Surface>
          ) : payouts.map((item) => (
            <Surface key={item.id} colors={colors} style={{ padding: 13 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>{formatNaira(item.amount_minor)}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>{new Date(item.requested_at).toLocaleString()}</Text>
                </View>
                <Text style={[typography.caption, { color: item.status === 'paid' ? (colors.success || colors.primary) : colors.textSecondary, fontWeight: '900' }]}>{item.status.toUpperCase()}</Text>
              </View>
            </Surface>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
