import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';

import { useTheme } from '../theme/ThemeContext';
import { signUpWithEmail } from '../services/api';
import {
  normalizeEmail,
  validateSignup,
} from '../utils/authValidation';
import { registerForPushNotifications } from '../services/notifications';
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
  const { colors, mood, spacing, typography, radii } = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

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

        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
        return;
      }

      // Push notifications must not prevent successful signup.
      Promise.resolve()
        .then(() => registerForPushNotifications())
        .catch((error) => {
          console.warn('Push notification registration failed:', error);
        });

      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
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
    <SafeAreaView
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
            },
          ]}
        >
          <Knot
            size={40}
            signalColor={mood.signal}
            threadColor={mood.thread}
            strokeWidth={7}
          />

          <Text
            style={[
              typography.title,
              {
                color: colors.textPrimary,
                marginTop: spacing.md,
                marginBottom: spacing.xs,
              },
            ]}
          >
            Create your account
          </Text>

          <Text
            style={[
              typography.body,
              {
                color: colors.textSecondary,
                marginBottom: spacing.lg,
              },
            ]}
          >
            Join ZannyChat in under a minute.
          </Text>

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
            <Text style={styles.buttonText}>
              {loading ? 'Creating account…' : 'Create account'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ marginTop: spacing.md, alignItems: 'center' }}
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
    justifyContent: 'center',
  },
  button: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
  },
});
