import React from 'react';
import { reportClientRenderError } from '../services/clientDiagnostics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// Keep a failed call UI isolated from the authenticated chat/navigation tree.
// A media or browser-specific render failure must never replace the whole app.
export default class CallRouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, diagnosticId: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[calls] Unhandled call-screen render error:', {
      route: this.props.routeName || 'Call',
      name: error?.name || 'Error',
      message: error?.message || 'Unknown call rendering error',
      componentStack: info?.componentStack || '',
    });
    reportClientRenderError({
      sector: 'calls',
      route: this.props.routeName || 'Call',
      error,
      componentStack: info?.componentStack || '',
    }).then((diagnosticId) => {
      if (diagnosticId) this.setState({ diagnosticId });
    });
  }

  handleClose = () => {
    const navigation = this.props.navigation;
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation?.navigate?.('Main');
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={styles.container} accessibilityRole="alert">
        <View style={styles.panel}>
          <Text style={styles.eyebrow}>ZANNYCHAT CALL</Text>
          <Text style={styles.title}>This call screen couldn’t open</Text>
          <Text style={styles.description}>
            Your chat is still available. Close this call screen and try again.
          </Text>
          {this.state.diagnosticId ? <Text selectable style={styles.code}>Diagnostic reference: {this.state.diagnosticId}</Text> : null}
          <Pressable accessibilityRole="button" accessibilityLabel="Return to chats" onPress={this.handleClose} style={styles.button}>
            <Text style={styles.buttonText}>Return to chats</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: '100%', alignItems: 'center', justifyContent: 'center', padding: 22, backgroundColor: '#090B16' },
  panel: { width: '100%', maxWidth: 420, padding: 26, borderRadius: 22, backgroundColor: '#15182A', borderWidth: 1, borderColor: 'rgba(157,128,255,0.28)' },
  eyebrow: { color: '#B7A3FF', fontSize: 11, fontWeight: '800', letterSpacing: 1.8, marginBottom: 12 },
  title: { color: '#FFFFFF', fontSize: 22, lineHeight: 29, fontWeight: '800' },
  description: { color: '#C2C5D4', fontSize: 14, lineHeight: 21, marginTop: 10 },
  code: { color: '#B7A3FF', fontSize: 11, marginTop: 12 },
  button: { minHeight: 48, marginTop: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#8B6CFF' },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
