let activeVoipPushToken = null;

export function setActiveVoipPushToken(token) {
  activeVoipPushToken = typeof token === 'string' && token.length >= 16 ? token : null;
}

export function getActiveVoipPushToken() {
  return activeVoipPushToken;
}

let activeApnsAlertToken = null;

export function setActiveApnsAlertToken(token) {
  activeApnsAlertToken = typeof token === 'string' && token.length >= 16 ? token : null;
}

export function getActiveApnsAlertToken() {
  return activeApnsAlertToken;
}
