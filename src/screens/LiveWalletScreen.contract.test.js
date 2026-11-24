import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./LiveWalletScreen.js', import.meta.url), 'utf8');
const service = fs.readFileSync(new URL('../services/liveEconomyService.js', import.meta.url), 'utf8');
const hub = fs.readFileSync(new URL('./LiveHubScreen.js', import.meta.url), 'utf8');
const navigator = fs.readFileSync(new URL('../navigation/AppNavigator.js', import.meta.url), 'utf8');

test('Sparks wallet renders real server-backed balances, package catalogue and purchase history', () => {
  assert.ok(screen.includes('getLiveGiftWallet()'));
  assert.ok(screen.includes('getLivePurchasePackages(Platform.OS'));
  assert.ok(screen.includes('getLivePurchaseHistory()'));
  assert.ok(screen.includes('getLiveGiftHistory(12)'));
  assert.ok(screen.includes('purchasedSparks'));
  assert.ok(screen.includes('promotionalSparks'));
  assert.ok(screen.includes('legacySparks'));
  assert.ok(screen.includes('item.amount_minor'));
  assert.ok(screen.includes('item.status.toUpperCase()'));
});

test('Sparks wallet explains the server catalogue readiness reason without enabling checkout', () => {
  assert.ok(screen.includes("const [catalogueReason, setCatalogueReason] = useState('CATALOGUE_LOADING')"));
  assert.ok(screen.includes("setCatalogueReason(results[1].value?.reason || null)"));
  assert.ok(screen.includes("setCatalogueReason('CATALOGUE_UNAVAILABLE')"));
  assert.ok(screen.includes("'NO_ACTIVE_PACKAGES'"));
  assert.ok(screen.includes("'PROVIDER_NOT_CONFIGURED'"));
  assert.ok(screen.includes("'CATALOGUE_UNAVAILABLE'"));
  assert.ok(screen.includes('checkout remains disabled'));
  assert.ok(screen.includes('setBackendPurchasable(false)'));
});

test('Sparks purchase UI stays disabled until server configuration and a real package exist', () => {
  assert.ok(screen.includes('!backendPurchasable'));
  assert.ok(screen.includes("Platform.OS === 'web' || (Platform.OS === 'android'"));
  assert.ok(screen.includes("Platform.OS === 'ios'"));
  assert.ok(screen.includes('Purchases are not active yet'));
  assert.ok(screen.includes('No payment can be taken right now.'));
  assert.ok(screen.includes('Connecting to native store billing'));
  assert.ok(screen.includes('getLiveAppleStoreAccountBinding()'));
  assert.ok(screen.includes('verifyLiveApplePurchase({ signedTransaction: purchaseToken })'));
  assert.ok(screen.includes('appAccountToken'));
  assert.ok(screen.includes('initializeLivePurchase(packageId)'));
  assert.ok(screen.includes('Linking.openURL(result.checkoutUrl)'));
  assert.ok(screen.includes('credited only after the payment provider confirms'));
});

test('Sparks wallet service uses authenticated backend endpoints, not client-side balance mutation', () => {
  assert.ok(service.includes("backendFetch('/live/purchases/packages?provider='"));
  assert.ok(service.includes("backendFetch('/live/purchases/history')"));
  assert.ok(service.includes("backendFetch('/live/purchases/initialize'"));
  assert.ok(service.includes('JSON.stringify({ packageId })'));
  assert.ok(!service.includes('grantLiveSparks'));
});

test('Sparks wallet is reachable from LIVE hub navigation', () => {
  assert.ok(hub.includes("navigation.navigate('LiveWallet')"));
  assert.ok(navigator.includes("import LiveWalletScreen from '../screens/LiveWalletScreen'"));
  assert.ok(navigator.includes("name=\"LiveWallet\" component={LiveWalletRoute}"));
});

test('creator earnings dashboard is separately reachable from Sparks wallet and backed by ledger APIs', () => {
  assert.ok(screen.includes("navigation.navigate('LiveCreatorEarnings')"));
  assert.ok(service.includes("backendFetch('/live/creator-earnings/summary')"));
  assert.ok(service.includes("backendFetch('/live/creator-earnings/history')"));
  const earnings = fs.readFileSync(new URL('./LiveCreatorEarningsScreen.js', import.meta.url), 'utf8');
  assert.ok(earnings.includes('getLiveCreatorEarningsSummary()'));
  assert.ok(earnings.includes('getLiveCreatorEarningsHistory()'));
  assert.ok(earnings.includes('availableMinor'));
  assert.ok(earnings.includes('pendingMinor'));
  assert.ok(earnings.includes('earningEnabled'));
  assert.ok(earnings.includes('identity verification'));
  assert.ok(navigator.includes("name=\"LiveCreatorEarnings\" component={LiveCreatorEarningsRoute}"));
});

