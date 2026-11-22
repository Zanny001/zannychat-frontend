import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const { colors, spacing, typography, layout } = useTheme();
  const [openIndex, setOpenIndex] = useState(null);
  const [faqSearch, setFaqSearch] = useState('');
  const visibleFaq = FAQ.map((item, index) => ({ item, index })).filter(({ item }) => !faqSearch.trim() || (item.q + ' ' + item.a).toLowerCase().includes(faqSearch.trim().toLowerCase()));
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
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Help" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}>
        <GlassCard glow contentStyle={{ gap: spacing.md, paddingVertical: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              <Ionicons name="sparkles-outline" size={27} color={colors.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '900', letterSpacing: 1.15 }]}>HERE WHEN YOU NEED US</Text>
              <Text style={[typography.heading, { color: colors.textPrimary, fontSize: 21 }]}>A little help goes a long way.</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>{FAQ.length} quick answers · ZannyChat v{version}</Text>
            </View>
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 20 }]}>Find clear answers about your account, conversations, privacy and the features that make ZannyChat yours.</Text>
        </GlassCard>
        <View style={{ minHeight: 50, flexDirection: 'row', alignItems: 'center', borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.md }}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput value={faqSearch} onChangeText={(value) => { setFaqSearch(value); setOpenIndex(null); }} placeholder="Search help topics or answers" placeholderTextColor={colors.textSecondary} accessibilityLabel="Search help topics and answers" returnKeyType="search" style={[typography.body, { color: colors.textPrimary, flex: 1, minWidth: 0, paddingVertical: spacing.sm, paddingLeft: spacing.sm }]} />
          {faqSearch ? <TouchableOpacity onPress={() => { setFaqSearch(''); setOpenIndex(null); }} accessibilityRole="button" accessibilityLabel="Clear help search" style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="close-circle" size={18} color={colors.textSecondary} /></TouchableOpacity> : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xs }}>
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '900', letterSpacing: 1.1 }]}>COMMON QUESTIONS</Text>
          <Text style={[typography.small, { color: colors.textSecondary }]}>{visibleFaq.length} of {FAQ.length}</Text>
        </View>
        {visibleFaq.map(({ item, index }) => {
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
                <Text style={[typography.bodyStrong, { color: colors.textPrimary, flex: 1, minWidth: 0 }]}>{item.q}</Text>
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

        {visibleFaq.length === 0 ? <GlassCard contentStyle={{ padding: spacing.lg, alignItems: 'center', gap: spacing.sm }}>
          <Ionicons name="search-outline" size={26} color={colors.textSecondary} />
          <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>No matching help topics</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>Try another word or clear your search to browse all answers.</Text>
          <TouchableOpacity onPress={() => setFaqSearch('')} accessibilityRole="button" accessibilityLabel="Clear help search" style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md }}><Text style={[typography.bodyStrong, { color: colors.primary }]}>Clear search</Text></TouchableOpacity>
        </GlassCard> : null}
        <TouchableOpacity onPress={handleContact} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Contact ZannyChat support by email" style={{ minHeight: 52, justifyContent: 'center' }}>
          <GlassCard contentStyle={styles.contactRow} intensity={26}>
            <Ionicons name="mail-outline" size={20} color={colors.accent} />
            <Text style={[typography.body, { color: colors.textPrimary, flex: 1, minWidth: 0, marginLeft: spacing.sm }]}>
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
