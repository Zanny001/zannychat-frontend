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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ padding: spacing.lg, flex: 1, justifyContent: 'center' }}>
          
          <View style={[styles.glassCard, { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: radii.xl, padding: spacing.xl, borderColor: 'rgba(255,255,255,0.08)' }]}>
            <Text style={[typography.title, { color: '#fff', marginBottom: spacing.xs, textAlign: 'center', fontSize: 28 }]}>Welcome back</Text>
            <Text style={[typography.body, { color: 'rgba(255,255,255,0.6)', marginBottom: spacing.xl, textAlign: 'center' }]}>
              Enter your ZannyChat global ID.
            </Text>

            {!SUPABASE_ENABLED && (
              <View style={[styles.notice, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: colors.primary }]}>
                <Text style={[typography.caption, { color: 'rgba(255,255,255,0.8)', textAlign: 'center' }]}>
                  Demo Mode: Enter any email/password to securely connect.
                </Text>
              </View>
            )}

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor="rgba(255,255,255,0.4)"
              autoCapitalize="none"
              keyboardType="email-address"
              style={[styles.input, { backgroundColor: 'rgba(255,255,255,0.06)', color: '#fff', borderRadius: radii.md, borderColor: 'rgba(255,255,255,0.1)' }]}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Master Password"
              placeholderTextColor="rgba(255,255,255,0.4)"
              secureTextEntry
              style={[styles.input, { backgroundColor: 'rgba(255,255,255,0.06)', color: '#fff', borderRadius: radii.md, borderColor: 'rgba(255,255,255,0.1)' }]}
            />

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary, borderRadius: radii.pill, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? 'Authenticating…' : 'Secure Login'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ marginTop: spacing.lg, alignItems: 'center' }} onPress={() => navigation.navigate('Signup')}>
              <Text style={[typography.caption, { color: 'rgba(255,255,255,0.6)' }]}>
                Don't have an ID? <Text style={{ color: colors.primary, fontWeight: '700' }}>Create one</Text>
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  glassCard: { borderWidth: 1, overflow: 'hidden' },
  input: { paddingHorizontal: 16, paddingVertical: 16, marginBottom: 16, fontSize: 15, borderWidth: 1 },
  button: { paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
  notice: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 24 },
});
