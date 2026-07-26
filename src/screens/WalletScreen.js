import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';

export default function WalletScreen({ navigation }) {
  const { colors, spacing, typography, radii } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      <Header title="Zanny Vault" onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        
        {/* Premium Glass Credit Card Design */}
        <View style={[styles.glassCard, { backgroundColor: colors.primary, borderRadius: radii.xl, shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20 }]}>
          <View style={styles.cardHeader}>
             <Ionicons name="planet-outline" size={24} color="rgba(255,255,255,0.8)" />
             <Text style={styles.cardLogo}>
                <Text style={{ fontStyle: 'italic', fontWeight: '900' }}>Z</Text>anny<Text style={{ fontWeight: '400' }}>Pay</Text>
             </Text>
          </View>
          
          <Text style={styles.cardLabel}>Global Balance</Text>
          <Text style={styles.cardBalance}>₦0.00</Text>
          
          <View style={styles.cardFooter}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="lock-closed" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.cardFooterText}>Encrypted Ledger</Text>
            </View>
            <Ionicons name="wifi" size={20} color="rgba(255,255,255,0.5)" style={{ transform: [{ rotate: '90deg' }] }} />
          </View>
        </View>

        <View style={styles.actionRow}>
          <WalletAction icon="arrow-up" label="Send" colors={colors} radii={radii} />
          <WalletAction icon="arrow-down" label="Receive" colors={colors} radii={radii} />
          <WalletAction icon="scan" label="Scan to Pay" colors={colors} radii={radii} />
          <WalletAction icon="add" label="Top Up" colors={colors} radii={radii} />
        </View>

        <View style={[styles.banner, { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radii.lg, borderColor: 'rgba(255,255,255,0.1)' }]}>
          <Ionicons name="flash" size={24} color={colors.primary} />
          <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)', marginLeft: spacing.md, flex: 1, fontSize: 13, lineHeight: 18 }]}>
            The native vault — seamless global transfers, bill splitting, and automated savings pots — activates fully in Phase 2.
          </Text>
        </View>

        <Text style={[typography.heading, { color: '#fff', marginTop: spacing.xl, marginBottom: spacing.md, fontSize: 18 }]}>
          Architecture Roadmap
        </Text>
        <RoadmapItem icon="swap-horizontal" title="Instant P2P Transfers" text="Send & request assets globally inside any chat thread." />
        <RoadmapItem icon="receipt-outline" title="Smart Contracts" text="Split bills in real-time with automated network execution." />
        <RoadmapItem icon="shield-checkmark-outline" title="Double-Entry Ledger" text="Institutional-grade fraud checks and immutable records." />
      </ScrollView>
    </SafeAreaView>
  );
}

function WalletAction({ icon, label, colors, radii }) {
  return (
    <TouchableOpacity style={{ alignItems: 'center' }}>
      <View style={[styles.actionBtn, { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radii.pill, borderColor: 'rgba(255,255,255,0.1)' }]}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 8, fontWeight: '600' }}>{label}</Text>
    </TouchableOpacity>
  );
}

function RoadmapItem({ icon, title, text }) {
  const { colors, spacing, typography, radii } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: radii.md }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ marginLeft: spacing.md, flex: 1 }}>
        <Text style={[typography.bodyStrong, { color: '#fff', fontSize: 14 }]}>{title}</Text>
        <Text style={[typography.caption, { color: 'rgba(255,255,255,0.5)', marginTop: 2 }]}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glassCard: { padding: 24, paddingBottom: 20, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  cardLogo: { color: '#fff', fontSize: 18, letterSpacing: 1 },
  cardLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  cardBalance: { color: '#fff', fontSize: 42, fontWeight: '800', marginTop: 4, letterSpacing: -1 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  cardFooterText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginLeft: 6, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 32, paddingHorizontal: 8 },
  actionBtn: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  banner: { flexDirection: 'row', alignItems: 'center', padding: 16, marginTop: 32, borderWidth: 1 },
});
