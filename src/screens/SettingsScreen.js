import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import { signOut } from '../services/api';

export default function SettingsScreen({ navigation }) {
  const { colors, spacing, typography, radii, paletteKey, palettes, setPalette } = useTheme();
  const [vaultEnabled, setVaultEnabled] = React.useState(false);

  async function handleLogout() {
    try {
      await signOut();
    } finally {
      navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Appearance & theme" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={[typography.heading, { color: colors.textPrimary, marginBottom: spacing.sm }]}>Theme</Text>
        <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>
          Pick a palette — it applies across every screen instantly.
        </Text>

        <View style={styles.swatchRow}>
          {palettes.map((palette) => (
            <TouchableOpacity key={palette.key} onPress={() => setPalette(palette.key)} style={styles.swatchWrap}>
              <View
                style={[
                  styles.swatch,
                  {
                    backgroundColor: palette.primary,
                    borderColor: paletteKey === palette.key ? palette.accent : 'transparent',
                  },
                ]}
              >
                {paletteKey === palette.key && <Ionicons name="checkmark" size={18} color="#fff" />}
              </View>
              <Text style={[typography.small, { color: colors.textSecondary, marginTop: 4 }]}>{palette.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={[styles.row, { marginBottom: spacing.md }]}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Zero-Knowledge Vault</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Extra-encrypted storage for voice notes & files (preview)
            </Text>
          </View>
          <Switch
            value={vaultEnabled}
            onValueChange={(val) => {
              setVaultEnabled(val);
              if (val) Alert.alert('Preview feature', 'The vault backend lands with Phase 4 of the roadmap.');
            }}
            trackColor={{ true: colors.primary }}
          />
        </View>

        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: colors.danger, borderRadius: radii.pill }]}
          onPress={handleLogout}
        >
          <Text style={{ color: colors.danger, fontWeight: '700' }}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  swatchWrap: { alignItems: 'center', width: 70 },
  swatch: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 20 },
  row: { flexDirection: 'row', alignItems: 'center' },
  logoutBtn: { borderWidth: 1.5, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
});
