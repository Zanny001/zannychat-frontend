let activeVoipPushToken = null;

export function setActiveVoipPushToken(token) {
  activeVoipPushToken = typeof token === 'string' && token.length >= 16 ? token : null;
}

export function getActiveVoipPushToken() {
  return activeVoipPushToken;
}
