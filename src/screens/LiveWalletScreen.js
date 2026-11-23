import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import {
  getLiveGiftHistory,
  getLiveGiftWallet,
  getLivePurchaseHistory,
  getLivePurchaseReceipt,
  getLivePurchasePackages,
  initializeLivePurchase,
  getLiveStoreAccountBinding,
  verifyLiveNativePurchase,
} from '../services/liveEconomyService';
import {
  connectLiveStoreBilling,
  fetchLiveStoreProducts,
  requestLiveStorePurchase,
  finishLiveStorePurchase,
  recoverLiveStorePurchases,
  clearLiveStoreBillingCallbacks,
} from '../services/liveStoreBilling';

function formatNaira(amountMinor) {
  const amount = Number(amountMinor);
  if (!Number.isSafeInteger(amount) || amount < 0) return 'Price unavailable';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 2,
  }).format(amount / 100);
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

function Surface({ children, colors, style }) {
  return (
    <View style={[{
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 20,
      padding: 16,
    }, style]}>
      {children}
    </View>
  );
}

export default function LiveWalletScreen({ navigation }) {
  const { colors, spacing, typography, layout } = useTheme();
  const [wallet, setWallet] = useState(null);
  const [packages, setPackages] = useState([]);
  const [backendPurchasable, setBackendPurchasable] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [giftHistory, setGiftHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyPackage, setBusyPackage] = useState('');
  const [busyReceipt, setBusyReceipt] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [storeConnected, setStoreConnected] = useState(false);
  const [storeProducts, setStoreProducts] = useState([]);
  const [obfuscatedAccountId, setObfuscatedAccountId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    // Fail closed: a failed catalogue refresh must never leave stale packages
    // or a previously enabled checkout action visible.
    setBackendPurchasable(false);
    setPackages([]);
    const results = await Promise.allSettled([
      getLiveGiftWallet(),
      getLivePurchasePackages(Platform.OS === 'android' ? 'google_play' : 'paystack'),
      getLivePurchaseHistory(),
      getLiveGiftHistory(12),
    ]);
    if (results[0].status === 'fulfilled') setWallet(results[0].value);
    if (results[1].status === 'fulfilled') {
      setPackages(Array.isArray(results[1].value?.packages) ? results[1].value.packages : []);
      setBackendPurchasable(Boolean(results[1].value?.purchasable));
    }
    if (results[2].status === 'fulfilled') setPurchaseHistory(Array.isArray(results[2].value?.purchases) ? results[2].value.purchases : []);
    if (results[3].status === 'fulfilled') setGiftHistory(Array.isArray(results[3].value?.entries) ? results[3].value.entries : []);
    const failed = results.find((item) => item.status === 'rejected');
    if (failed) setError(failed.reason?.message || 'Some wallet information could not be loaded.');
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => {
    load();
    return undefined;
  }, [load]));

  const handleNativePurchase = useCallback(async (purchase) => {
    const packageId = String(purchase?.productId || '');
    const purchaseToken = String(purchase?.purchaseToken || '');
    if (!packageId || !purchaseToken) {
      setError('Google Play returned incomplete purchase evidence. Your transaction has not been finalized.');
      return;
    }
    if (!packages.some((item) => item.package_id === packageId)) {
      setError('This Google Play product is not in the active ZannyChat Sparks catalogue.');
      return;
    }
    try {
      const verified = await verifyLiveNativePurchase({ packageId, purchaseToken });
      if (!verified?.verified || !verified?.credited) {
        throw new Error('ZannyChat could not verify this purchase. No Sparks were added.');
      }
      try {
        await finishLiveStorePurchase(purchase);
        setNotice(Number(verified.sparks).toLocaleString() + ' Sparks were verified and added to your wallet.');
      } catch (_) {
        setNotice('Your Sparks were verified and added. Google Play transaction finalization is pending; refresh this wallet to retry safely.');
      }
      await load();
    } catch (purchaseError) {
      setError(purchaseError?.message || 'Google Play could not verify this purchase. Your transaction remains available for a safe retry.');
    } finally {
      setBusyPackage('');
    }
  }, [packages, load]);

  const packageSkus = packages.map((item) => item.package_id).join('|');

  useEffect(() => {
    if (Platform.OS !== 'android' || !backendPurchasable || !packageSkus) return undefined;
    let active = true;
    (async () => {
      const binding = await getLiveStoreAccountBinding();
      if (!binding?.obfuscatedAccountId) throw new Error('Secure store account binding is unavailable.');
      if (!active) return;
      setObfuscatedAccountId(binding.obfuscatedAccountId);
      await connectLiveStoreBilling({
        onPurchase: handleNativePurchase,
        onError: (storeError) => {
          setBusyPackage('');
          if (storeError?.code === 'user-cancelled') return;
          setError(storeError?.message || 'Google Play Billing reported a purchase error.');
        },
      });
      if (!active) return;
      setStoreConnected(true);
      const products = await fetchLiveStoreProducts(packageSkus.split('|'));
      if (!active) return;
      setStoreProducts(products);
      const pendingPurchases = await recoverLiveStorePurchases();
      for (const pendingPurchase of pendingPurchases) {
        if (!active) break;
        await handleNativePurchase(pendingPurchase);
      }
    })().catch((storeError) => {
      if (!active) return;
      setStoreConnected(false);
      setError(storeError?.message || 'Google Play Billing is not available on this device.');
    });
    return () => {
      active = false;
      clearLiveStoreBillingCallbacks();
    };
  }, [backendPurchasable, packageSkus, handleNativePurchase]);

  const buyPackage = async (packageId) => {
    if (!canPurchase || busyPackage) return;
    setBusyPackage(packageId);
    setError('');
    setNotice('');
    try {
      if (Platform.OS === 'android') {
        await requestLiveStorePurchase({ sku: packageId, obfuscatedAccountId });
        setNotice('Google Play checkout opened. Sparks are added only after ZannyChat verifies the completed store transaction.');
      } else {
        const result = await initializeLivePurchase(packageId);
        if (!result?.checkoutUrl || !/^https:\/\//i.test(result.checkoutUrl)) {
          throw new Error('The payment provider did not return a secure checkout link.');
        }
        await Linking.openURL(result.checkoutUrl);
        setNotice('Checkout opened. Sparks are credited only after the payment provider confirms your payment.');
        await load();
      }
    } catch (purchaseError) {
      setBusyPackage('');
      setError(purchaseError?.message || 'Could not start the secure purchase.');
    } finally {
      if (Platform.OS !== 'android') setBusyPackage('');
    }
  };

  const openReceipt = async (purchaseId) => {
    if (busyReceipt) return;
    setBusyReceipt(purchaseId);
    setError('');
    setNotice('');
    try {
      const result = await getLivePurchaseReceipt(purchaseId);
      if (!result?.downloadUrl || !/^https:\/\//i.test(result.downloadUrl)) {
        throw new Error('A secure receipt link is not available yet.');
      }
      await Linking.openURL(result.downloadUrl);
      setNotice('Receipt ' + (result.receiptNumber || '') + ' opened. The secure link expires shortly.');
    } catch (receiptError) {
      setError(receiptError?.message || 'Could not open the purchase receipt.');
    } finally {
      setBusyReceipt('');
    }
  };

  const canPurchase = backendPurchasable && (Platform.OS === 'web' || (Platform.OS === 'android' && storeConnected && Boolean(obfuscatedAccountId)));
  const purchased = Number(wallet?.purchasedSparks || 0);
  const promotional = Number(wallet?.promotionalSparks || 0);
  const legacy = Number(wallet?.legacySparks || 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl || 32, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back"
            style={{ width: 44, height: 44, borderRadius: 15, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[typography.title, { color: colors.textPrimary, fontWeight: '900' }]}>Sparks Wallet</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Your LIVE gift balance and purchase history</Text>
          </View>
          <TouchableOpacity onPress={load} accessibilityRole="button" accessibilityLabel="Refresh wallet"
            style={{ width: 44, height: 44, borderRadius: 15, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
            <Ionicons name="refresh" size={19} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <Surface colors={colors} style={{ overflow: 'hidden', borderColor: colors.gold || colors.primary }}>
          <View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, right: -70, top: -90, backgroundColor: colors.primary, opacity: 0.12 }} />
          <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '800', letterSpacing: 1.4 }]}>AVAILABLE TO SEND</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <Ionicons name="flash" size={27} color={colors.gold || colors.primary} />
            <Text style={{ color: colors.textPrimary, fontSize: 38, fontWeight: '900', letterSpacing: -1 }}>
              {loading && !wallet ? '—' : Number(wallet?.balanceSparks || 0).toLocaleString()}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 15, fontWeight: '800' }}>Sparks</Text>
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 8 }]}>
            Sparks are ZannyChat virtual gifts currency. They have no cash value and cannot be withdrawn.
          </Text>
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 14 }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { label: 'Purchased', value: purchased, icon: 'card-outline' },
              { label: 'Promotional', value: promotional, icon: 'gift-outline' },
              { label: 'Legacy', value: legacy, icon: 'sparkles-outline' },
            ].map((item) => (
              <View key={item.label} style={{ flex: 1, minWidth: 0 }}>
                <Ionicons name={item.icon} size={16} color={colors.primary} />
                <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '900', marginTop: 6 }}>{item.value.toLocaleString()}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>{item.label}</Text>
              </View>
            ))}
          </View>
        </Surface>

        <TouchableOpacity onPress={() => navigation.navigate('LiveCreatorEarnings')} accessibilityRole="button" accessibilityLabel="Open creator earnings"
          style={{ minHeight: 54, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="trending-up-outline" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textPrimary, fontWeight: '900' }}>Creator Earnings</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Separate cash rewards and payout history</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={{ gap: 8 }}>
          <Text style={[typography.heading, { color: colors.textPrimary, fontWeight: '900' }]}>Sparks Store</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Choose a package. The price and Sparks amount come directly from ZannyChat's server catalogue.</Text>
          {!backendPurchasable ? (
            <Surface colors={colors}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: '900' }}>Purchases are not active yet</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
                    Secure checkout will appear when payment onboarding, package prices and webhook verification are configured. No payment can be taken right now.
                  </Text>
                </View>
              </View>
            </Surface>
          ) : Platform.OS === 'ios' ? (
            <Surface colors={colors}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: '900' }}>Apple billing is being prepared</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>Sparks are digital currency. iPhone purchases will use Apple In-App Purchase after StoreKit transaction verification and App Store product setup are complete. External Paystack checkout is not offered inside the mobile app.</Text>
                </View>
              </View>
            </Surface>
          ) : Platform.OS === 'android' && !storeConnected ? (
            <Surface colors={colors}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: '900' }}>Connecting to Google Play Billing</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>Purchases remain disabled until the store connection and server verification are ready.</Text>
                </View>
              </View>
            </Surface>
          ) : packages.length === 0 ? (
            <Surface colors={colors}>
              <Text style={{ color: colors.textSecondary }}>No Sparks packages are currently available.</Text>
            </Surface>
          ) : packages.map((item) => (
            <Surface key={item.package_id} colors={colors} style={{ padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary + '20' }}>
                  <Ionicons name="flash" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '900' }}>{Number(item.sparks).toLocaleString()} Sparks</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>{Platform.OS === 'android' ? (storeProducts.find((product) => product.id === item.package_id)?.displayPrice || formatNaira(item.amount_minor)) : formatNaira(item.amount_minor)}</Text>
                </View>
                <TouchableOpacity onPress={() => buyPackage(item.package_id)} disabled={!canPurchase || Boolean(busyPackage) || (Platform.OS === 'android' && !storeProducts.some((product) => product.id === item.package_id))}
                  accessibilityRole="button" accessibilityLabel={'Buy ' + item.sparks + ' Sparks'}
                  style={{ minWidth: 92, minHeight: 42, paddingHorizontal: 14, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, opacity: busyPackage && busyPackage !== item.package_id ? 0.55 : 1 }}>
                  {busyPackage === item.package_id ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>Buy</Text>}
                </TouchableOpacity>
              </View>
            </Surface>
          ))}
        </View>

        {error ? <Surface colors={colors} style={{ borderColor: colors.danger || '#D65A72' }}>
          <Text style={{ color: colors.danger || '#D65A72', fontWeight: '800' }}>{error}</Text>
        </Surface> : null}
        {notice ? <Surface colors={colors}>
          <Text style={{ color: colors.success || colors.primary, fontWeight: '700' }}>{notice}</Text>
        </Surface> : null}

        <View style={{ gap: 8 }}>
          <Text style={[typography.heading, { color: colors.textPrimary, fontWeight: '900' }]}>Purchase history</Text>
          {loading ? <ActivityIndicator color={colors.primary} /> : purchaseHistory.length === 0 ? (
            <Surface colors={colors}><Text style={{ color: colors.textSecondary }}>No purchases recorded yet.</Text></Surface>
          ) : purchaseHistory.map((item) => (
            <Surface key={item.id} colors={colors} style={{ padding: 13 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>{Number(item.sparks).toLocaleString()} Sparks</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>{formatDate(item.created_at)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>{formatNaira(item.amount_minor)}</Text>
                  <Text style={[typography.caption, { color: item.status === 'paid' ? (colors.success || colors.primary) : colors.textSecondary, marginTop: 3 }]}>{item.status.toUpperCase()}</Text>
                </View>
              </View>
              {item.receiptAvailable ? (
                <TouchableOpacity onPress={() => openReceipt(item.id)} disabled={Boolean(busyReceipt)}
                  accessibilityRole="button" accessibilityLabel={'Open receipt for ' + Number(item.sparks).toLocaleString() + ' Sparks'}
                  style={{ marginTop: 12, minHeight: 40, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {busyReceipt === item.id ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="document-text-outline" size={17} color={colors.primary} />}
                  <Text style={{ color: colors.primary, fontWeight: '800' }}>View receipt {item.receiptNumber ? '· ' + item.receiptNumber : ''}</Text>
                </TouchableOpacity>
              ) : item.status === 'paid' ? (
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 10 }]}>Your verified receipt is being prepared.</Text>
              ) : null}
            </Surface>
          ))}
        </View>

        <View style={{ gap: 8 }}>
          <Text style={[typography.heading, { color: colors.textPrimary, fontWeight: '900' }]}>Gift spending</Text>
          {giftHistory.length === 0 ? (
            <Surface colors={colors}><Text style={{ color: colors.textSecondary }}>Your confirmed LIVE gift transactions will appear here.</Text></Surface>
          ) : giftHistory.map((item) => (
            <Surface key={item.id} colors={colors} style={{ padding: 13 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>{item.entry_type === 'spend' ? 'LIVE gift sent' : 'Sparks ' + item.entry_type}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>{formatDate(item.created_at)}</Text>
                </View>
                <Text style={{ color: colors.textPrimary, fontWeight: '900' }}>{item.entry_type === 'spend' ? '−' : '+'}{Number(item.amount_sparks).toLocaleString()} Sparks</Text>
              </View>
            </Surface>
          ))}
        </View>
        <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>Creator cash earnings and withdrawals are tracked separately from Sparks and are not enabled until payout verification is complete.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
