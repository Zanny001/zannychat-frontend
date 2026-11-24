import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { getLiveCreatorPayoutReviewQueue, reviewLiveCreatorPayoutProfile } from '../services/liveEconomyService';

function ReviewCard({ item, colors, typography, draft, onDraft, onDecision, busy }) {
  const fieldStyle = { minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 11, paddingHorizontal: 11, color: colors.textPrimary, backgroundColor: colors.background };
  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 18, padding: 15, gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <Text style={{ color: colors.textPrimary, fontWeight: '900', flex: 1 }}>Creator review</Text>
        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>{item.verification_status}</Text>
      </View>
      <Text selectable style={{ color: colors.textSecondary, fontSize: 12 }}>Creator ID: {item.creator_id}</Text>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>Last updated: {item.updated_at ? new Date(item.updated_at).toLocaleString() : '—'}</Text>
      <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>Verification provider</Text>
      <TextInput value={draft.provider} onChangeText={(v) => onDraft({ provider: v })} placeholder="e.g. approved identity verification provider" placeholderTextColor={colors.textSecondary} style={fieldStyle} />
      <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>Evidence reference</Text>
      <TextInput value={draft.reference} onChangeText={(v) => onDraft({ reference: v })} placeholder="External case/reference ID only — no BVN/NIN" placeholderTextColor={colors.textSecondary} style={fieldStyle} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>Place payout hold</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Keep withdrawals blocked while this hold is active.</Text>
        </View>
        <Switch value={draft.payoutHold} onValueChange={(value) => onDraft({ payoutHold: value })} trackColor={{ true: colors.primary }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity disabled={busy} onPress={() => onDecision('rejected')} accessibilityRole="button"
          style={{ flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.danger || '#D65A72', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.danger || '#D65A72', fontWeight: '900' }}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity disabled={busy || draft.provider.trim().length < 2 || draft.reference.trim().length < 3} onPress={() => onDecision('verified')} accessibilityRole="button"
          style={{ flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: busy || draft.provider.trim().length < 2 || draft.reference.trim().length < 3 ? 0.45 : 1 }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>Approve verification</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity disabled={busy} onPress={() => onDecision('pending')} accessibilityRole="button" style={{ alignItems: 'center', paddingVertical: 5 }}>
        <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Return to pending</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function LivePayoutReviewScreen({ navigation }) {
  const { colors, spacing, typography, layout } = useTheme();
  const [reviews, setReviews] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getLiveCreatorPayoutReviewQueue();
      const list = Array.isArray(result?.reviews) ? result.reviews : [];
      setReviews(list);
      setDrafts((current) => {
        const next = { ...current };
        list.forEach((item) => {
          if (!next[item.creator_id]) next[item.creator_id] = { provider: '', reference: '', payoutHold: item.payout_hold === true };
        });
        return next;
      });
    } catch (loadError) {
      setError(loadError?.message || 'The payout review queue could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); return undefined; }, [load]));

  const updateDraft = (creatorId, patch) => setDrafts((current) => ({
    ...current,
    [creatorId]: { ...(current[creatorId] || { provider: '', reference: '', payoutHold: false }), ...patch },
  }));

  const decide = (item, status) => {
    const draft = drafts[item.creator_id] || { provider: '', reference: '', payoutHold: false };
    if (status === 'verified' && (!draft.provider.trim() || !draft.reference.trim())) {
      setError('An approved verification requires an external provider and evidence reference.');
      return;
    }
    const title = status === 'verified' ? 'Approve creator verification?' : status === 'rejected' ? 'Reject creator verification?' : 'Return review to pending?';
    const detail = status === 'verified'
      ? 'Confirm that the identity check was completed through your approved provider and that the evidence reference points to the reviewed case. Do not enter BVN, NIN, passwords or identity documents here.'
      : status === 'rejected' ? 'This records a rejected verification decision and keeps payout eligibility blocked.' : 'This returns the creator to the pending review queue.';
    Alert.alert(title, detail, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', style: status === 'rejected' ? 'destructive' : 'default', onPress: async () => {
        setBusyId(item.creator_id);
        setError('');
        setNotice('');
        try {
          await reviewLiveCreatorPayoutProfile(item.creator_id, {
            verificationStatus: status,
            verificationProvider: status === 'verified' ? draft.provider.trim() : undefined,
            verificationReference: status === 'verified' ? draft.reference.trim() : undefined,
            payoutHold: draft.payoutHold || status !== 'verified',
          });
          setNotice('Review decision saved to the secure audit trail.');
          await load();
        } catch (saveError) {
          setError(saveError?.message || 'The review decision could not be saved.');
        } finally {
          setBusyId('');
        }
      } },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl || 32, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back" style={{ width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[typography.title, { color: colors.textPrimary, fontWeight: '900' }]}>Payout verification review</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Restricted operations · audited decisions</Text>
          </View>
          <TouchableOpacity onPress={load} accessibilityRole="button" accessibilityLabel="Refresh review queue" style={{ width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
            <Ionicons name="refresh" size={19} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={{ padding: 14, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
          <Text style={{ color: colors.textPrimary, fontWeight: '900' }}>Evidence handling</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 5 }]}>Use your approved identity-verification provider and internal review procedure. ZannyChat stores only the provider name and external evidence reference for an approval — never enter or upload BVN/NIN numbers, passwords, bank credentials or identity documents in this screen.</Text>
        </View>
        {error ? <Text accessibilityRole="alert" style={{ color: colors.danger || '#D65A72', fontWeight: '700' }}>{error}</Text> : null}
        {notice ? <Text style={{ color: colors.success || colors.primary, fontWeight: '700' }}>{notice}</Text> : null}
        {loading ? <View style={{ padding: 30, alignItems: 'center' }}><ActivityIndicator color={colors.primary} /><Text style={[typography.caption, { color: colors.textSecondary, marginTop: 10 }]}>Loading secure review queue…</Text></View>
          : reviews.length ? reviews.map((item) => <ReviewCard key={item.creator_id} item={item} colors={colors} typography={typography} draft={drafts[item.creator_id] || { provider: '', reference: '', payoutHold: false }} onDraft={(patch) => updateDraft(item.creator_id, patch)} onDecision={(status) => decide(item, status)} busy={busyId === item.creator_id} />)
            : <View style={{ padding: 22, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center' }}>
              <Ionicons name="shield-checkmark-outline" size={30} color={colors.primary} />
              <Text style={{ color: colors.textPrimary, fontWeight: '900', marginTop: 8 }}>No creator reviews pending</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: 5 }]}>The secure review queue is currently empty.</Text>
            </View>}
      </ScrollView>
    </SafeAreaView>
  );
}
