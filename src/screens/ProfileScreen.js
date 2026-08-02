import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTheme } from '../theme/ThemeContext';
import Avatar from '../components/Avatar';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { getCurrentUser } from '../services/api';

export default function ProfileScreen({ navigation }) {
  const { colors, spacing, typography } = useTheme();
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
        <TouchableOpacity
          style={{ alignItems: 'center', marginBottom: spacing.lg }}
          onPress={() => navigation.navigate('EditProfile')}
          activeOpacity={0.8}
        >
          <Avatar
            name={user?.name || 'You'}
            color={user?.avatarColor || colors.primary}
            size={88}
            imageUrl={user?.avatarUrl || user?.avatar_url}
          />
          <Text style={[typography.title, { color: colors.textPrimary, marginTop: spacing.md }]}>
            {user?.name || 'You'}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
            {user?.status || 'Hey there, I\u2019m using ZannyChat'}
          </Text>
          <View style={[styles.editPill, { borderColor: colors.border }]}>
            <Ionicons name="pencil-outline" size={12} color={colors.textSecondary} />
            <Text style={[typography.small, { color: colors.textSecondary, marginLeft: 4 }]}>Edit profile</Text>
          </View>
        </TouchableOpacity>

        <MenuRow icon="wallet-outline" label="Wallet" onPress={() => navigation.navigate('Wallet')} />
        <MenuRow icon="color-palette-outline" label="Appearance & theme" onPress={() => navigation.navigate('Settings')} />
        <MenuRow icon="shield-checkmark-outline" label="Privacy & security" onPress={() => {}} />
        <MenuRow icon="notifications-outline" label="Notifications" onPress={() => {}} />
        <MenuRow icon="help-circle-outline" label="Help" onPress={() => {}} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuRow({ icon, label, onPress }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <GlassCard style={{ marginBottom: spacing.sm }} contentStyle={styles.row} intensity={26}>
        <Ionicons name={icon} size={20} color={colors.accent} />
        <Text style={[typography.body, { color: colors.textPrimary, marginLeft: spacing.sm, flex: 1 }]}>{label}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
