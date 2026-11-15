import { Alert, Platform } from 'react-native';

// React Native Web does not consistently implement Alert.alert button actions.
// Route all app dialogs through this helper so button callbacks also work on web.
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

export function showAppAlert(title, message, buttonsOrOptions, nativeOptions) {
  const buttons = Array.isArray(buttonsOrOptions) ? buttonsOrOptions : null;
  const options = buttons ? (nativeOptions || {}) : (buttonsOrOptions || {});
  let completed = false;
  const finish = () => {
    if (completed) return;
    completed = true;
    options.onDismiss?.();
  };

  if (Platform.OS === 'web') {
    if (buttons?.length && typeof globalThis.prompt === 'function') {
      const choices = buttons.map((button, index) => `${index + 1}. ${button.text || 'Continue'}`).join('\n');
      const response = globalThis.prompt(`${title}\n\n${message}\n\n${choices}\n\nEnter the number of your choice:`);
      if (response === null || !response.trim()) {
        finish();
        return;
      }
      const selectedIndex = Number(response) - 1;
      if (Number.isInteger(selectedIndex) && selectedIndex >= 0 && selectedIndex < buttons.length) {
        buttons[selectedIndex].onPress?.();
      }
      return;
    }
    if (typeof globalThis.alert === 'function') globalThis.alert(title + '\n\n' + message);
    finish();
    return;
  }

  Alert.alert(title, message, buttons || [{ text: 'OK', onPress: finish }], {
    cancelable: options.cancelable ?? !buttons,
    onDismiss: finish,
  });
}
