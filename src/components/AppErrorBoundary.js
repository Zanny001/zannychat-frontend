import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

// A fatal render must never leave the production web app as an unexplained
// blank page. Keep this boundary dependency-light so it can render even when
// a screen, theme provider, or navigation subtree has failed.
export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Do not include user/session data in diagnostics.
    console.error('[app] Unhandled application render error:', {
      name: error?.name || 'Error',
      message: error?.message || 'Unknown render error',
      componentStack: info?.componentStack || '',
    });
  }

  handleRecovery = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload();
      return;
    }
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container} accessibilityRole="alert">
        <View style={styles.panel}>
          <Text style={styles.eyebrow}>ZANNYCHAT</Text>
          <Text style={styles.title}>We couldn’t open your chats</Text>
          <Text style={styles.description}>
            Something interrupted the app while it was loading. Your account and messages have not been deleted.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reload ZannyChat"
            onPress={this.handleRecovery}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonText}>Reload app</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#090B16',
  },
  panel: {
    width: '100%',
    maxWidth: 420,
    padding: 28,
    borderRadius: 24,
    backgroundColor: '#15182A',
    borderWidth: 1,
    borderColor: 'rgba(157, 128, 255, 0.28)',
  },
  eyebrow: {
    marginBottom: 14,
    color: '#B7A3FF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '700',
  },
  description: {
    marginTop: 12,
    color: '#C2C5D4',
    fontSize: 15,
    lineHeight: 23,
  },
  button: {
    minHeight: 48,
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#8B6CFF',
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
