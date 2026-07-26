import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import Avatar from '../components/Avatar';
import { getCurrentUser } from '../services/api';

export default function ProfileScreen({ navigation }) {
  const { colors, spacing, typography, radii } = useTheme();
  const [user, setUser] = useState(null);

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={{ alignItems: 'center', marginBottom: spacing.xl, marginTop: spacing.md }}>
          <View style={styles.avatarGlow}>
            <Avatar name={user?.name || 'You'} color={user?.avatarColor || colors.primary} size={100} />
            <View style={[styles.verifiedBadge, { backgroundColor: colors.primary, borderColor: '#0a0a1a' }]}>
              <Ionicons name="checkmark-done" size={14} color="#fff" />
            </View>
          </View>
          <Text style={[typography.title, { color: '#fff', marginTop: spacing.lg, fontSize: 28 }]}>
            {user?.name || 'Network User'}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
             <Ionicons name="shield-checkmark" size={14} color={colors.primary} style={{ marginRight: 6 }} />
             <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)' }]}>
               {user?.status || 'Global ID Verified'}
             </Text>
          </View>
        </View>

        <Text style={[typography.caption, { color: 'rgba(255,255,255,0.4)', marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 1 }]}>Dashboard</Text>
        <MenuRow icon="wallet-outline" label="Zanny Vault" onPress={() => navigation.navigate('Wallet')} />
        <MenuRow icon="color-palette-outline" label="Appearance & Theme" onPress={() => navigation.navigate('Settings')} />
        
        <Text style={[typography.caption, { color: 'rgba(255,255,255,0.4)', marginTop: spacing.md, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 1 }]}>Security</Text>
        <MenuRow icon="shield-checkmark-outline" label="Privacy & Encryption" onPress={() => {}} />
        <MenuRow icon="key-outline" label="Biometric Access" onPress={() => {}} />
        <MenuRow icon="notifications-outline" label="Network Alerts" onPress={() => {}} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuRow({ icon, label, onPress }) {
  const { colors, spacing, typography, radii } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.row, { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radii.lg, padding: spacing.md, marginBottom: 8, borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }]}
    >
      <View style={[styles.iconBox, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={[typography.bodyStrong, { color: '#fff', marginLeft: spacing.md, flex: 1 }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  avatarGlow: { shadowColor: '#fff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 20 },
  verifiedBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }
});
