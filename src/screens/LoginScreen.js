import React, { useState } from 'react';
import { startGoogleOAuth } from '../services/googleAuth';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { signInWithEmail } from '../services/api';
import { isValidEmail, normalizeEmail } from '../utils/authValidation';
import { supabase, SUPABASE_ENABLED } from '../services/supabaseClient';
import GlassInput from '../components/GlassInput';
import GlassCard from '../components/GlassCard';
import Knot from '../components/Knot';

function showMessage(title, message) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

export default function LoginScreen({ navigation }) {
  const { colors, mood, spacing, typography, radii, layout } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!isValidEmail(email)) {
      showMessage('Check your email', 'Enter a valid email address to continue.');
      return;
    }
    if (!password) {
      showMessage('Enter your password', 'Your password is required to sign in.');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmail(normalizeEmail(email), password);
      // In live mode App.js reacts to Supabase SIGNED_IN and switches the
      // registered navigator routes. Demo mode has no auth event, so navigate locally.
      if (!SUPABASE_ENABLED) navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (err) {
      showMessage('Sign-in failed', err.message || 'Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  }


  async function handleGoogleSignIn() {
    if (!SUPABASE_ENABLED || !supabase) {
      showMessage('Sign-in unavailable', 'Connect the Supabase backend first.');
      return;
    }
    setLoading(true);
    try {
      const result = await startGoogleOAuth(supabase);
      // A cancelled native browser session should restore the button immediately.
      if (result?.cancelled) setLoading(false);
    } catch (err) {
      showMessage('Google sign-in failed', err.message || 'Please try again.');
      setLoading(false);
    }
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ padding: spacing.lg, flex: 1, minWidth: 0, justifyContent: 'center', width: '100%', maxWidth: layout.formMaxWidth, alignSelf: 'center' }}>
          <GlassCard glow style={{ marginBottom: spacing.lg, borderRadius: 26 }} contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={{ width: 62, height: 62, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                <Knot size={38} signalColor={mood.signal} threadColor={mood.thread} strokeWidth={6} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '900', letterSpacing: 1.2 }]}>YOUR WORLD, RECONNECTED</Text>
                <Text style={[typography.title, { color: colors.textPrimary }]}>Welcome back.</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Your conversations are waiting.</Text>
              </View>
            </View>
          </GlassCard>

          {!SUPABASE_ENABLED && (
            <GlassCard style={{ marginBottom: spacing.md }} intensity={20}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                No backend connected yet — any email/password will sign you into the demo.
              </Text>
            </GlassCard>
          )}

          <GlassInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            accessibilityLabel="Email address"
            textContentType="emailAddress"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="next"
          />
          <GlassInput value={password} onChangeText={setPassword} placeholder="Password" accessibilityLabel="Password" textContentType="password" secureTextEntry returnKeyType="go" onSubmitEditing={handleLogin} />
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary, borderRadius: radii.pill, opacity: loading ? 0.65 : 1 }]}
            onPress={handleLogin}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={loading ? 'Signing in' : 'Sign in'}
            accessibilityState={{ disabled: loading, busy: loading }}
            activeOpacity={0.75}
          >
            <Text style={[styles.buttonText, { color: colors.onPrimary }]}>{loading ? 'Signing in…' : 'Sign in'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: colors.background,
                borderRadius: radii.pill,
                borderWidth: 1,
                borderColor: colors.primary,
              },
            ]}
            onPress={handleGoogleSignIn}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
          >
            <Ionicons name="logo-google" size={17} color={colors.textPrimary} style={{ marginRight: 9 }} />
            <Text style={[styles.buttonText, { color: colors.textPrimary }]}>
              Continue with Google
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ marginTop: spacing.sm, minHeight: 48, justifyContent: 'center', alignItems: 'flex-end' }}
            onPress={() => navigation.navigate('PasswordRecovery')}
            accessibilityRole="button"
            accessibilityLabel="Forgot password"
          >
            <Text style={[typography.caption, { color: colors.primary }]}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ marginTop: spacing.md, minHeight: 48, justifyContent: 'center', alignItems: 'center' }} onPress={() => navigation.navigate('Signup')} accessibilityRole="button" accessibilityLabel="Create a new account">
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Don't have an account? <Text style={{ color: colors.primary, fontFamily: 'Manrope_700Bold' }}>Sign up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 54, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  buttonText: { fontFamily: 'Manrope_700Bold', fontSize: 16 },
});
