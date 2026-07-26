import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import { signOut } from '../services/api';

export default function SettingsScreen({ navigation }) {
  const { colors, spacing, typography, radii, paletteKey, palettes, setPalette } = useTheme();
  const [vaultEnabled, setVaultEnabled] = React.useState(true);

  async function handleLogout() {
    try {
      await signOut();
    } finally {
      navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      <Header title="Dashboard Settings" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        
        <View style={[styles.glassCard, { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radii.lg, padding: spacing.lg, borderColor: 'rgba(255,255,255,0.08)' }]}>
          <Text style={[typography.heading, { color: '#fff', marginBottom: spacing.xs }]}>System Theme</Text>
          <Text style={[typography.caption, { color: 'rgba(255,255,255,0.5)', marginBottom: spacing.md }]}>
            Configure the global accent color across your dashboard.
          </Text>

          <View style={styles.swatchRow}>
            {palettes.map((palette) => (
              <TouchableOpacity key={palette.key} onPress={() => setPalette(palette.key)} style={styles.swatchWrap}>
                <View
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: palette.primary,
                      borderColor: paletteKey === palette.key ? '#fff' : 'transparent',
                    },
                  ]}
                >
                  {paletteKey === palette.key && <Ionicons name="checkmark" size={20} color="#fff" />}
                </View>
                <Text style={[typography.caption, { color: 'rgba(255,255,255,0.6)', marginTop: 8 }]}>{palette.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.glassCard, { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radii.lg, padding: spacing.lg, borderColor: 'rgba(255,255,255,0.08)', marginTop: spacing.md }]}>
          <View style={[styles.row, { marginBottom: 4 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyStrong, { color: '#fff', fontSize: 16 }]}>Zero-Knowledge Vault</Text>
              <Text style={[typography.caption, { color: 'rgba(255,255,255,0.5)', marginTop: 4, paddingRight: 16 }]}>
                Hardware-level encryption for your voice notes, files, and transaction ledgers.
              </Text>
            </View>
            <Switch
              value={vaultEnabled}
              onValueChange={(val) => {
                setVaultEnabled(val);
                if (val) Alert.alert('Secure Enclave Enabled', 'ZannyChat vault backend activates fully in Phase 4.');
              }}
              trackColor={{ true: colors.primary, false: 'rgba(255,255,255,0.1)' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: 'rgba(255, 59, 48, 0.5)', backgroundColor: 'rgba(255, 59, 48, 0.1)', borderRadius: radii.pill }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#ff3b30" style={{ marginRight: 8 }} />
          <Text style={{ color: '#ff3b30', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 }}>Terminate Session</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  glassCard: { borderWidth: 1 },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 8 },
  swatchWrap: { alignItems: 'center', width: 70 },
  swatch: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  logoutBtn: { borderWidth: 1, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 32 },
});
