import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';

// Deliberately a UI-only preview: no balances shown here are real, and
// no payment processing happens in this build. The Phase 2 backend
// (Supabase Edge Functions + a payments provider) is what will turn
// this into a functioning wallet — see the roadmap in the backend
// README once it's built.
export default function WalletScreen({ navigation }) {
  const { colors, spacing, typography, radii } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Wallet" onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={[styles.card, { backgroundColor: colors.primary, borderRadius: radii.lg }]}>
          <Text style={styles.cardLabel}>Available balance</Text>
          <Text style={styles.cardBalance}>₦0.00</Text>
          <View style={styles.cardFooter}>
            <Ionicons name="sparkles-outline" size={16} color="rgba(255,255,255,0.85)" />
            <Text style={styles.cardFooterText}>Preview — Phase 2</Text>
          </View>
        </View>

        <View style={[styles.banner, { backgroundColor: colors.surfaceAlt, borderRadius: radii.md }]}>
          <Ionicons name="construct-outline" size={20} color={colors.accent} />
          <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: spacing.sm, flex: 1 }]}>
            The native wallet — send/request money, split bills, and group savings pots — connects once the
            backend's payments layer is built.
          </Text>
        </View>

        <Text style={[typography.heading, { color: colors.textPrimary, marginTop: spacing.lg, marginBottom: spacing.sm }]}>
          What's coming
        </Text>
        <RoadmapItem icon="swap-horizontal" text="Send & request money inside any chat" />
        <RoadmapItem icon="receipt-outline" text="Split bills in real time with a group" />
        <RoadmapItem icon="people-outline" text="Shared savings pots for groups" />
        <RoadmapItem icon="shield-checkmark-outline" text="Fraud checks & a double-entry ledger" />
      </ScrollView>
    </SafeAreaView>
  );
}

function RoadmapItem({ icon, text }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
      <Ionicons name={icon} size={18} color={colors.textSecondary} />
      <Text style={[typography.body, { color: colors.textSecondary, marginLeft: spacing.sm }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20 },
  cardLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  cardBalance: { color: '#fff', fontSize: 34, fontWeight: '700', marginTop: 6 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  cardFooterText: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginLeft: 6 },
  banner: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, marginTop: 16 },
});
