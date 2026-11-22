import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const { colors, mood, spacing, typography, radii, layout } = useTheme();
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
        message = 'Supabase rejected the recovery redirect. In Supabase Dashboard → Authentication → URL Configuration, allow https://zannychat.vercel.app/**, then retry. If testing locally, allow that local web origin too.';
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
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ padding: spacing.lg, flex: 1, minWidth: 0, justifyContent: 'center', width: '100%', maxWidth: layout.formMaxWidth, alignSelf: 'center' }}>
          <Knot size={48} signalColor={mood.signal} threadColor={mood.thread} strokeWidth={7} />
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '900', letterSpacing: 1.5, marginTop: spacing.lg }]}>ZANNYCHAT · ACCOUNT RECOVERY</Text>
          <Text style={[typography.title, { color: colors.textPrimary, marginTop: spacing.sm, marginBottom: spacing.xs }]}>Your way back in.</Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg }]}>A secure reset link is the first step. Enter the email address connected to your account.</Text>
          <GlassCard intensity={18} style={{ marginBottom: spacing.md }} contentStyle={{ padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Private by design</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>We never reveal whether an email has an account.</Text>
            </View>
          </GlassCard>
          {!SUPABASE_ENABLED && <GlassCard style={{ marginBottom: spacing.md }} intensity={20}><Text style={[typography.caption, { color: colors.textSecondary }]}>Demo mode is active. Password recovery email is not sent until a Supabase project is configured.</Text></GlassCard>}
          {submitted ? (
            <GlassCard glow intensity={24} style={{ marginBottom: spacing.md }} contentStyle={{ padding: spacing.lg, gap: spacing.sm }}>
              <View style={{ width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                <Ionicons name="mail-open-outline" size={23} color={colors.primary} />
              </View>
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '900', letterSpacing: 1 }]}>CHECK YOUR INBOX</Text>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Your next step is on its way.</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 20 }]}>If an account matches that address, recovery instructions can be sent. Check your inbox and spam folder.</Text>
            </GlassCard>
          ) : (
            <>
              <GlassInput value={email} onChangeText={setEmail} placeholder="Email" accessibilityLabel="Email address" textContentType="emailAddress" autoComplete="email" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" returnKeyType="go" onSubmitEditing={handleSubmit} />
              <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary, borderRadius: radii.pill, minHeight: 54 }]} onPress={handleSubmit} disabled={loading} accessibilityRole="button" accessibilityLabel={loading ? 'Requesting password reset' : 'Send recovery instructions'} accessibilityState={{ disabled: loading, busy: loading }}>
                <Text style={[styles.buttonText, { color: colors.onPrimary }]}>{loading ? 'Sending…' : 'Send recovery instructions'}</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={{ marginTop: spacing.md, minHeight: 48, alignItems: 'center', justifyContent: 'center' }} onPress={() => navigation.navigate('Login')} accessibilityRole="button" accessibilityLabel="Return to sign in">
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Back to <Text style={{ color: colors.primary, fontFamily: 'Manrope_700Bold' }}>sign in</Text></Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ button: { paddingVertical: 16, alignItems: 'center', marginTop: 8 }, buttonText: { fontFamily: 'Manrope_700Bold', fontSize: 16 } });
