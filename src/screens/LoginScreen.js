import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { signInWithEmail } from '../services/api';
import { SUPABASE_ENABLED } from '../services/supabaseClient';

export default function LoginScreen({ navigation }) {
  const { colors, spacing, typography, radii } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (err) {
      Alert.alert('Couldn\u2019t sign in', err.message || 'Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ padding: spacing.lg, flex: 1, justifyContent: 'center' }}>
          <Text style={[typography.title, { color: colors.textPrimary, marginBottom: spacing.xs }]}>Welcome back</Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
            Sign in to keep chatting.
          </Text>

          {!SUPABASE_ENABLED && (
            <View style={[styles.notice, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                No backend connected yet — any email/password will sign you into the demo.
              </Text>
            </View>
          )}

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            keyboardType="email-address"
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderRadius: radii.md }]}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderRadius: radii.md }]}
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary, borderRadius: radii.pill }]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Signing in…' : 'Sign in'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ marginTop: spacing.md, alignItems: 'center' }} onPress={() => navigation.navigate('Signup')}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Don't have an account? <Text style={{ color: colors.primary, fontWeight: '600' }}>Sign up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  input: { paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12, fontSize: 15 },
  button: { paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  notice: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
});
