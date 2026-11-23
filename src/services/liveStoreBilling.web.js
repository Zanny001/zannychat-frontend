export async function connectLiveStoreBilling() {
  throw new Error('Native store billing is available only in the mobile app.');
}
export async function fetchLiveStoreProducts() { return []; }
export async function requestLiveStorePurchase() {
  throw new Error('Native store billing is available only in the mobile app.');
}
export async function finishLiveStorePurchase() {
  throw new Error('Native store billing is available only in the mobile app.');
}
export async function recoverLiveStorePurchases() { return []; }
export function clearLiveStoreBillingCallbacks() {}
