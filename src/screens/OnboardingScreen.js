import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export default function OnboardingScreen({ navigation }) {
  const { colors, spacing, typography, radii } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#0a0a1a' }]}>
      
      {/* Decorative Blur Effect Background */}
      <View style={[StyleSheet.absoluteFillObject, { overflow: 'hidden' }]}>
         <View style={[styles.orb, { backgroundColor: colors.primary, top: '10%', left: '-20%' }]} />
         <View style={[styles.orb, { backgroundColor: colors.accent, bottom: '20%', right: '-30%' }]} />
      </View>

      <View style={styles.hero}>
        <View style={[styles.logoGlass, { borderColor: 'rgba(255,255,255,0.2)' }]}>
          <Text style={{ color: colors.primary, fontWeight: '900', fontStyle: 'italic', fontSize: 42 }}>Z</Text>
        </View>
        <Text style={[typography.display, { color: '#fff', marginTop: spacing.xl, textAlign: 'center', fontWeight: '800' }]}>
          ZannyChat
        </Text>
        <Text style={[typography.body, { color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: spacing.sm, fontSize: 16 }]}>
          The world's most advanced secure global dashboard.
        </Text>
      </View>

      <View style={{ paddingHorizontal: spacing.xl }}>
        <Feature icon="shield-checkmark" title="Military-Grade Encryption" text="Zero-knowledge, peer-to-peer security." />
        <Feature icon="globe-outline" title="Global Network" text="Connect across borders without limits." />
        <Feature icon="wallet" title="Integrated Vault" text="Send funds directly inside any chat." />
      </View>

      <View style={{ padding: spacing.xl }}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary, borderRadius: radii.pill, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12 }]}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.primaryBtnText}>Initialize Secure Link</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: spacing.lg, alignItems: 'center' }} onPress={() => navigation.navigate('Signup')}>
          <Text style={[typography.caption, { color: 'rgba(255,255,255,0.6)', fontSize: 14 }]}>
            New to the network? <Text style={{ color: colors.primary, fontWeight: '700' }}>Register ID</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Feature({ icon, title, text }) {
  const { colors, spacing, typography, radii } = useTheme();
  return (
    <View style={[styles.featureCard, { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radii.lg, borderColor: 'rgba(255,255,255,0.08)' }]}>
      <View style={[styles.featureIcon, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ marginLeft: spacing.md, flex: 1 }}>
        <Text style={[typography.bodyStrong, { color: '#fff', fontSize: 15 }]}>{title}</Text>
        <Text style={[typography.caption, { color: 'rgba(255,255,255,0.5)', marginTop: 2 }]}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between' },
  orb: { width: 400, height: 400, borderRadius: 200, position: 'absolute', opacity: 0.15, transform: [{ scale: 1.2 }] },
  hero: { alignItems: 'center', marginTop: 64, paddingHorizontal: 24, zIndex: 1 },
  logoGlass: { width: 96, height: 96, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1 },
  featureCard: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 12, borderWidth: 1 },
  featureIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { paddingVertical: 18, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16, textTransform: 'uppercase', letterSpacing: 1 },
});
