import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import {
  getLiveSparkCatalogueAdminPackages,
  createLiveSparkCatalogueDraft,
  setLiveSparkCataloguePackageActive,
} from '../services/liveEconomyService';

const PROVIDERS = [
  { id: 'paystack', label: 'Paystack' },
  { id: 'google_play', label: 'Google Play' },
  { id: 'apple_iap', label: 'Apple IAP' },
];
function naira(minor) {
  const value = Number(minor);
  if (!Number.isSafeInteger(value) || value < 0) return '—';
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(value / 100);
}

export default function LiveSparkCatalogueAdminScreen({ navigation }) {
  const { colors, spacing, typography, layout } = useTheme();
  const [packages, setPackages] = useState([]);
  const [provider, setProvider] = useState('paystack');
  const [packageId, setPackageId] = useState('');
  const [sparks, setSparks] = useState('');
  const [amount, setAmount] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await getLiveSparkCatalogueAdminPackages();
      setPackages(Array.isArray(result?.packages) ? result.packages : []);
    } catch (e) {
      setError(e?.message || 'The Sparks catalogue could not be loaded.');
    } finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); return undefined; }, [load]));

  const createDraft = async () => {
    const count = Number(sparks);
    const amountMinor = Math.round(Number(amount) * 100);
    const order = Number(sortOrder);
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{1,149}$/.test(packageId.trim())
        || !/^\d+$/.test(sparks) || !Number.isSafeInteger(count) || count < 1 || count > 10000000
        || !/^\d+(\.\d{1,2})?$/.test(amount) || !Number.isSafeInteger(amountMinor) || amountMinor < 1
        || !/^\d+$/.test(sortOrder) || !Number.isSafeInteger(order) || order > 100000) {
      setError('Enter the exact store product ID, a valid Sparks quantity, an approved NGN price and a valid sort order.');
      return;
    }
    setSaving(true); setError(''); setNotice('');
    try {
      await createLiveSparkCatalogueDraft({
        provider, packageId: packageId.trim(), sparks: count, amountMinor, sortOrder: order,
      });
      setPackageId(''); setSparks(''); setAmount(''); setSortOrder('0');
      setNotice('Inactive package draft saved. It is not purchasable until explicitly activated.');
      await load();
    } catch (e) { setError(e?.message || 'Could not create this inactive package draft.'); }
    finally { setSaving(false); }
  };

  const changeState = (item, active) => Alert.alert(
    active ? 'Activate Sparks package?' : 'Deactivate Sparks package?',
    active
      ? 'This publishes the exact provider product ID, Sparks quantity and NGN amount to eligible buyers. Confirm that the product exists in the provider console and the amount matches its verified price.'
      : 'This removes the package from new purchase catalogues. Existing paid purchases and wallet balances are not changed.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: active ? 'Activate package' : 'Deactivate package', style: active ? 'destructive' : 'default', onPress: async () => {
        setSaving(true); setError(''); setNotice('');
        try {
          await setLiveSparkCataloguePackageActive(item.provider, item.package_id, active);
          setNotice(active ? 'Package activated and audit recorded.' : 'Package deactivated and audit recorded.');
          await load();
        } catch (e) { setError(e?.message || 'Could not update the package.'); }
        finally { setSaving(false); }
      } },
    ],
  );

  const field = { minHeight: 46, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, color: colors.textPrimary, backgroundColor: colors.background };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl || 32, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back" style={{ width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[typography.title, { color: colors.textPrimary, fontWeight: '900' }]}>Sparks catalogue</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Restricted store configuration · NGN</Text>
          </View>
          <TouchableOpacity onPress={load} accessibilityRole="button" accessibilityLabel="Refresh Sparks catalogue" style={{ width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
            <Ionicons name="refresh" size={19} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, backgroundColor: colors.surface, gap: 9 }}>
          <Text style={{ color: colors.textPrimary, fontWeight: '900', fontSize: 16 }}>Create inactive package</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Use the exact product ID and price approved in the relevant provider console. Google Play and Apple prices must match server-side store verification. No sample SKUs or default prices are supplied.</Text>
          <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>Payment provider</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
            {PROVIDERS.map((item) => (
              <TouchableOpacity key={item.id} onPress={() => setProvider(item.id)} accessibilityRole="radio" accessibilityState={{ checked: provider === item.id }} style={{ minHeight: 40, paddingHorizontal: 12, borderRadius: 11, borderWidth: 1, borderColor: provider === item.id ? colors.primary : colors.border, backgroundColor: provider === item.id ? colors.primary + '18' : colors.background, justifyContent: 'center' }}>
                <Text style={{ color: provider === item.id ? colors.primary : colors.textSecondary, fontWeight: '800' }}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>Exact provider product ID</Text>
          <TextInput value={packageId} onChangeText={setPackageId} accessibilityRole="text" accessibilityLabel="Exact provider product ID" autoCapitalize="none" placeholder="Enter approved product ID" placeholderTextColor={colors.textSecondary} style={field} />
          <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>Sparks quantity</Text>
          <TextInput value={sparks} onChangeText={setSparks} accessibilityRole="text" accessibilityLabel="Sparks quantity" keyboardType="number-pad" placeholder="Approved Sparks amount" placeholderTextColor={colors.textSecondary} style={field} />
          <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>Price (NGN)</Text>
          <TextInput value={amount} onChangeText={setAmount} accessibilityRole="text" accessibilityLabel="Price in Nigerian naira" keyboardType="decimal-pad" placeholder="Approved NGN price" placeholderTextColor={colors.textSecondary} style={field} />
          <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>Display order</Text>
          <TextInput value={sortOrder} onChangeText={setSortOrder} accessibilityRole="text" accessibilityLabel="Display order" keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.textSecondary} style={field} />
          <TouchableOpacity disabled={saving} onPress={createDraft} accessibilityRole="button" accessibilityLabel="Save inactive Sparks package" style={{ minHeight: 47, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: saving ? 0.5 : 1 }}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>Save inactive draft</Text>}
          </TouchableOpacity>
        </View>

        {error ? <Text accessibilityRole="alert" style={{ color: colors.danger || '#D65A72', fontWeight: '800' }}>{error}</Text> : null}
        {notice ? <Text style={{ color: colors.success || colors.primary, fontWeight: '800' }}>{notice}</Text> : null}
        <View style={{ gap: 9 }}>
          <Text style={[typography.heading, { color: colors.textPrimary, fontWeight: '900' }]}>Provider catalogue</Text>
          {loading ? <ActivityIndicator color={colors.primary} /> : packages.length === 0
            ? <Text style={{ color: colors.textSecondary }}>No Sparks packages configured. Nothing is currently purchasable.</Text>
            : packages.map((item) => (
              <View key={item.provider + ':' + item.package_id} style={{ borderRadius: 15, borderWidth: 1, borderColor: item.is_active ? colors.primary : colors.border, backgroundColor: colors.surface, padding: 14, gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: '900', flex: 1 }}>{item.package_id}</Text>
                  <Text style={{ color: item.is_active ? colors.primary : colors.textSecondary, fontWeight: '900', fontSize: 11 }}>{item.is_active ? 'ACTIVE' : 'INACTIVE'}</Text>
                </View>
                <Text style={{ color: colors.textSecondary }}>{PROVIDERS.find((p) => p.id === item.provider)?.label || item.provider} · {Number(item.sparks).toLocaleString()} Sparks · {naira(item.amount_minor)}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Updated: {item.updated_at ? new Date(item.updated_at).toLocaleString() : '—'}</Text>
                <TouchableOpacity disabled={saving} onPress={() => changeState(item, !item.is_active)} accessibilityRole="button" accessibilityLabel={(item.is_active ? 'Deactivate ' : 'Activate ') + item.package_id} style={{ minHeight: 42, borderRadius: 11, borderWidth: 1, borderColor: item.is_active ? (colors.danger || '#D65A72') : colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
                  <Text style={{ color: item.is_active ? (colors.danger || '#D65A72') : colors.primary, fontWeight: '900' }}>{item.is_active ? 'Deactivate package' : 'Review and activate'}</Text>
                </TouchableOpacity>
              </View>
            ))}
        </View>
        <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>All package changes are server-side, restricted to the LIVE economy admin allowlist and recorded in an append-only audit trail.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
