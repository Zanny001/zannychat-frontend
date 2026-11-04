import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { completePasswordReset } from '../services/api';
import { SUPABASE_ENABLED } from '../services/supabaseClient';
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
import Knot from '../components/Knot';

function showScreenMessage(title, message, onContinue) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${title}\n\n${message}`);
    if (onContinue) onContinue();
    return;
  }

  if (onContinue) {
    Alert.alert(title, message, [
      { text: 'Continue', onPress: onContinue },
    ]);
  } else {
    Alert.alert(title, message);
  }
}

export default function PasswordResetScreen({ navigation, route }) {
  const { colors, mood, spacing, typography, radii } = useTheme();
  const initialWebUrl = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.href : '';
  const [callbackUrl, setCallbackUrl] = useState(route.params?.callbackUrl || initialWebUrl);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let mounted = true;
    Linking.getInitialURL().then((url) => {
      if (mounted && url && url.includes('reset-password')) setCallbackUrl(url);
    }).catch(() => {});
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (url && url.includes('reset-password')) setCallbackUrl(url);
    });
    return () => { mounted = false; subscription.remove(); };
  }, []);

  async function handleSave() {
    if (password.length < 8) return showScreenMessage('Password too short', 'Use at least 8 characters.');
    if (password.length > 128) return showScreenMessage('Password too long', 'Use no more than 128 characters.');
    if (password !== confirmPassword) return showScreenMessage('Passwords do not match', 'Enter the same password in both fields.');
    if (!callbackUrl) return showScreenMessage('Open your recovery link', 'Open the password recovery link from your email on this device, then try again.');
    setLoading(true);
    try {
      await completePasswordReset(callbackUrl, password);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('reset-password');
        cleanUrl.hash = '';
        window.history.replaceState({}, document.title, cleanUrl.pathname + cleanUrl.search);
      }
      setComplete(true);
      showScreenMessage(
        'Password updated',
        'You can now sign in with your new password.',
        () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })
      );
    } catch (error) {
      showScreenMessage('Could not update password', error.message || 'The recovery link may have expired. Request a new one and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ padding: spacing.lg, flex: 1, justifyContent: 'center' }}>
          <Knot size={40} signalColor={mood.signal} threadColor={mood.thread} strokeWidth={7} />
          <Text style={[typography.title, { color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.xs }]}>Choose a new password</Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg }]}>Set a new password for your ZannyChat account.</Text>
          {!SUPABASE_ENABLED && <GlassCard intensity={20} style={{ marginBottom: spacing.md }}><Text style={[typography.caption, { color: colors.textSecondary }]}>Password reset is unavailable in mock mode. Configure a Supabase project to test this flow.</Text></GlassCard>}
          {!complete && <>
            <GlassInput value={password} onChangeText={setPassword} placeholder="New password (8+ characters)" accessibilityLabel="New password" textContentType="newPassword" autoComplete="new-password" secureTextEntry />
            <GlassInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm new password" accessibilityLabel="Confirm new password" textContentType="newPassword" autoComplete="new-password" secureTextEntry />
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary, borderRadius: radii.pill, opacity: loading || !SUPABASE_ENABLED ? 0.55 : 1 }]} onPress={handleSave} disabled={loading || !SUPABASE_ENABLED} accessibilityRole="button" accessibilityLabel={loading ? 'Updating password' : 'Update password'} accessibilityState={{ disabled: loading || !SUPABASE_ENABLED, busy: loading }}>
              <Text style={styles.buttonText}>{loading ? 'Updating…' : 'Update password'}</Text>
            </TouchableOpacity>
          </>}
          <TouchableOpacity style={{ marginTop: spacing.md, alignItems: 'center' }} onPress={() => navigation.navigate('Login')} accessibilityRole="button" accessibilityLabel="Return to sign in"><Text style={[typography.caption, { color: colors.textSecondary }]}>Back to <Text style={{ color: colors.primary, fontFamily: 'Manrope_700Bold' }}>sign in</Text></Text></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ button: { paddingVertical: 16, alignItems: 'center', marginTop: 8 }, buttonText: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 16 } });
