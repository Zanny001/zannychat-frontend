import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import Knot from '../components/Knot';
import GlassCard from '../components/GlassCard';

export default function OnboardingScreen({ navigation }) {
  const { colors, mood, spacing, typography, radii, layout } = useTheme();

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ flex: 1, width: '100%', maxWidth: layout.formMaxWidth, alignSelf: 'center', justifyContent: 'space-between' }}>
      <View style={styles.hero}>
        <Text style={[typography.caption, { color: colors.accent, letterSpacing: 1.8, marginBottom: spacing.md }]}>A MORE THOUGHTFUL WAY TO CONNECT</Text>
        <Knot size={116} signalColor={mood.signal} threadColor={mood.thread} strokeWidth={11} animated />
        <Text style={[typography.display, { color: colors.textPrimary, marginTop: spacing.lg, textAlign: 'center' }]}>
          ZannyChat
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, maxWidth: 260 }]}>
          Your people. Your moments. Your space.
        </Text>
      </View>

      <GlassCard intensity={18} style={{ marginHorizontal: spacing.lg, padding: spacing.md }}>
        <Text style={[typography.caption, { color: colors.accent, letterSpacing: 1.3, marginBottom: spacing.md }]}>MADE FOR YOUR EVERYDAY</Text>
        <Feature icon="lock-closed" text="Private by default — chat access is limited to approved participants" />
        <Feature icon="people" text="Group chats, voice notes & real attachments" />
        <Feature icon="sparkles" text="Smart replies, translation & summaries" />
        <Feature icon="color-palette" text="A theme that's actually got range" />
      </GlassCard>

      <View style={{ padding: spacing.lg }}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary, borderRadius: radii.pill, minHeight: 56, justifyContent: 'center' }]}
          onPress={() => navigation.navigate('Login')}
          accessibilityRole="button"
          accessibilityLabel="Get started and sign in"
        >
          <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>Get started</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: spacing.md, alignItems: 'center' }} onPress={() => navigation.navigate('Signup')} accessibilityRole="button" accessibilityLabel="Create a new account">
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            New here? <Text style={{ color: colors.primary, fontFamily: 'Manrope_700Bold' }}>Create an account</Text>
          </Text>
        </TouchableOpacity>
      </View>
      </View>
    </SafeAreaView>
  );
}

function Feature({ icon, text }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
      <View style={[styles.featureIcon, { backgroundColor: colors.surface }]} accessible={false} importantForAccessibility="no">
        <Ionicons name={icon} size={18} color={colors.accent} />
      </View>
      <Text style={[typography.body, { color: colors.textPrimary, marginLeft: spacing.sm, flex: 1, minWidth: 0 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between' },
  hero: { alignItems: 'center', marginTop: 24, paddingHorizontal: 24 },
  featureIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center' },
  primaryBtnText: { fontFamily: 'Manrope_700Bold', fontSize: 16 },
});
