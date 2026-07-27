import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { signInWithEmail } from '../services/api';
import { SUPABASE_ENABLED } from '../services/supabaseClient';
import GlassInput from '../components/GlassInput';
import GlassCard from '../components/GlassCard';
import Knot from '../components/Knot';

export default function LoginScreen({ navigation }) {
  const { colors, mood, spacing, typography, radii } = useTheme();
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
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <GlassInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary, borderRadius: radii.pill }]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Signing in…' : 'Sign in'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ marginTop: spacing.md, alignItems: 'center' }} onPress={() => navigation.navigate('Signup')}>
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
