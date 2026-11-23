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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
      if (!connected) throw new Error('Apple In-App Purchase could not connect.');
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
  if (!connectionPromise) throw new Error('Apple In-App Purchase is not connected.');
  const result = await fetchProducts({ skus, type: 'in-app' });
  if (Array.isArray(result)) return result;
  return Array.isArray(result?.products) ? result.products : [];
}

export async function requestLiveStorePurchase({ sku, appAccountToken }) {
  if (!connectionPromise) throw new Error('Apple In-App Purchase is not connected.');
  if (typeof appAccountToken !== 'string' || !UUID_PATTERN.test(appAccountToken)) {
    throw new Error('Your secure Apple account link could not be prepared. Please refresh and try again.');
  }
  await requestPurchase({
    request: {
      apple: {
        sku,
        quantity: 1,
        appAccountToken,
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
  const purchases = await getAvailablePurchases({ onlyIncludeActiveItemsIOS: false });
  return Array.isArray(purchases) ? purchases : [];
}

export function clearLiveStoreBillingCallbacks() {
  callbacks = { onPurchase: null, onError: null };
}
