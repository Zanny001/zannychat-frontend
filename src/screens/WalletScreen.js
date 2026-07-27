import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import { fetchWalletBalance } from '../services/api';

function formatBalance(balance) {
  const symbol = balance.currency === 'NGN' ? '₦' : `${balance.currency} `;
  return `${symbol}${Number(balance.balance).toFixed(2)}`;
}

// Gold is used nowhere else in the app — money gets its own visual
// language, distinct from the signal/thread pair that means "you" and
// "them" everywhere else. Once the backend is connected,
// fetchWalletBalance() returns a real ledger balance; until then it
// returns null and this shows a styled preview instead. No real
// payment processing happens in this build either way.
export default function WalletScreen({ navigation }) {
  const { colors, mood, spacing, typography, radii } = useTheme();
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    fetchWalletBalance()
      .then(setBalance)
      .catch(() => setBalance(null));
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Wallet" onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={[styles.card, { backgroundColor: mood.gold, borderRadius: radii.lg }]}>
          <Text style={[typography.small, styles.cardLabel]}>AVAILABLE BALANCE</Text>
          <Text style={[typography.numeric, styles.cardBalance]}>{balance ? formatBalance(balance) : '₦0.00'}</Text>
          <View style={styles.cardFooter}>
            <Ionicons
              name={balance ? 'checkmark-circle-outline' : 'sparkles-outline'}
              size={16}
              color="rgba(21,17,28,0.65)"
            />
            <Text style={[typography.caption, styles.cardFooterText]}>
              {balance ? 'Live from your wallet' : 'Preview — Phase 2'}
            </Text>
          </View>
        </View>

        <View style={[styles.banner, { backgroundColor: colors.surfaceAlt, borderRadius: radii.md }]}>
          <Ionicons name="construct-outline" size={20} color={colors.accent} />
          <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: spacing.sm, flex: 1 }]}>
            Send/request money, split bills, and group savings pots connect once the backend's payments layer
            is live.
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
  cardLabel: { color: 'rgba(21,17,28,0.65)' },
  cardBalance: { color: '#15111C', marginTop: 8 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  cardFooterText: { color: 'rgba(21,17,28,0.7)', marginLeft: 6 },
  banner: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, marginTop: 16 },
});
