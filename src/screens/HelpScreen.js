import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';

// The third dead Profile row from the audit, now a real screen: a
// small FAQ (the questions a new user actually hits — demo mode, mood
// themes, privacy) plus a real contact affordance.
const FAQ = [
  {
    q: 'Why does the chat list say "DEMO DATA"?',
    a: "ZannyChat isn't connected to its Supabase backend on this device, so it's running on built-in sample conversations. Everything on screen works, but nothing leaves your phone. Connect Supabase (see the README) to go live.",
  },
  {
    q: 'How do the mood themes work?',
    a: 'Every mood is two colors — a warm "signal" color that is always you, and a cool "thread" color that is always them. Pick one in Profile → Appearance & theme; it applies everywhere and is remembered between launches.',
  },
  {
    q: 'Who can read my messages?',
    a: 'Only the people in the conversation can read them through the app — access is enforced at the database row level. Messages are not end-to-end encrypted yet; see Profile → Privacy & security for the plain-spoken version.',
  },
  {
    q: 'What are the AI features?',
    a: 'The ✨ button in a chat summarizes the conversation, and suggested reply chips appear when someone writes to you. Both run on the ZannyChat backend and need it to have an Anthropic API key configured.',
  },
  {
    q: 'How do I block or report someone?',
    a: 'Open the chat, tap ⋮ in the header, and choose Block or Report. You can manage your block list any time in Profile → Privacy & security.',
  },
];

export default function HelpScreen({ navigation }) {
  const { colors, spacing, typography } = useTheme();
  const [openIndex, setOpenIndex] = useState(null);
  const version = Constants.expoConfig?.version || '1.0.0';

  async function handleContact() {
    const supportEmail = (process.env.EXPO_PUBLIC_SUPPORT_EMAIL || '').trim();
    if (!supportEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
      Alert.alert('Support contact unavailable', 'A support email has not been configured for this build.');
      return;
    }
    try {
      await Linking.openURL(`mailto:${supportEmail}?subject=ZannyChat%20support`);
    } catch (err) {
      Alert.alert('No mail app', 'No email app is set up on this device.');
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Help" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {FAQ.map((item, index) => {
          const open = openIndex === index;
          return (
            <GlassCard key={index} style={{ marginBottom: spacing.sm }} noPadding intensity={26}>
              <TouchableOpacity
                onPress={() => setOpenIndex(open ? null : index)}
                accessibilityLabel={item.q}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                style={[styles.faqRow, { padding: spacing.md }]}
              >
                <Text style={[typography.bodyStrong, { color: colors.textPrimary, flex: 1 }]}>{item.q}</Text>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              {open && (
                <Text
                  style={[
                    typography.caption,
                    { color: colors.textSecondary, lineHeight: 20, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
                  ]}
                >
                  {item.a}
                </Text>
              )}
            </GlassCard>
          );
        })}

        <TouchableOpacity onPress={handleContact} activeOpacity={0.8}>
          <GlassCard contentStyle={styles.contactRow} intensity={26}>
            <Ionicons name="mail-outline" size={20} color={colors.accent} />
            <Text style={[typography.body, { color: colors.textPrimary, flex: 1, marginLeft: spacing.sm }]}>
              Contact support
            </Text>
            <Ionicons name="open-outline" size={16} color={colors.textSecondary} />
          </GlassCard>
        </TouchableOpacity>

        <Text style={[typography.small, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg }]}>
          ZannyChat v{version}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  faqRow: { flexDirection: 'row', alignItems: 'center' },
  contactRow: { flexDirection: 'row', alignItems: 'center' },
});
