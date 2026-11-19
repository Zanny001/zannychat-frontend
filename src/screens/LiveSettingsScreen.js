import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '../components/GlassCard';
import { getCurrentUser } from '../services/api';
import { supabase, SUPABASE_ENABLED } from '../services/supabaseClient';
import { loadLivePreferences, saveLivePreferences, DEFAULT_LIVE_PREFERENCES } from '../services/livePreferences';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../utils/color';

const MODES = [
  { value: 'broadcast', label: 'Classic Broadcast', description: 'Creator-led video with optional guest stage', icon: 'radio-outline' },
  { value: 'video_chat', label: 'Video Chat', description: 'A multi-guest conversation with movable frames', icon: 'videocam-outline' },
  { value: 'audio_room', label: 'Audio Room', description: 'A voice-first room with guest seating', icon: 'people-outline' },
];
const AUDIENCES = [
  { value: 'public', label: 'Public', description: 'Discoverable by everyone', icon: 'earth-outline' },
  { value: 'followers', label: 'Followers', description: 'Only people who follow you', icon: 'people-outline' },
  { value: 'private', label: 'Invite only', description: 'You choose people from your chats', icon: 'lock-closed-outline' },
];
const CATEGORIES = [
  ['entertainment', 'Entertainment'], ['social', 'Social'], ['politics', 'Politics'],
  ['science', 'Science'], ['education', 'Education'], ['finance', 'Finance'],
  ['technology', 'Technology'], ['sports', 'Sports'], ['business', 'Business'],
  ['health', 'Health'], ['other', 'Other'],
];

