import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, Text, TouchableOpacity, View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../utils/color';
import { SUPABASE_ENABLED } from '../services/supabaseClient';
import { createPersonalDataExport } from '../services/personalDataExport';

export default function DataExportScreen({ navigation }) {
  const { colors, spacing, typography, mood } = useTheme();
  const [busy, setBusy] = useState(false);

  async function exportData() {
    if (!SUPABASE_ENABLED) {
      Alert.alert('Connect your account', 'Data export requires a live, signed-in Supabase account. Demo data is not exported.');
      return;
    }
    setBusy(true);
    try {
      const document = await createPersonalDataExport();
      const json = JSON.stringify(document, null, 2);
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const directory = FileSystem.cacheDirectory;
      if (!directory) throw new Error('Secure temporary file storage is unavailable on this device.');
      const uri = `${directory}zannychat-data-export-${stamp}.json`;
      await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Sharing unavailable', 'This device does not support sharing files, so your export was not delivered. Please try again on a device with file sharing enabled.');
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Export your ZannyChat data', UTI: 'public.json' });
    } catch (error) {
      Alert.alert('Export unavailable', error?.message || 'Your data could not be exported. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Export your data" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
        <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: hexToRgba(colors.textPrimary, 0.1) }]}>
          <View style={[styles.orb, { backgroundColor: hexToRgba(mood.signal, 0.2), top: -56, right: -44 }]} />
          <View style={[styles.orb, { backgroundColor: hexToRgba(mood.thread, 0.16), bottom: -76, left: 42, width: 150, height: 150 }]} />
          <View style={[styles.iconTile, { backgroundColor: hexToRgba(mood.signal, 0.13), borderColor: hexToRgba(mood.signal, 0.25) }]}>
            <Ionicons name="cloud-download-outline" size={27} color={mood.signal} />
          </View>
          <Text style={[typography.display, { color: colors.textPrimary, marginTop: 20 }]}>Your data, in your hands.</Text>
          <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 23, marginTop: 9 }]}>Create a portable JSON copy of the account and chat data this signed-in account can currently read.</Text>
          <View style={[styles.badge, { backgroundColor: hexToRgba(mood.thread, 0.1), borderColor: hexToRgba(mood.thread, 0.22) }]}>
            <Ionicons name="shield-checkmark-outline" size={15} color={mood.thread} />
            <Text style={[typography.small, { color: colors.textPrimary, marginLeft: 7 }]}>Prepared on request · shared only when you choose</Text>
          </View>
        </View>

        <Text style={[typography.heading, { color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm }]}>Included in your export</Text>
        <GlassCard style={{ marginBottom: spacing.sm }}>
          <InfoRow icon="person-outline" title="Account & profile" detail="Account ID, email, profile details and avatar reference." />
          <InfoRow icon="chatbubbles-outline" title="Conversations" detail="Your memberships, conversation metadata and readable message history." />
          <InfoRow icon="options-outline" title="Local preferences" detail="Saved photo-quality and data-saver preferences from this device." />
        </GlassCard>
        <GlassCard style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Ionicons name="information-circle-outline" size={19} color={mood.signal} style={{ marginTop: 1 }} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>What isn't included</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 21, marginTop: 5 }]}>Actual attachment files and private media URLs are excluded. Message text visible to this account is included, including messages from other participants in your conversations. Keep the exported file private: it may contain sensitive conversations.</Text>
            </View>
          </View>
        </GlassCard>

        <TouchableOpacity
          onPress={exportData}
          disabled={busy || !SUPABASE_ENABLED}
          accessibilityRole="button"
          accessibilityLabel="Create and share my ZannyChat data export"
          accessibilityState={{ disabled: busy || !SUPABASE_ENABLED, busy }}
          style={[styles.primaryButton, { backgroundColor: mood.signal, opacity: busy || !SUPABASE_ENABLED ? 0.55 : 1 }]}
        >
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="download-outline" size={19} color="#FFFFFF" />}
          <Text style={[typography.bodyStrong, { color: '#FFFFFF', marginLeft: 9 }]}>{busy ? 'Preparing your export…' : 'Create data export'}</Text>
        </TouchableOpacity>
        {!SUPABASE_ENABLED && <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: 10 }]}>Connect a live Supabase project to export account data. Demo mode is intentionally disabled.</Text>}
        <Text style={[typography.small, { color: colors.textSecondary, textAlign: 'center', marginTop: 16, lineHeight: 19 }]}>The file is written to temporary app storage, then shared through your device's share sheet. ZannyChat does not upload the export file.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, title, detail }) {
  const { colors, spacing, typography, mood } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing.sm }}>
      <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: hexToRgba(mood.thread, 0.11), alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={19} color={mood.thread} />
      </View>
      <View style={{ flex: 1, marginLeft: 11 }}>
        <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 19, marginTop: 3 }]}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 28, borderWidth: 1, padding: 22, overflow: 'hidden', minHeight: 310 },
  orb: { position: 'absolute', width: 190, height: 190, borderRadius: 100 },
  iconTile: { width: 52, height: 52, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 11, marginTop: 20 },
  primaryButton: { minHeight: 54, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
});
