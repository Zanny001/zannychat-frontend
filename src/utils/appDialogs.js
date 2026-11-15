import { Alert, Platform } from 'react-native';

// React Native Web does not consistently implement Alert.alert button actions.
// Use the browser's native confirmation on web and the native alert on devices.
export function confirmAction({ title, message, confirmText = 'Delete', destructive = true }) {
  if (Platform.OS === 'web' && typeof globalThis.confirm === 'function') {
    return Promise.resolve(globalThis.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

export function showAppAlert(title, message, { onDismiss } = {}) {
  let completed = false;
  const finish = () => {
    if (completed) return;
    completed = true;
    onDismiss?.();
  };
  if (Platform.OS === 'web' && typeof globalThis.alert === 'function') {
    globalThis.alert(title + '\n\n' + message);
    finish();
    return;
  }
  Alert.alert(title, message, [{ text: 'OK', onPress: finish }], {
    cancelable: false,
    onDismiss: finish,
  });
}
