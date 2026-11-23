import { backendFetch } from './backendClient';

function makeIdempotencyKey() {
  return 'livegift-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 14);
}

export function getLiveGiftCatalog() {
  return backendFetch('/live/gifts/catalog');
}

export function getLiveGiftWallet() {
  return backendFetch('/live/gifts/wallet');
}

export function getLiveGiftHistory(limit = 12) {
  return backendFetch('/live/gifts/history?limit=' + encodeURIComponent(String(limit)));
}

export function sendLiveGift({ streamId, recipientId, giftId, quantity = 1, battleId = null }) {
  return backendFetch('/live/gifts/send', {
    method: 'POST',
    body: JSON.stringify({
      streamId,
      recipientId,
      giftId,
      quantity,
      battleId,
      idempotencyKey: makeIdempotencyKey(),
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
