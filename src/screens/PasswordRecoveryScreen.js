import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { requestPasswordReset } from '../services/api';
import { SUPABASE_ENABLED } from '../services/supabaseClient';
import { isValidEmail, normalizeEmail } from '../utils/authValidation';
import GlassInput from '../components/GlassInput';
import GlassCard from '../components/GlassCard';
import Knot from '../components/Knot';

export default function PasswordRecoveryScreen({ navigation }) {
  const { colors, mood, spacing, typography, radii } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      Alert.alert('Check your email', 'Enter a valid email address.');
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
    } catch (_) {
      Alert.alert('Could not request reset', 'Please try again in a moment. If the problem continues, contact support.');
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
                <Text style={styles.buttonText}>{loading ? 'Sending…' : 'Send recovery instructions'}</Text>
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
