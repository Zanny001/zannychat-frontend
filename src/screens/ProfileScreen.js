import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Profile" brand={!navigation.canGoBack()} onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: tabBarHeight + spacing.lg }}>
        <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
          <Avatar name={user?.name || 'You'} color={user?.avatarColor || colors.primary} size={88} />
          <Text style={[typography.title, { color: colors.textPrimary, marginTop: spacing.md }]}>
            {user?.name || 'You'}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
            {user?.status || 'Hey there, I\u2019m using ZannyChat'}
          </Text>
        </View>

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
});
