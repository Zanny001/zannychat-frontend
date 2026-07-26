import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { signUpWithEmail } from '../services/api';

export default function SignupScreen({ navigation }) {
  const { colors, spacing, typography, radii } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!name.trim() || !email.trim() || password.length < 6) {
      Alert.alert('Verification Required', 'Please complete your Global ID profile (password min. 6 chars).');
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail(email.trim(), password, name.trim());
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (err) {
      Alert.alert('Initialization Failed', err.message || 'Network error, please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ padding: spacing.lg, flex: 1, justifyContent: 'center' }}>
          
          <View style={[styles.glassCard, { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: radii.xl, padding: spacing.xl, borderColor: 'rgba(255,255,255,0.08)' }]}>
            <Text style={[typography.title, { color: '#fff', marginBottom: spacing.xs, textAlign: 'center', fontSize: 26 }]}>Register Global ID</Text>
            <Text style={[typography.body, { color: 'rgba(255,255,255,0.6)', marginBottom: spacing.xl, textAlign: 'center' }]}>
              Join the ZannyChat network securely.
            </Text>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Full Name"
              placeholderTextColor="rgba(255,255,255,0.4)"
              style={[styles.input, { backgroundColor: 'rgba(255,255,255,0.06)', color: '#fff', borderRadius: radii.md, borderColor: 'rgba(255,255,255,0.1)' }]}
            />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Secure Email"
              placeholderTextColor="rgba(255,255,255,0.4)"
              autoCapitalize="none"
              keyboardType="email-address"
              style={[styles.input, { backgroundColor: 'rgba(255,255,255,0.06)', color: '#fff', borderRadius: radii.md, borderColor: 'rgba(255,255,255,0.1)' }]}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Encryption Key (Password)"
              placeholderTextColor="rgba(255,255,255,0.4)"
              secureTextEntry
              style={[styles.input, { backgroundColor: 'rgba(255,255,255,0.06)', color: '#fff', borderRadius: radii.md, borderColor: 'rgba(255,255,255,0.1)' }]}
            />

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary, borderRadius: radii.pill, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }]}
              onPress={handleSignup}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? 'Generating Keys…' : 'Create Network ID'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ marginTop: spacing.lg, alignItems: 'center' }} onPress={() => navigation.navigate('Login')}>
              <Text style={[typography.caption, { color: 'rgba(255,255,255,0.6)' }]}>
                Already registered? <Text style={{ color: colors.primary, fontWeight: '700' }}>Authenticate</Text>
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
});
