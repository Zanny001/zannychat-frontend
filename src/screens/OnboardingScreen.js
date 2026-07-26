import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export default function OnboardingScreen({ navigation }) {
  const { colors, spacing, typography, radii } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.hero}>
        <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
          <Ionicons name="chatbubbles" size={40} color="#fff" />
        </View>
        <Text style={[typography.display, { color: colors.textPrimary, marginTop: spacing.lg, textAlign: 'center' }]}>
          ZannyChat
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }]}>
          Chat, pay, and connect — all in one place.
        </Text>
      </View>

      <View style={{ paddingHorizontal: spacing.lg }}>
        <Feature icon="lock-closed" text="End-to-end encrypted, always" />
        <Feature icon="wallet" text="Send money without leaving the chat" />
        <Feature icon="sparkles" text="AI replies, translation & summaries" />
        <Feature icon="color-palette" text="A theme engine that's actually yours" />
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
            New here? <Text style={{ color: colors.primary, fontWeight: '600' }}>Create an account</Text>
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
  hero: { alignItems: 'center', marginTop: 48, paddingHorizontal: 24 },
  logoCircle: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  featureIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { paddingVertical: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
