import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { resendSignupEmailOtp, verifySignupEmailOtp } from '../services/api';
import GlassInput from '../components/GlassInput';
import GlassCard from '../components/GlassCard';
import { hexToRgba } from '../utils/color';
import Knot from '../components/Knot';
import { SUPABASE_ENABLED } from '../services/supabaseClient';

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
          <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
            <Knot size={52} signalColor={mood.signal} threadColor={mood.thread} strokeWidth={7} />
          </View>
          <GlassCard glow intensity={22} style={{ borderRadius: 24, borderWidth: 1, borderColor: hexToRgba(colors.primary, 0.26), marginBottom: spacing.lg }} contentStyle={{ padding: spacing.lg, gap: spacing.md }}>
            <View style={{ width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: hexToRgba(colors.primary, 0.14), borderWidth: 1, borderColor: hexToRgba(colors.primary, 0.28) }}>
              <Ionicons name="mail-unread-outline" size={25} color={colors.primary} />
            </View>
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '900', letterSpacing: 1.2 }]}>ONE LAST STEP</Text>
            <Text style={[typography.title, { color: colors.textPrimary }]}>Verify your email</Text>
            <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]}>Enter the 6-digit code sent to</Text>
            <View style={{ padding: spacing.md, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              <Text accessibilityLabel={email ? `Verification email: ${email}` : 'Verification email address unavailable'} style={[typography.bodyStrong, { color: colors.textPrimary }]}>{email || 'your email address'}</Text>
            </View>
            <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 19 }]}>Check your inbox and spam folder. The code is used to confirm access to this email address.</Text>
          </GlassCard>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm, fontWeight: '700' }]}>YOUR 6-DIGIT CODE</Text>
          <GlassInput value={token} onChangeText={(value) => setToken(value.replace(/[^0-9]/g, '').slice(0, 6))} placeholder="6-digit code" accessibilityLabel="Email verification code" keyboardType="number-pad" autoComplete="one-time-code" maxLength={6} />
          <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary, borderRadius: radii.lg || 18, minHeight: 54, opacity: loading || !email ? 0.55 : 1 }]} onPress={verify} disabled={loading || !email} accessibilityRole="button" accessibilityLabel="Verify email address" accessibilityState={{ disabled: loading, busy: loading }}>
            <Text style={[styles.buttonText, { color: colors.onPrimary }]}>{loading ? 'Verifying…' : 'Verify email'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: spacing.md, alignItems: 'center' }} onPress={resend} disabled={resending || !email} accessibilityRole="button" accessibilityLabel="Resend verification code" accessibilityState={{ disabled: resending, busy: resending }}>
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

const styles = StyleSheet.create({ container: { flex: 1 }, button: { marginTop: 12, paddingVertical: 16, alignItems: 'center' }, buttonText: { fontFamily: 'Manrope_700Bold', fontSize: 16 } });
