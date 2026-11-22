import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTheme } from '../theme/ThemeContext';
import Avatar from '../components/Avatar';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { hexToRgba } from '../utils/color';
import { getCurrentUser } from '../services/api';
import { backendFetch } from '../services/backendClient';
import LiveImpactCard from '../components/LiveImpactCard';

export default function ProfileScreen({ navigation }) {
  const { colors, spacing, typography, mood, layout } = useTheme();
  const [user, setUser] = useState(null);
  const [liveImpact, setLiveImpact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const tabBarHeight = useBottomTabBarHeight();

  // Refresh on focus, ignore stale responses, and provide a retry path.
  // Keep LIVE impact loading independent so an impact-service outage never
  // makes the account profile itself appear unavailable.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setProfileError('');
      // Do not keep another account's profile or LIVE impact visible while
      // the current session's profile request is resolving.
      setUser(null);
      setLiveImpact(null);
      (async () => {
        try {
          const profile = await getCurrentUser();
          if (!active) return;
          setUser(profile || null);
          if (!profile?.id) {
            setLiveImpact(null);
            return;
          }
          try {
            const result = await backendFetch(`/live/creators/${profile.id}/impact`);
            if (active) setLiveImpact(result?.impact || null);
          } catch (_) {
            if (active) setLiveImpact(null);
          }
        } catch (_) {
          if (active) {
            setUser(null);
            setProfileError("We couldn't load your profile. Check your connection and try again.");
            setLiveImpact(null);
          }
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => { active = false; };
    }, [reloadKey])
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      <Header eyebrow="YOUR IDENTITY" title="Profile" brand />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: tabBarHeight + spacing.lg, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}>
        {profileError ? (
          <GlassCard style={{ marginBottom: spacing.md }} contentStyle={{ padding: spacing.md, gap: spacing.xs }}>
            <Text accessibilityRole="alert" style={[typography.caption, { color: colors.textPrimary }]}>{profileError}</Text>
            <Pressable
              onPress={() => setReloadKey((value) => value + 1)}
              accessibilityRole="button"
              accessibilityLabel="Retry loading your profile"
              style={({ pressed }) => [{ minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' }, pressed && { opacity: 0.7 }]}
            >
              <Text style={[typography.bodyStrong, { color: colors.primary }]}>Try again</Text>
            </Pressable>
          </GlassCard>
        ) : null}
        {loading && !user ? (
          <View style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Loading your profile…</Text>
          </View>
        ) : null}
        <GlassCard style={{ marginBottom: spacing.lg, borderRadius: 28 }} contentStyle={{ padding: 20 }} intensity={44} tintAlpha={0.56}>
          <View style={[styles.heroGlow, { backgroundColor: hexToRgba(mood.signal, 0.14) }]} />
          <View style={[styles.heroGlowSecondary, { backgroundColor: hexToRgba(mood.thread, 0.12) }]} />
          <View style={styles.profileHeroTop}>
            <View style={[styles.avatarHalo, { borderColor: hexToRgba(mood.signal, 0.52), backgroundColor: hexToRgba(mood.signal, 0.08) }]}>
              <Avatar name={user?.name || 'You'} color={user?.avatarColor || colors.primary} size={76} imageUrl={user?.avatarUrl || user?.avatar_url} />
              <View style={[styles.avatarStatus, { backgroundColor: colors.online, borderColor: colors.surface }]} />
            </View>
            <View style={{ flex: 1, minWidth: 0, marginLeft: 16 }}>
              <Text style={[typography.small, { color: mood.thread, letterSpacing: 1.2 }]}>YOUR SPACE</Text>
              <Text style={[typography.title, { color: colors.textPrimary, marginTop: 4 }]} numberOfLines={2}>{user?.name || 'You'}</Text>
              {user?.username ? <Text style={[typography.caption, { color: colors.accent, marginTop: 3 }]} numberOfLines={1}>@{user.username}</Text> : <Text style={[typography.caption, { color: colors.danger, marginTop: 3 }]}>Set your username so people can find you</Text>}
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 5 }]} numberOfLines={2}>{user?.status || 'Hey there, I’m using ZannyChat'}</Text>
            </View>
          </View>
          <View style={[styles.profileDivider, { backgroundColor: colors.border }]} />
          <View style={styles.profileActions}>
            <Pressable
              style={({ pressed }) => [styles.profileAction, { backgroundColor: hexToRgba(mood.signal, 0.13), borderColor: hexToRgba(mood.signal, 0.24) }, pressed && { opacity: 0.72 }]}
              onPress={() => navigation.navigate('EditProfile')}
              accessibilityRole="button"
              accessibilityLabel="Edit your profile"
            >
              <Ionicons name="pencil-outline" size={16} color={mood.signal} />
              <Text numberOfLines={1} style={[typography.small, { color: colors.textPrimary, marginLeft: 7, flexShrink: 1 }]}>Edit profile</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.profileAction, { backgroundColor: hexToRgba(mood.thread, 0.1), borderColor: hexToRgba(mood.thread, 0.2) }, pressed && { opacity: 0.72 }]}
              onPress={() => navigation.navigate('QRContact')}
              accessibilityRole="button"
              accessibilityLabel="Show your contact QR code"
            >
              <Ionicons name="qr-code-outline" size={16} color={mood.thread} />
              <Text numberOfLines={1} style={[typography.small, { color: colors.textPrimary, marginLeft: 7, flexShrink: 1 }]}>My QR code</Text>
            </Pressable>
          </View>
        </GlassCard>
        <LiveImpactCard impact={liveImpact} showEmpty />
        <Text style={[typography.small, { color: colors.textSecondary, marginBottom: spacing.sm, marginLeft: 4, letterSpacing: 1.1 }]}>PERSONALIZE & PROTECT</Text>
        <MenuRow icon="color-palette-outline" label="Appearance & theme" description="Colours, motion and comfortable reading" onPress={() => navigation.navigate('Settings')} />
        <MenuRow icon="shield-checkmark-outline" label="Privacy & security" description="Control who sees you and how your account is protected" onPress={() => navigation.navigate('PrivacySecurity')} />
        <MenuRow icon="notifications-outline" label="Notifications" description="Choose the alerts that matter to you" onPress={() => navigation.navigate('Notifications')} />
        <Text style={[typography.small, { color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.sm, marginLeft: 4, letterSpacing: 1.1 }]}>YOUR CONTENT & COMMUNITY</Text>
        <MenuRow icon="aperture-outline" label="Status updates" description="Share moments with your chosen audience" onPress={() => navigation.navigate('StatusUpdates')} />
        <MenuRow icon="megaphone-outline" label="Channels" description="Discover conversations and communities" onPress={() => navigation.navigate('Channels')} />
        <MenuRow icon="bookmark-outline" label="Saved messages" description="Your private library of important moments" onPress={() => navigation.navigate('SavedMessages')} />
        <MenuRow icon="time-outline" label="Scheduled messages" description="Messages you have planned for later" onPress={() => navigation.navigate('ScheduledMessages')} />
        <MenuRow icon="folder-outline" label="Chat folders" description="Organize conversations your way" onPress={() => navigation.navigate('ChatFolders')} />
        <MenuRow icon="people-outline" label="Join a group" description="Find a space to connect and collaborate" onPress={() => navigation.navigate('JoinGroup')} />
        <Text style={[typography.small, { color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.sm, marginLeft: 4, letterSpacing: 1.1 }]}>SUPPORT & STORAGE</Text>
        <MenuRow icon="cloud-upload-outline" label="Data & storage" description="Manage media, downloads and storage use" onPress={() => navigation.navigate('DataStorage')} />
        <MenuRow icon="help-circle-outline" label="Help" description="Guidance and support for ZannyChat" onPress={() => navigation.navigate('Help')} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuRow({ icon, label, description, onPress }) {
  const { colors, spacing, typography, mood, radii } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={description || `Opens ${label.toLowerCase()}`}
      style={({ pressed }) => [
        styles.menuPressable,
        pressed && { opacity: 0.78, transform: [{ scale: 0.992 }] },
      ]}
    >
      <GlassCard style={{ marginBottom: spacing.sm, borderRadius: radii.lg }} contentStyle={styles.row} intensity={30}>
        <View style={[styles.menuIconWell, { backgroundColor: hexToRgba(mood.signal, 0.12), borderColor: hexToRgba(mood.signal, 0.2), borderRadius: radii.md }]}>
          <Ionicons name={icon} size={20} color={mood.signal} />
        </View>
        <View style={{ flex: 1, minWidth: 0, marginLeft: spacing.md }}>
          <Text style={[typography.bodyStrong, { color: colors.textPrimary }]} numberOfLines={1}>{label}</Text>
          {description ? <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]} numberOfLines={2}>{description}</Text> : null}
        </View>
        <View style={[styles.menuChevron, { borderColor: colors.border, backgroundColor: hexToRgba(colors.surface, 0.72) }]}>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heroGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, top: -86, right: -54 },
  heroGlowSecondary: { position: 'absolute', width: 112, height: 112, borderRadius: 56, bottom: -64, left: 40 },
  profileHeroTop: { flexDirection: 'row', alignItems: 'center' },
  avatarHalo: { width: 88, height: 88, borderRadius: 44, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  avatarStatus: { position: 'absolute', right: 2, bottom: 3, width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  profileDivider: { height: StyleSheet.hairlineWidth, marginVertical: 18 },
  profileActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  profileAction: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11, flex: 1, minWidth: 132 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 72, paddingHorizontal: 14, paddingVertical: 12 },
  menuPressable: { borderRadius: 18 },
  menuIconWell: { width: 42, height: 42, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  menuChevron: { width: 30, height: 30, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
});