test('creator payout screen uses server verification and never stores full bank account details', () => {
  const payout = fs.readFileSync(new URL('./LiveCreatorPayoutScreen.js', import.meta.url), 'utf8');
  assert.ok(payout.includes('getLiveCreatorPayoutEligibility()'));
  assert.ok(payout.includes('getLiveCreatorPayoutBanks()'));
  assert.ok(payout.includes('getLiveCreatorPayoutBeneficiaries()'));
  assert.ok(payout.includes('requestLiveCreatorPayout({ beneficiaryId: selectedBeneficiaryId, amountMinor })'));
  assert.ok(payout.includes(String.raw`value.replace(/\D/g, '').slice(0, 10)`) && payout.includes('not stored by ZannyChat'));
  assert.ok(payout.includes('PAYOUT_KYC_REQUIRED'));
  assert.ok(payout.includes('PAYOUT_FEE_POLICY_REQUIRED'));
  assert.ok(payout.includes('No withdrawal can be submitted.'));
  const earningsScreen = fs.readFileSync(new URL('./LiveCreatorEarningsScreen.js', import.meta.url), 'utf8');
  assert.ok(earningsScreen.includes("navigation.navigate('LiveCreatorPayout')"));
  assert.ok(navigator.includes("name=\"LiveCreatorPayout\" component={LiveCreatorPayoutRoute}"));
});

test('verified purchase receipts are owner-scoped, short-lived and accessible from purchase history', () => {
  assert.ok(screen.includes('getLivePurchaseReceipt'));
  assert.ok(screen.includes('item.receiptAvailable'));
  assert.ok(screen.includes('openReceipt(item.id)'));
  assert.ok(screen.includes('View receipt'));
  assert.ok(service.includes("backendFetch('/live/purchases/' + encodeURIComponent(purchaseId) + '/receipt')"));
});

test('a failed catalogue refresh clears stale purchase availability and packages', () => {
  const start = screen.indexOf('const load = useCallback');
  const end = screen.indexOf('useFocusEffect(useCallback', start);
  const load = screen.slice(start, end);
  assert.ok(load.includes('setBackendPurchasable(false)'));
  assert.ok(load.includes('setPackages([])'));
  assert.ok(load.indexOf('setBackendPurchasable(false)') < load.indexOf('Promise.allSettled'));
});

test('Android Sparks store purchases are linked to the signed-in account and verified before finishing', () => {
  const android = fs.readFileSync(new URL('../services/liveStoreBilling.android.js', import.meta.url), 'utf8');
  assert.ok(screen.includes('getLiveStoreAccountBinding()'));
  assert.ok(screen.includes('verifyLiveNativePurchase({ packageId, purchaseToken })'));
  assert.ok(screen.indexOf('verifyLiveNativePurchase({ packageId, purchaseToken })') < screen.indexOf('finishLiveStorePurchase(purchase)'));
  assert.ok(screen.includes('recoverLiveStorePurchases()'));
  assert.ok(android.includes('obfuscatedAccountId'));
  assert.ok(android.includes('getAvailablePurchases()'));
  assert.ok(android.includes('finishTransaction({ purchase, isConsumable: true })'));
  assert.ok(android.includes('purchaseUpdatedListener'));
  assert.ok(android.includes('purchaseErrorListener'));
});

test('native purchase APIs use the authenticated backend and platform-specific store catalogue', () => {
  assert.ok(service.includes('/live/purchases/native/account-binding'));
  assert.ok(service.includes('/live/purchases/native/verify'));
  assert.ok(screen.includes("Platform.OS === 'android' ? 'google_play' : (Platform.OS === 'ios' ? 'apple_iap' : 'paystack')"));
  assert.ok(screen.includes("(Platform.OS === 'android' || Platform.OS === 'ios') ? (storeProducts.find"));
});


test('iOS Sparks purchases use StoreKit signed transactions and account binding before finalization', () => {
  const ios = fs.readFileSync(new URL('../services/liveStoreBilling.ios.js', import.meta.url), 'utf8');
  assert.ok(ios.includes("apple: {"));
  assert.ok(ios.includes('appAccountToken'));
  assert.ok(screen.includes('purchase?.purchaseToken') || screen.includes('purchaseToken = String(purchase?.purchaseToken'));
  assert.ok(ios.includes('finishTransaction({ purchase, isConsumable: true })'));
  assert.ok(ios.includes('purchaseUpdatedListener'));
  assert.ok(ios.includes('purchaseErrorListener'));
  assert.ok(ios.includes('getAvailablePurchases'));
  assert.ok(service.includes('/live/purchases/apple/account-binding'));
  assert.ok(service.includes('/live/purchases/apple/verify'));
  assert.ok(screen.indexOf('verifyLiveApplePurchase({ signedTransaction: purchaseToken })') < screen.indexOf('finishLiveStorePurchase(purchase)'));
});
