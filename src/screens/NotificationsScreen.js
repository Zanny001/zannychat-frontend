import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Switch, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { getNotificationPrefs, loadNotificationPrefs, setNotificationPrefs } from '../services/notificationPrefs';
import { registerForPushNotifications, unregisterPushNotifications } from '../services/notifications';
import { SUPABASE_ENABLED } from '../services/supabaseClient';
import { parseClockTime } from '../utils/quietHours';

// The second of the three dead Profile rows from the audit, now real.
// Every toggle here does something true:
//   * Push notifications — actually registers/removes this account's
//     push tokens server-side, not just a visual switch.
//   * Banners / sounds — read live by the foreground notification
//     handler in notifications.js.
//   * Per-conversation mute is deliberately NOT here — it lives in each
//     chat's ⋮ menu, and is enforced server-side (a muted conversation
//     never triggers a push to you at all).
export default function NotificationsScreen({ navigation }) {
  const { colors, spacing, typography } = useTheme();
  const [prefs, setPrefs] = useState(getNotificationPrefs());
  const [quietStartDraft, setQuietStartDraft] = useState(getNotificationPrefs().quietHoursStart || '22:00');
  const [quietEndDraft, setQuietEndDraft] = useState(getNotificationPrefs().quietHoursEnd || '08:00');

  useEffect(() => {
    loadNotificationPrefs().then((loaded) => {
      setPrefs(loaded);
      setQuietStartDraft(loaded.quietHoursStart || '22:00');
      setQuietEndDraft(loaded.quietHoursEnd || '08:00');
    });
  }, []);

  async function update(patch) {
    const next = await setNotificationPrefs(patch);
    setPrefs({ ...next });
  }

  async function saveQuietTime(field, value) {
    const normalized = String(value || '').trim();
    if (parseClockTime(normalized) === null) {
      Alert.alert('Use 24-hour time', 'Enter a valid time in HH:MM format, such as 22:00 or 08:00.');
      setQuietStartDraft(prefs.quietHoursStart || '22:00');
      setQuietEndDraft(prefs.quietHoursEnd || '08:00');
      return;
    }
    if (field === 'quietHoursStart' && normalized === (prefs.quietHoursEnd || '08:00') || field === 'quietHoursEnd' && normalized === (prefs.quietHoursStart || '22:00')) {
      Alert.alert('Choose two different times', 'The start and end of quiet hours must be different.');
      setQuietStartDraft(prefs.quietHoursStart || '22:00');
      setQuietEndDraft(prefs.quietHoursEnd || '08:00');
      return;
    }
    await update({ [field]: normalized });
  }

  async function handlePushToggle(value) {
    await update({ pushEnabled: value });
    if (!SUPABASE_ENABLED) return;
    if (value) {
      registerForPushNotifications();
    } else {
      unregisterPushNotifications();
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Notifications" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <GlassCard style={{ marginBottom: spacing.md }}>
          <PrefRow
            icon="notifications-outline"
            label="Push notifications"
            detail={SUPABASE_ENABLED ? 'New messages reach this device' : 'Requires a connected backend (demo mode)'}
            value={prefs.pushEnabled && SUPABASE_ENABLED}
            disabled={!SUPABASE_ENABLED}
            onValueChange={handlePushToggle}
          />
          <PrefRow
            icon="albums-outline"
            label="Banners while using the app"
            detail="Show a banner for messages that arrive while ZannyChat is open"
            value={prefs.bannersEnabled}
            onValueChange={(v) => update({ bannersEnabled: v })}
          />
          <PrefRow
            icon="volume-high-outline"
            label="Sounds"
            detail="Play a sound with incoming notifications"
            value={prefs.soundEnabled}
            onValueChange={(v) => update({ soundEnabled: v })}
            last
          />
        </GlassCard>

        <GlassCard style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Quiet hours</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>Silence banners and sounds while the app is open</Text>
            </View>
            <Switch
              value={Boolean(prefs.quietHoursEnabled)}
              onValueChange={(value) => update({ quietHoursEnabled: value })}
              trackColor={{ true: colors.primary }}
              accessibilityLabel="Enable quiet hours"
              accessibilityRole="switch"
            />
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>Start</Text>
              <TextInput
                value={quietStartDraft}
                onChangeText={setQuietStartDraft}
                onEndEditing={() => saveQuietTime('quietHoursStart', quietStartDraft)}
                placeholder="22:00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                returnKeyType="done"
                accessibilityLabel="Quiet hours start time, 24-hour HH:MM"
                style={[typography.body, styles.timeInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>End</Text>
              <TextInput
                value={quietEndDraft}
                onChangeText={setQuietEndDraft}
                onEndEditing={() => saveQuietTime('quietHoursEnd', quietEndDraft)}
                placeholder="08:00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                returnKeyType="done"
                accessibilityLabel="Quiet hours end time, 24-hour HH:MM"
                style={[typography.body, styles.timeInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
              />
            </View>
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 19 }]}>
            Uses your device's local time. This only suppresses banners and sounds while ZannyChat is open; background push alerts are controlled by your device and notification service.
          </Text>
        </GlassCard>

        <GlassCard>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Ionicons name="volume-mute-outline" size={18} color={colors.accent} style={{ marginTop: 1 }} />
            <Text style={[typography.caption, { color: colors.textSecondary, flex: 1, marginLeft: spacing.sm, lineHeight: 20 }]}>
              To mute one conversation, open it and tap ⋮ → Mute. Conversation mute is separate from these device-level presentation settings.
            </Text>
          </View>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function PrefRow({ icon, label, detail, value, onValueChange, disabled, last }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={[styles.row, { marginBottom: last ? 0 : spacing.md, opacity: disabled ? 0.5 : 1 }]}>
      <Ionicons name={icon} size={20} color={colors.accent} style={{ marginRight: spacing.sm }} />
      <View style={{ flex: 1 }}>
        <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{label}</Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{detail}</Text>
      </View>
      <Switch
        value={Boolean(value)}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: colors.primary }}
        accessibilityLabel={label}
        accessibilityRole="switch"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  timeInput: { minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
});
