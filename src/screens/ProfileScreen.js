import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTheme } from '../theme/ThemeContext';
import Avatar from '../components/Avatar';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { hexToRgba } from '../utils/color';
import { getCurrentUser } from '../services/api';

export default function ProfileScreen({ navigation }) {
  const { colors, spacing, typography, mood } = useTheme();
  const [user, setUser] = useState(null);
  const tabBarHeight = useBottomTabBarHeight();

  // Refetches every time this tab regains focus, so coming back from
  // Edit Profile shows the change immediately instead of stale data
  // from the initial mount.
  useFocusEffect(
    useCallback(() => {
      getCurrentUser().then(setUser);
    }, [])
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Profile" brand />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: tabBarHeight + spacing.lg }}>
        <GlassCard style={{ marginBottom: spacing.lg, borderRadius: 28 }} contentStyle={{ padding: 20 }} intensity={44} tintAlpha={0.56}>
          <View style={[styles.heroGlow, { backgroundColor: hexToRgba(mood.signal, 0.14) }]} />
          <View style={[styles.heroGlowSecondary, { backgroundColor: hexToRgba(mood.thread, 0.12) }]} />
          <View style={styles.profileHeroTop}>
            <View style={[styles.avatarHalo, { borderColor: hexToRgba(mood.signal, 0.52), backgroundColor: hexToRgba(mood.signal, 0.08) }]}>
              <Avatar name={user?.name || 'You'} color={user?.avatarColor || colors.primary} size={76} imageUrl={user?.avatarUrl || user?.avatar_url} />
              <View style={[styles.avatarStatus, { backgroundColor: colors.online, borderColor: colors.surface }]} />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={[typography.small, { color: mood.thread, letterSpacing: 1.2 }]}>YOUR SPACE</Text>
              <Text style={[typography.title, { color: colors.textPrimary, marginTop: 4 }]} numberOfLines={2}>{user?.name || 'You'}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 5 }]} numberOfLines={2}>{user?.status || 'Hey there, I’m using ZannyChat'}</Text>
            </View>
          </View>
          <View style={[styles.profileDivider, { backgroundColor: colors.border }]} />
          <View style={styles.profileActions}>
            <TouchableOpacity style={[styles.profileAction, { backgroundColor: hexToRgba(mood.signal, 0.13), borderColor: hexToRgba(mood.signal, 0.24) }]} onPress={() => navigation.navigate('EditProfile')} accessibilityRole="button" accessibilityLabel="Edit your profile">
              <Ionicons name="pencil-outline" size={16} color={mood.signal} />
              <Text style={[typography.small, { color: colors.textPrimary, marginLeft: 7 }]}>Edit profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.profileAction, { backgroundColor: hexToRgba(mood.thread, 0.1), borderColor: hexToRgba(mood.thread, 0.2) }]} onPress={() => navigation.navigate('QRContact')} accessibilityRole="button" accessibilityLabel="Show your contact QR code">
              <Ionicons name="qr-code-outline" size={16} color={mood.thread} />
              <Text style={[typography.small, { color: colors.textPrimary, marginLeft: 7 }]}>My QR code</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
        <Text style={[typography.small, { color: colors.textSecondary, marginBottom: spacing.sm, marginLeft: 4, letterSpacing: 1.1 }]}>PERSONALIZE & PROTECT</Text>
        <MenuRow icon="color-palette-outline" label="Appearance & theme" onPress={() => navigation.navigate('Settings')} />
        <MenuRow icon="shield-checkmark-outline" label="Privacy & security" onPress={() => navigation.navigate('PrivacySecurity')} />
        <MenuRow icon="notifications-outline" label="Notifications" onPress={() => navigation.navigate('Notifications')} />
        <MenuRow icon="bookmark-outline" label="Saved messages" onPress={() => navigation.navigate('SavedMessages')} />
        <MenuRow icon="cloud-upload-outline" label="Data & storage" onPress={() => navigation.navigate('DataStorage')} />
        <MenuRow icon="help-circle-outline" label="Help" onPress={() => navigation.navigate('Help')} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuRow({ icon, label, onPress }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={`Opens ${label.toLowerCase()}`}>
      <GlassCard style={{ marginBottom: spacing.sm }} contentStyle={styles.row} intensity={26}>
        <Ionicons name={icon} size={20} color={colors.accent} />
        <Text style={[typography.body, { color: colors.textPrimary, marginLeft: spacing.sm, flex: 1 }]}>{label}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  heroGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, top: -86, right: -54 },
  heroGlowSecondary: { position: 'absolute', width: 112, height: 112, borderRadius: 56, bottom: -64, left: 40 },
  profileHeroTop: { flexDirection: 'row', alignItems: 'center' },
  avatarHalo: { width: 88, height: 88, borderRadius: 44, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  avatarStatus: { position: 'absolute', right: 2, bottom: 3, width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  profileDivider: { height: StyleSheet.hairlineWidth, marginVertical: 18 },
  profileActions: { flexDirection: 'row', gap: 10 },
  profileAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11, flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
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
