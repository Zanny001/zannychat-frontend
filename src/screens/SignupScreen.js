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
      Alert.alert('Almost there', 'Add your name, email, and a password of at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail(email.trim(), password, name.trim());
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (err) {
      Alert.alert('Couldn\u2019t sign up', err.message || 'Something went wrong, please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ padding: spacing.lg, flex: 1, justifyContent: 'center' }}>
          <Text style={[typography.title, { color: colors.textPrimary, marginBottom: spacing.xs }]}>Create your account</Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
            Join ZannyChat in under a minute.
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Full name"
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderRadius: radii.md }]}
          />
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
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Creating account…' : 'Create account'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ marginTop: spacing.md, alignItems: 'center' }} onPress={() => navigation.navigate('Login')}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Already have an account? <Text style={{ color: colors.primary, fontWeight: '600' }}>Sign in</Text>
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
});
