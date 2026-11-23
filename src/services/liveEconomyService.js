import { backendFetch } from './backendClient';

export function createLiveGiftIdempotencyKey() {
  return 'livegift-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 14);
}

export function getLiveGiftCatalog() {
  return backendFetch('/live/gifts/catalog');
}

export function getLiveGiftWallet() {
  return backendFetch('/live/gifts/wallet');
}

export function getLiveGiftStreamFeed(streamId) {
  return backendFetch('/live/gifts/stream/' + encodeURIComponent(streamId) + '/recent');
}

export function getLiveGiftHistory(limit = 12) {
  return backendFetch('/live/gifts/history?limit=' + encodeURIComponent(String(limit)));
}

export function sendLiveGift({ streamId, recipientId, giftId, quantity = 1, idempotencyKey = createLiveGiftIdempotencyKey() }) {
  return backendFetch('/live/gifts/send', {
    method: 'POST',
    body: JSON.stringify({
      streamId,
      recipientId,
      giftId,
      quantity,
      idempotencyKey,
    }),
  });
}

export function getLiveTranslationStatus() {
  return backendFetch('/live/captions/status');
}

export function translateLiveTextSegment({ streamId, text, targetLanguage }) {
  return backendFetch('/live/captions/translate', {
    method: 'POST',
    body: JSON.stringify({ streamId, text, targetLanguage }),
  });
}

export function getCurrentLiveBattle(streamId) {
  return backendFetch('/live/battles/stream/' + encodeURIComponent(streamId) + '/current');
}

export function getLiveBattle(battleId) {
  return backendFetch('/live/battles/' + encodeURIComponent(battleId));
}

export function createLiveBattle({ streamId, opponentId, durationSeconds = 300 }) {
  return backendFetch('/live/battles', {
    method: 'POST',
    body: JSON.stringify({ streamId, opponentId, durationSeconds }),
  });
}


export function acceptLiveBattle(battleId) {
  return backendFetch('/live/battles/' + encodeURIComponent(battleId) + '/accept', { method: 'POST' });
}

export function declineLiveBattle(battleId) {
  return backendFetch('/live/battles/' + encodeURIComponent(battleId) + '/decline', { method: 'POST' });
}

export function startLiveBattle(battleId) {
  return backendFetch('/live/battles/' + encodeURIComponent(battleId) + '/start', { method: 'POST' });
}

export function finishLiveBattle(battleId) {
  return backendFetch('/live/battles/' + encodeURIComponent(battleId) + '/finish', { method: 'POST' });
}

export function getLivePurchasePackages() {
  return backendFetch('/live/purchases/packages');
}

export function getLivePurchaseHistory() {
  return backendFetch('/live/purchases/history');
}

export function initializeLivePurchase(packageId) {
  return backendFetch('/live/purchases/initialize', {
    method: 'POST',
    body: JSON.stringify({ packageId }),
  });
}

export function getLivePurchaseStatus(purchaseId) {
  return backendFetch('/live/purchases/' + encodeURIComponent(purchaseId));
}

export function getLiveCreatorEarningsSummary() {
  return backendFetch('/live/creator-earnings/summary');
}

export function getLiveCreatorEarningsHistory() {
  return backendFetch('/live/creator-earnings/history');
}

export function getLiveCreatorPayoutEligibility() {
  return backendFetch('/live/creator-payouts/eligibility');
}

export function getLiveCreatorPayoutBanks() {
  return backendFetch('/live/creator-payouts/banks');
}

export function getLiveCreatorPayoutBeneficiaries() {
  return backendFetch('/live/creator-payouts/beneficiaries');
}

export function addLiveCreatorPayoutBeneficiary({ bankCode, accountNumber }) {
  return backendFetch('/live/creator-payouts/beneficiaries', {
    method: 'POST',
    body: JSON.stringify({ bankCode, accountNumber }),
  });
}

export function disableLiveCreatorPayoutBeneficiary(beneficiaryId) {
  return backendFetch('/live/creator-payouts/beneficiaries/' + encodeURIComponent(beneficiaryId), { method: 'DELETE' });
}

export function requestLiveCreatorPayout({ beneficiaryId, amountMinor }) {
  return backendFetch('/live/creator-payouts/request', {
    method: 'POST',
    body: JSON.stringify({ beneficiaryId, amountMinor }),
  });
}

export function getLiveCreatorPayoutHistory() {
  return backendFetch('/live/creator-payouts/history');
}
