import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { requestPasswordReset } from '../services/api';
import { SUPABASE_ENABLED } from '../services/supabaseClient';
import { isValidEmail, normalizeEmail } from '../utils/authValidation';
import GlassInput from '../components/GlassInput';
import GlassCard from '../components/GlassCard';
import Knot from '../components/Knot';

function showMessage(title, message) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}


export default function PasswordRecoveryScreen({ navigation }) {
  const { colors, mood, spacing, typography, radii } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      showMessage('Check your email', 'Enter a valid email address.');
      return;
    }
    if (!SUPABASE_ENABLED) {
      setSubmitted(true);
      return;
    }
    setLoading(true);
    try {
      await requestPasswordReset(normalizedEmail);
      // Deliberately generic: do not disclose whether an account exists.
      setSubmitted(true);
    } catch (error) {
      const rawMessage = String(error?.message || '');
      const normalizedMessage = rawMessage.toLowerCase();
      let message = rawMessage || 'Please try again in a moment. If the problem continues, contact support.';
      if (/redirect|url.*(allow|valid)|not allowed/.test(normalizedMessage)) {
        message = 'Supabase rejected the recovery redirect. In Supabase Dashboard → Authentication → URL Configuration, allow https://zannychat-app.netlify.app/**, then retry. If testing locally, allow that local web origin too.';
      } else if (/rate limit|too many requests/.test(normalizedMessage)) {
        message = 'Too many recovery requests were made. Wait a few minutes, then try again.';
      } else if (/fetch|network|timeout/.test(normalizedMessage)) {
        message = 'The recovery request could not reach Supabase. Check your internet connection and Supabase project status, then retry.';
      }
      // Do not log the email address or any auth tokens.
      console.warn('[PASSWORD_RECOVERY_REQUEST_FAILED]', {
        code: error?.code || null,
        status: error?.status || null,
        message: rawMessage,
      });
      showMessage('Could not request reset', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ padding: spacing.lg, flex: 1, justifyContent: 'center' }}>
          <Knot size={40} signalColor={mood.signal} threadColor={mood.thread} strokeWidth={7} />
          <Text style={[typography.title, { color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.xs }]}>Reset your password</Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg }]}>Enter the email address associated with your account. We’ll help you get back in.</Text>
          {!SUPABASE_ENABLED && <GlassCard style={{ marginBottom: spacing.md }} intensity={20}><Text style={[typography.caption, { color: colors.textSecondary }]}>Demo mode is active. Password recovery email is not sent until a Supabase project is configured.</Text></GlassCard>}
          {submitted ? (
            <GlassCard intensity={20} style={{ marginBottom: spacing.md }}>
              <Text style={[typography.body, { color: colors.textPrimary, marginBottom: spacing.xs }]}>If an account matches that address, recovery instructions can be sent.</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>If you are testing with a real backend, check your inbox and spam folder.</Text>
            </GlassCard>
          ) : (
            <>
              <GlassInput value={email} onChangeText={setEmail} placeholder="Email" accessibilityLabel="Email address" textContentType="emailAddress" autoComplete="email" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" returnKeyType="go" onSubmitEditing={handleSubmit} />
              <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary, borderRadius: radii.pill }]} onPress={handleSubmit} disabled={loading} accessibilityRole="button" accessibilityLabel={loading ? 'Requesting password reset' : 'Send recovery instructions'} accessibilityState={{ disabled: loading, busy: loading }}>
                <Text style={[styles.buttonText, { color: colors.onPrimary }]}>{loading ? 'Sending…' : 'Send recovery instructions'}</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={{ marginTop: spacing.md, alignItems: 'center' }} onPress={() => navigation.navigate('Login')} accessibilityRole="button" accessibilityLabel="Return to sign in">
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Back to <Text style={{ color: colors.primary, fontFamily: 'Manrope_700Bold' }}>sign in</Text></Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ button: { paddingVertical: 16, alignItems: 'center', marginTop: 8 }, buttonText: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 16 } });