export default function LiveSettingsScreen({ navigation }) {
  const { colors, spacing, radii, typography } = useTheme();
  const [preferences, setPreferences] = useState({ ...DEFAULT_LIVE_PREFERENCES });
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const user = await getCurrentUser();
      if (!user?.id) {
        setUserId(null);
        setPreferences({ ...DEFAULT_LIVE_PREFERENCES });
        setError('Sign in to manage your LIVE defaults.');
        return;
      }
      const next = await loadLivePreferences(user.id);
      const latestUser = await getCurrentUser();
      if (latestUser?.id !== user.id) return;
      setUserId(user.id);
      setPreferences(next);
      setSaved(false);
    } catch {
      setError('Your LIVE defaults could not be loaded. Please retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  useEffect(() => {
    if (!SUPABASE_ENABLED || !supabase?.auth?.onAuthStateChange) return undefined;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user?.id || null;
      if (nextUserId === userId) return;
      setUserId(nextUserId);
      setPreferences({ ...DEFAULT_LIVE_PREFERENCES });
      setSaved(false);
      setError(nextUserId ? '' : 'Sign in to manage your LIVE defaults.');
      setLoading(Boolean(nextUserId));
      if (nextUserId) Promise.resolve().then(() => load());
    });
    return () => data?.subscription?.unsubscribe?.();
  }, [load, userId]);

  const update = (key, value) => {
    setSaved(false);
    setPreferences((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    if (!userId || saving) return;
    setSaving(true);
    setError('');
    try {
      const latestUser = await getCurrentUser();
      if (latestUser?.id !== userId) throw new Error('Your account changed. Reload LIVE settings.');
      const result = await saveLivePreferences(userId, preferences);
      const confirmedUser = await getCurrentUser();
      if (confirmedUser?.id !== userId) throw new Error('Your account changed. Reload LIVE settings.');
      setPreferences(result);
      setSaved(true);
    } catch (e) {
      setError(e?.message || 'Your LIVE defaults could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const radio = (selected) => ({
    borderColor: selected ? colors.primary : colors.border,
    backgroundColor: selected ? hexToRgba(colors.primary, 0.10) : colors.surface,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl || 32, alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: 760, gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back to LIVE Hub" style={{ width: 48, height: 48, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '900', letterSpacing: 1.3 }]}>CREATOR CONTROLS</Text>
              <Text style={[typography.heading, { color: colors.textPrimary, fontSize: 25 }]}>LIVE settings</Text>
            </View>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: hexToRgba(colors.primary, 0.12), alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="options-outline" size={21} color={colors.primary} />
            </View>
          </View>

          <GlassCard glow contentStyle={{ padding: spacing.lg, gap: spacing.xs }}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 17 }]}>Your broadcast, your defaults</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 20 }]}>Choose what is preselected when you set up your next LIVE. These preferences are saved on this device for your signed-in account. They never change a LIVE that is already running.</Text>
          </GlassCard>

          {loading ? <View style={{ padding: spacing.xl, alignItems: 'center', gap: spacing.sm }}><ActivityIndicator color={colors.primary} /><Text style={[typography.caption, { color: colors.textSecondary }]}>Loading your LIVE settings…</Text></View> : null}
          {!!error ? <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}><Text accessibilityRole="alert" style={[typography.body, { color: colors.danger }]}>{error}</Text><TouchableOpacity onPress={load} accessibilityRole="button" accessibilityLabel="Retry loading LIVE settings" style={{ minHeight: 48, justifyContent: 'center' }}><Text style={[typography.bodyStrong, { color: colors.primary }]}>Try again</Text></TouchableOpacity></GlassCard> : null}

          {!loading && userId ? <>
            <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Default LIVE format</Text>
              {MODES.map((item) => {
                const selected = preferences.experienceMode === item.value;
                return <TouchableOpacity key={item.value} onPress={() => update('experienceMode', item.value)} accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={item.label} style={[{ minHeight: 64, borderWidth: 1, borderRadius: radii.md, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, radio(selected)]}>
                  <Ionicons name={item.icon} size={21} color={selected ? colors.primary : colors.textSecondary} />
                  <View style={{ flex: 1, minWidth: 0 }}><Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{item.label}</Text><Text style={[typography.caption, { color: colors.textSecondary }]}>{item.description}</Text></View>
                  <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={selected ? colors.primary : colors.textSecondary} />
                </TouchableOpacity>;
              })}
            </GlassCard>

            <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Default audience</Text>
              {AUDIENCES.map((item) => {
                const selected = preferences.visibility === item.value;
                return <TouchableOpacity key={item.value} onPress={() => update('visibility', item.value)} accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={item.label + ' audience'} style={[{ minHeight: 64, borderWidth: 1, borderRadius: radii.md, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, radio(selected)]}>
                  <Ionicons name={item.icon} size={21} color={selected ? colors.primary : colors.textSecondary} />
                  <View style={{ flex: 1, minWidth: 0 }}><Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{item.label}</Text><Text style={[typography.caption, { color: colors.textSecondary }]}>{item.description}</Text></View>
                  <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={selected ? colors.primary : colors.textSecondary} />
                </TouchableOpacity>;
              })}
              {preferences.visibility === 'private' ? <Text style={[typography.caption, { color: colors.textSecondary }]}>You will still need to select at least one chat contact before starting a private LIVE.</Text> : null}
            </GlassCard>

            <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Default discussion category</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                {CATEGORIES.map(([value, label]) => {
                  const selected = preferences.category === value;
                  return <TouchableOpacity key={value} onPress={() => update('category', value)} accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={label + ' category'} style={[{ minHeight: 44, paddingHorizontal: spacing.md, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, radio(selected)]}>
                    <Text style={[typography.caption, { color: selected ? colors.primary : colors.textPrimary, fontWeight: '800' }]}>{label}</Text>
                  </TouchableOpacity>;
                })}
              </View>
            </GlassCard>

            <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Allow approved guests by default</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 19 }]}>You remain in control of every request. The five-guest limit and server permissions still apply.</Text>
                </View>
                <Switch value={preferences.allowGuests} onValueChange={(value) => update('allowGuests', value)} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.surfaceElevated} accessibilityLabel="Allow approved guests by default" />
              </View>
            </GlassCard>

            <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.xs }}>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginBottom: spacing.xs }]}>More account controls</Text>
              {[
                { route: 'PrivacySecurity', label: 'Privacy & safety', detail: 'Blocked accounts and account protection', icon: 'shield-checkmark-outline' },
                { route: 'Notifications', label: 'Notification preferences', detail: 'Manage app notification delivery', icon: 'notifications-outline' },
                { route: 'Sessions', label: 'Devices & sessions', detail: 'Review active sign-ins', icon: 'phone-portrait-outline' },
              ].map((item) => <TouchableOpacity key={item.route} onPress={() => navigation.navigate(item.route)} accessibilityRole="button" accessibilityLabel={'Open ' + item.label} style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Ionicons name={item.icon} size={20} color={colors.primary} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{item.label}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>{item.detail}</Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color={colors.textSecondary} />
              </TouchableOpacity>)}
            </GlassCard>

            <TouchableOpacity onPress={save} disabled={saving || saved} accessibilityRole="button" accessibilityLabel="Save LIVE settings" accessibilityState={{ disabled: saving || saved, busy: saving }} style={{ minHeight: 52, borderRadius: radii.md, backgroundColor: saving || saved ? colors.border : colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm }}>
              {saving ? <ActivityIndicator color={colors.onPrimary} /> : <Ionicons name={saved ? 'checkmark-circle' : 'save-outline'} size={19} color={saved ? colors.textSecondary : colors.onPrimary} />}
              <Text style={[typography.bodyStrong, { color: saved ? colors.textSecondary : colors.onPrimary }]}>{saving ? 'Saving…' : saved ? 'Saved on this device' : 'Save LIVE defaults'}</Text>
            </TouchableOpacity>
          </> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
