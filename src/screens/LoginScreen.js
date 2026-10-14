import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { signInWithEmail } from '../services/api';
import { isValidEmail, normalizeEmail } from '../utils/authValidation';
import { supabase, SUPABASE_ENABLED } from '../services/supabaseClient';
import { registerForPushNotifications } from '../services/notifications';
import GlassInput from '../components/GlassInput';
import GlassCard from '../components/GlassCard';
import Knot from '../components/Knot';

export default function LoginScreen({ navigation }) {
  const { colors, mood, spacing, typography, radii } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!isValidEmail(email)) {
      Alert.alert('Check your email', 'Enter a valid email address to continue.');
      return;
    }
    if (!password) {
      Alert.alert('Enter your password', 'Your password is required to sign in.');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmail(normalizeEmail(email), password);
      registerForPushNotifications();
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (err) {
      Alert.alert('Couldn\u2019t sign in', err.message || 'Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  }


  async function handleGoogleSignIn() {
    if (!SUPABASE_ENABLED || !supabase) {
      Alert.alert('Sign-in unavailable', 'Connect the Supabase backend first.');
      return;
    }
    setLoading(true);
    try {
      const result = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: 'https://zannychat.netlify.app' },
      });
      if (result.error) throw result.error;
    } catch (err) {
      Alert.alert('Google sign-in failed', err.message || 'Please try again.');
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ padding: spacing.lg, flex: 1, justifyContent: 'center' }}>
          <Knot size={40} signalColor={mood.signal} threadColor={mood.thread} strokeWidth={7} />
          <Text style={[typography.title, { color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.xs }]}>
            Welcome back
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
            Sign in to keep chatting.
          </Text>

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
            <Text style={[styles.buttonText, { color: colors.textPrimary }]}>
              Continue with Google
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ marginTop: spacing.sm, alignItems: 'flex-end' }}
            onPress={() => navigation.navigate('PasswordRecovery')}
            accessibilityRole="button"
            accessibilityLabel="Forgot password"
          >
            <Text style={[typography.caption, { color: colors.primary }]}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ marginTop: spacing.md, alignItems: 'center' }} onPress={() => navigation.navigate('Signup')} accessibilityRole="button" accessibilityLabel="Create a new account">
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
  button: { paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 16 },
});
