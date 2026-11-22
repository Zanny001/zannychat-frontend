import React, { useState } from 'react';
import { startGoogleOAuth } from '../services/googleAuth';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '../components/GlassCard';

import { useTheme } from '../theme/ThemeContext';
import { signUpWithEmail } from '../services/api';
import { supabase, SUPABASE_ENABLED } from '../services/supabaseClient';
import {
  normalizeEmail,
  validateSignup,
} from '../utils/authValidation';
import GlassInput from '../components/GlassInput';
import Knot from '../components/Knot';

function showMessage(title, message) {
  // React Native Alert may not display reliably on the web.
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function SignupScreen({ navigation }) {
  const { colors, mood, spacing, typography, radii, layout } = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignup() {
    if (loading) return;
    if (!SUPABASE_ENABLED || !supabase) {
      showMessage('Google sign-up unavailable', 'Connect and configure Supabase authentication first.');
      return;
    }
    setLoading(true);
    try {
      const result = await startGoogleOAuth(supabase);
      // Closing the native browser is cancellation, not an authentication error.
      if (result?.cancelled) setLoading(false);
    } catch (error) {
      console.error('Google signup failed:', error);
      showMessage('Google sign-up failed', error?.message || 'Please try again.');
      setLoading(false);
    }
  }

  async function handleSignup() {
    if (loading) return;

    const validationError = validateSignup({
      name,
      email,
      password,
      confirmPassword,
    });

    if (validationError) {
      showMessage('Check your details', validationError);
      return;
    }

    setLoading(true);

    try {
      const result = await signUpWithEmail(
        normalizeEmail(email),
        password,
        name.trim()
      );

      if (result?.requiresEmailConfirmation) {
        showMessage(
          'Check your email',
          'If your address is valid, you should receive a confirmation link before signing in.'
        );

        navigation.navigate('VerifyEmail', { email: normalizeEmail(email) });
        return;
      }

      // Live sessions switch to the private route group through App.js auth state.
      // Keep the local demo flow navigable without a Supabase auth event.
      if (!SUPABASE_ENABLED) navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (error) {
      console.error('Signup failed:', error);

      showMessage(
        'Could not create account',
        error?.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <View
          style={[
            styles.content,
            {
              padding: spacing.lg,
              width: '100%',
              maxWidth: layout.formMaxWidth,
              alignSelf: 'center',
            },
          ]}
        >
          <GlassCard glow style={{ marginBottom: spacing.md, borderRadius: 24 }} contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={{ width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                <Knot size={36} signalColor={mood.signal} threadColor={mood.thread} strokeWidth={6} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '900', letterSpacing: 1.2 }]}>YOUR NEXT CHAPTER STARTS HERE</Text>
                <Text style={[typography.title, { color: colors.textPrimary }]}>Find your people.</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Create your place in the conversation.</Text>
              </View>
            </View>
          </GlassCard>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.background, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.primary, opacity: loading ? 0.65 : 1 }]}
            onPress={handleGoogleSignup}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Sign up with Google"
            accessibilityState={{ disabled: loading, busy: loading }}
            activeOpacity={0.75}
          >
            <Ionicons name="logo-google" size={17} color={colors.textPrimary} style={{ marginRight: 9 }} />
            <Text style={[styles.buttonText, { color: colors.textPrimary }]}>Continue with Google</Text>
          </TouchableOpacity>
          <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginVertical: spacing.sm }]}>or sign up with email</Text>

          <GlassInput
            value={name}
            onChangeText={setName}
            placeholder="Full name"
            accessibilityLabel="Full name"
            textContentType="name"
            autoComplete="name"
            returnKeyType="next"
          />

          <GlassInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            accessibilityLabel="Email address"
            textContentType="emailAddress"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="next"
          />

          <GlassInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password (8+ characters)"
            accessibilityLabel="Password"
            textContentType="newPassword"
            autoComplete="new-password"
            secureTextEntry
          />

          <GlassInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm password"
            accessibilityLabel="Confirm password"
            textContentType="newPassword"
            autoComplete="new-password"
            secureTextEntry
          />

          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: colors.primary,
                borderRadius: radii.pill,
                opacity: loading ? 0.65 : 1,
              },
            ]}
            onPress={handleSignup}
            disabled={loading}
            accessibilityLabel="Create account"
            accessibilityRole="button"
            accessibilityState={{
              disabled: loading,
              busy: loading,
            }}
            activeOpacity={0.75}
          >
            <Text style={[styles.buttonText, { color: colors.onPrimary }]}>
              {loading ? 'Creating account…' : 'Create account'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ marginTop: spacing.md, minHeight: 48, justifyContent: 'center', alignItems: 'center' }}
            onPress={() => navigation.navigate('Login')}
            accessibilityRole="button"
            accessibilityLabel="Go to sign in"
          >
            <Text
              style={[
                typography.caption,
                { color: colors.textSecondary },
              ]}
            >
              Already have an account?{' '}
              <Text
                style={{
                  color: colors.primary,
                  fontFamily: 'Manrope_700Bold',
                }}
              >
                Sign in
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  content: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  button: {
    minHeight: 54,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
  },
});
