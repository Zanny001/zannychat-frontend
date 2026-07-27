import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import Knot from '../components/Knot';

export default function OnboardingScreen({ navigation }) {
  const { colors, mood, spacing, typography, radii } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.hero}>
        <Knot size={132} signalColor={mood.signal} threadColor={mood.thread} strokeWidth={11} animated />
        <Text style={[typography.display, { color: colors.textPrimary, marginTop: spacing.lg, textAlign: 'center' }]}>
          ZannyChat
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, maxWidth: 260 }]}>
          Two threads, one conversation. Chat, pay, and stay connected.
        </Text>
      </View>

      <View style={{ paddingHorizontal: spacing.lg }}>
        <Feature icon="lock-closed" text="Encrypted the moment you hit send" />
        <Feature icon="wallet" text="Send money without leaving the chat" />
        <Feature icon="sparkles" text="Smart replies, translation & summaries" />
        <Feature icon="color-palette" text="A theme that's actually got range" />
      </View>

      <View style={{ padding: spacing.lg }}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary, borderRadius: radii.pill }]}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.primaryBtnText}>Get started</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: spacing.md, alignItems: 'center' }} onPress={() => navigation.navigate('Signup')}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            New here? <Text style={{ color: colors.primary, fontFamily: 'Manrope_700Bold' }}>Create an account</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Feature({ icon, text }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
      <View style={[styles.featureIcon, { backgroundColor: colors.surface }]}>
        <Ionicons name={icon} size={18} color={colors.accent} />
      </View>
      <Text style={[typography.body, { color: colors.textPrimary, marginLeft: spacing.sm }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between' },
  hero: { alignItems: 'center', marginTop: 40, paddingHorizontal: 24 },
  featureIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { paddingVertical: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 16 },
});
