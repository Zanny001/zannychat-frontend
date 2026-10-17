import React, { useState } from 'react';
import { SafeAreaView, KeyboardAvoidingView, Platform, View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { resendSignupEmailOtp, verifySignupEmailOtp } from '../services/api';
import { registerForPushNotifications } from '../services/notifications';
import GlassInput from '../components/GlassInput';
import Knot from '../components/Knot';

function message(title, body) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') window.alert(`${title}\n\n${body}`);
  else Alert.alert(title, body);
}

export default function VerifyEmailScreen({ navigation, route }) {
  const { colors, mood, spacing, typography, radii } = useTheme();
  const email = String(route?.params?.email || '').trim().toLowerCase();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function verify() {
    if (loading) return;
    if (!/^[0-9]{6}$/.test(token.trim())) return message('Enter your code', 'Enter the 6-digit verification code from your email.');
    setLoading(true);
    try {
      await verifySignupEmailOtp(email, token);
      Promise.resolve().then(() => registerForPushNotifications()).catch((err) => console.warn('Push registration failed:', err));
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (err) {
      message('Verification failed', err?.message || 'The code may have expired. Request a new one and try again.');
    } finally { setLoading(false); }
  }

  async function resend() {
    if (resending) return;
    setResending(true);
    try {
      await resendSignupEmailOtp(email);
      message('Code requested', 'If the address is eligible, a new verification code will be sent. Check your inbox and spam folder.');
    } catch (err) { message('Could not resend code', err?.message || 'Please wait a moment and try again.'); }
    finally { setResending(false); }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg }}>
          <Knot size={40} signalColor={mood.signal} threadColor={mood.thread} strokeWidth={7} />
          <Text style={[typography.title, { color: colors.textPrimary, marginTop: spacing.md }]}>Verify your email</Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.lg }]}>Enter the 6-digit code sent to {email || 'your email address'}. Make sure your Supabase email template is configured to send the code.</Text>
          <GlassInput value={token} onChangeText={(value) => setToken(value.replace(/[^0-9]/g, '').slice(0, 6))} placeholder="6-digit code" accessibilityLabel="Email verification code" keyboardType="number-pad" autoComplete="one-time-code" maxLength={6} />
          <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary, borderRadius: radii.pill, opacity: loading ? 0.65 : 1 }]} onPress={verify} disabled={loading} accessibilityRole="button" accessibilityState={{ disabled: loading, busy: loading }}>
            <Text style={styles.buttonText}>{loading ? 'Verifying…' : 'Verify email'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: spacing.md, alignItems: 'center' }} onPress={resend} disabled={resending} accessibilityRole="button">
            <Text style={[typography.caption, { color: colors.primary }]}>{resending ? 'Requesting code…' : 'Resend verification code'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: spacing.md, alignItems: 'center' }} onPress={() => navigation.navigate('Login')} accessibilityRole="button">
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Back to sign in</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 }, button: { marginTop: 12, paddingVertical: 16, alignItems: 'center' }, buttonText: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 16 } });
