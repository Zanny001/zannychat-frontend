import {
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
} from 'expo-iap';

let connectionPromise = null;
let updateSubscription = null;
let errorSubscription = null;
let callbacks = { onPurchase: null, onError: null };

export async function connectLiveStoreBilling(nextCallbacks = {}) {
  callbacks = { ...callbacks, ...nextCallbacks };
  if (!updateSubscription) {
    updateSubscription = purchaseUpdatedListener((purchase) => {
      Promise.resolve(callbacks.onPurchase?.(purchase)).catch((error) => {
        callbacks.onError?.(error);
      });
    });
  }
  if (!errorSubscription) {
    errorSubscription = purchaseErrorListener((error) => {
      callbacks.onError?.(error);
    });
  }
  if (!connectionPromise) {
    connectionPromise = initConnection().then((connected) => {
      if (!connected) throw new Error('Google Play Billing could not connect.');
      return true;
    }).catch((error) => {
      connectionPromise = null;
      throw error;
    });
  }
  await connectionPromise;
  return true;
}

export async function fetchLiveStoreProducts(skus) {
  if (!connectionPromise) throw new Error('Google Play Billing is not connected.');
  const result = await fetchProducts({ skus, type: 'in-app' });
  if (Array.isArray(result)) return result;
  return Array.isArray(result?.products) ? result.products : [];
}

export async function requestLiveStorePurchase({ sku, obfuscatedAccountId }) {
  if (!connectionPromise) throw new Error('Google Play Billing is not connected.');
  if (typeof obfuscatedAccountId !== 'string' || obfuscatedAccountId.length < 32 || obfuscatedAccountId.length > 64) {
    throw new Error('Your secure store account link could not be prepared. Please refresh and try again.');
  }
  await requestPurchase({
    request: {
      google: {
        skus: [sku],
        obfuscatedAccountId,
      },
    },
    type: 'in-app',
  });
}

export async function finishLiveStorePurchase(purchase) {
  return finishTransaction({ purchase, isConsumable: true });
}

export async function recoverLiveStorePurchases() {
  if (!connectionPromise) return [];
  const purchases = await getAvailablePurchases();
  return Array.isArray(purchases) ? purchases : [];
}

export function clearLiveStoreBillingCallbacks() {
  callbacks = { onPurchase: null, onError: null };
}
