import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TextInput, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { getNotificationPrefs, getNotificationPrefsPersistenceError, loadNotificationPrefs, setNotificationPrefs } from '../services/notificationPrefs';
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
  const { colors, spacing, typography, layout } = useTheme();
  const [prefs, setPrefs] = useState(getNotificationPrefs());
  const [quietStartDraft, setQuietStartDraft] = useState(getNotificationPrefs().quietHoursStart || '22:00');
  const [quietEndDraft, setQuietEndDraft] = useState(getNotificationPrefs().quietHoursEnd || '08:00');
  const [browserCallPermission, setBrowserCallPermission] = useState(() => Platform.OS === 'web' && typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
  const [pushRegistrationState, setPushRegistrationState] = useState('unknown');
  const [pushActionBusy, setPushActionBusy] = useState(false);
  const [persistenceError, setPersistenceError] = useState(getNotificationPrefsPersistenceError());

  useEffect(() => {
    loadNotificationPrefs().then((loaded) => {
      setPrefs(loaded);
      setQuietStartDraft(loaded.quietHoursStart || '22:00');
      setQuietEndDraft(loaded.quietHoursEnd || '08:00');
      setPersistenceError(getNotificationPrefsPersistenceError());
    });
  }, []);

  async function update(patch) {
    const next = await setNotificationPrefs(patch);
    setPrefs({ ...next });
    const storageError = getNotificationPrefsPersistenceError();
    setPersistenceError(storageError);
    return !storageError;
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
    if (pushActionBusy || !SUPABASE_ENABLED) return;
    setPushActionBusy(true);
    try {
      if (value) {
        const saved = await update({ pushEnabled: true });
        if (!saved) return;
        const token = await registerForPushNotifications();
        setPushRegistrationState(token ? 'registered' : 'not_registered');
        if (!token) {
          Alert.alert(
            'Push not registered yet',
            Platform.OS === 'web'
              ? 'Remote push requires an installed native ZannyChat app. Browser incoming-call alerts are controlled separately above.'
              : 'Allow notification permission and use an installed development build on a physical device. ZannyChat will retry registration when the app starts.',
          );
        }
        return;
      }

      const removed = await unregisterPushNotifications();
      if (!removed) {
        setPushRegistrationState('removal_failed');
        Alert.alert('Could not turn off push', 'ZannyChat could not confirm removal of your server push tokens. Your setting remains on; please try again.');
        return;
      }
      await update({ pushEnabled: false });
      setPushRegistrationState('disabled');
    } catch (error) {
      setPushRegistrationState(value ? 'not_registered' : 'removal_failed');
      Alert.alert(
        value ? 'Push setup incomplete' : 'Could not turn off push',
        error?.message || 'Please check your connection and try again.',
      );
    } finally {
      setPushActionBusy(false);
    }
  }

  async function handleBrowserCallAlerts(value) {
    if (Platform.OS !== 'web' || typeof Notification === 'undefined') return;
    if (!value) {
      Alert.alert('Browser permission', 'To turn browser call alerts off, change ZannyChat notification permission in your browser site settings.');
      setBrowserCallPermission(Notification.permission);
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setBrowserCallPermission(permission);
      if (permission !== 'granted') {
        Alert.alert('Notifications not enabled', 'Allow notifications for ZannyChat in your browser site settings to receive call alerts when this tab is in the background.');
      }
    } catch (_) {
      setBrowserCallPermission(Notification.permission);
    }
  }

  const pushDetail = !SUPABASE_ENABLED
    ? 'Requires a connected account and backend.'
    : !prefs.pushEnabled
      ? 'Off — this account has no registered push tokens.'
      : pushRegistrationState === 'registered'
        ? 'Registered on this device; new messages can reach it.'
        : pushRegistrationState === 'not_registered'
          ? 'Enabled in settings, but this device is not registered yet.'
          : pushRegistrationState === 'removal_failed'
            ? 'Token removal could not be confirmed. Retry turning push off.'
            : 'Enabled in settings; device registration has not yet been confirmed.';

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Notifications" onBack={() => navigation.goBack()} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}>
        {persistenceError ? (
          <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.persistenceWarning, { backgroundColor: colors.surface, borderColor: colors.warning, marginBottom: spacing.md }]}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
            <View style={{ flex: 1, minWidth: 0, marginHorizontal: spacing.sm }}>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Device storage issue</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 19, marginTop: 3 }]}>{persistenceError}</Text>
              <TouchableOpacity onPress={() => update({})} accessibilityRole="button" accessibilityLabel="Try saving notification preferences again" style={styles.retryButton}>
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>Try saving again</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
        <GlassCard style={{ marginBottom: spacing.md }}>
          <PrefRow
            icon="notifications-outline"
            label="Push notifications"
            detail={pushDetail}
            value={prefs.pushEnabled && SUPABASE_ENABLED}
            disabled={!SUPABASE_ENABLED || pushActionBusy}
            onValueChange={handlePushToggle}
          />
          {Platform.OS === 'web' ? (
            <PrefRow
              icon="call-outline"
              label="Browser incoming call alerts"
              detail={browserCallPermission === 'granted'
                ? 'Allowed — incoming calls can alert while this tab is in the background'
                : browserCallPermission === 'denied'
                  ? 'Blocked — enable notifications in your browser site settings'
                  : 'Allow browser notifications for incoming calls'}
              value={browserCallPermission === 'granted'}
              disabled={browserCallPermission === 'unsupported'}
              onValueChange={handleBrowserCallAlerts}
            />
          ) : null}
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
            <View style={{ flex: 1, minWidth: 0, marginRight: spacing.md }}>
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
            <Text style={[typography.caption, { color: colors.textSecondary, flex: 1, minWidth: 0, marginLeft: spacing.sm, lineHeight: 20 }]}>
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
  persistenceWarning: { borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'flex-start' },
  retryButton: { minHeight: 48, alignSelf: 'flex-start', justifyContent: 'center', marginTop: 5, paddingRight: 12 },
  timeInput: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
});
