import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { resendSignupEmailOtp, verifySignupEmailOtp } from '../services/api';
import GlassInput from '../components/GlassInput';
import Knot from '../components/Knot';
import { SUPABASE_ENABLED } from '../services/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '../components/GlassCard';

function message(title, body) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') window.alert(`${title}\n\n${body}`);
  else Alert.alert(title, body);
}

export default function VerifyEmailScreen({ navigation, route }) {
  const { colors, mood, spacing, typography, radii, layout } = useTheme();
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
      // A live SIGNED_IN event moves the app to the authenticated route group.
      // Only demo mode needs an explicit local navigation action.
      if (!SUPABASE_ENABLED) navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
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
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, minWidth: 0, justifyContent: 'center', padding: spacing.lg, width: '100%', maxWidth: layout.formMaxWidth, alignSelf: 'center' }}>
          <View style={{ alignItems: 'flex-start' }}>
            <Knot size={44} signalColor={mood.signal} threadColor={mood.thread} strokeWidth={7} />
            <Text style={[typography.overline || typography.caption, { color: colors.accent, marginTop: spacing.lg, letterSpacing: 1.4 }]}>ACCOUNT SECURITY  ·  STEP 02</Text>
            <Text style={[typography.title, { color: colors.textPrimary, marginTop: spacing.xs }]}>One last step.</Text>
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.lg }]}>Confirm your email to secure your place in the ZannyChat community.</Text>
          </View>
          <GlassCard intensity={24} style={{ marginBottom: spacing.md, padding: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm }}>
                <Ionicons name="mail-open-outline" size={19} color={colors.accent} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>VERIFICATION SENT TO</Text>
                <Text numberOfLines={2} style={[typography.body, { color: colors.textPrimary, fontFamily: 'Manrope_700Bold', marginTop: 2 }]}>{email || 'Your email address'}</Text>
              </View>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.accent} />
            </View>
          </GlassCard>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>Enter the 6-digit code from your inbox. Check spam or promotions if it is not there.</Text>
          <GlassInput value={token} onChangeText={(value) => setToken(value.replace(/[^0-9]/g, '').slice(0, 6))} placeholder="6-digit code" accessibilityLabel="Email verification code" keyboardType="number-pad" autoComplete="one-time-code" maxLength={6} />
          <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary, borderRadius: radii.pill, minHeight: 54, opacity: loading ? 0.65 : 1 }]} onPress={verify} disabled={loading} accessibilityRole="button" accessibilityLabel="Verify email address" accessibilityState={{ disabled: loading, busy: loading }}>
            <Text style={[styles.buttonText, { color: colors.onPrimary }]}>{loading ? 'Verifying…' : 'Verify email'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: spacing.md, alignItems: 'center' }} onPress={resend} disabled={resending} accessibilityRole="button" accessibilityLabel="Resend verification code" accessibilityState={{ disabled: resending, busy: resending }}>
            <Text style={[typography.caption, { color: colors.primary }]}>{resending ? 'Requesting code…' : 'Resend verification code'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: spacing.md, alignItems: 'center' }} onPress={() => navigation.navigate('Login')} accessibilityRole="button" accessibilityLabel="Back to sign in">
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Back to sign in</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 }, button: { marginTop: 12, paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' }, buttonText: { fontFamily: 'Manrope_700Bold', fontSize: 16 } });
