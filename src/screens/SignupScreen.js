import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { signUpWithEmail } from '../services/api';
import GlassInput from '../components/GlassInput';
import Knot from '../components/Knot';

export default function SignupScreen({ navigation }) {
  const { colors, mood, spacing, typography, radii } = useTheme();
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
          <Knot size={40} signalColor={mood.signal} threadColor={mood.thread} strokeWidth={7} />
          <Text style={[typography.title, { color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.xs }]}>
            Create your account
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
            Join ZannyChat in under a minute.
          </Text>

          <GlassInput value={name} onChangeText={setName} placeholder="Full name" />
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
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Creating account…' : 'Create account'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ marginTop: spacing.md, alignItems: 'center' }} onPress={() => navigation.navigate('Login')}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Already have an account? <Text style={{ color: colors.primary, fontFamily: 'Manrope_700Bold' }}>Sign in</Text>
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
