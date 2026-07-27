import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Switch, Alert } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import MoodSwatch from '../components/MoodSwatch';
import GlassCard from '../components/GlassCard';
import { hexToRgba } from '../utils/color';
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
        <GlassCard style={{ marginBottom: spacing.md }}>
          <Text style={[typography.heading, { color: colors.textPrimary, marginBottom: spacing.sm }]}>Mood</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>
            Each mood is two colors — one for you, one for them. Pick one and it applies everywhere.
          </Text>

          <View style={styles.swatchRow}>
            {palettes.map((mood) => {
              const selected = paletteKey === mood.key;
              return (
                <TouchableOpacity key={mood.key} onPress={() => setPalette(mood.key)} style={styles.swatchWrap}>
                  <View
                    style={[
                      styles.swatchRing,
                      { borderColor: selected ? colors.textPrimary : 'transparent' },
                    ]}
                  >
                    <MoodSwatch mood={mood} size={44} />
                  </View>
                  <Text
                    style={[
                      typography.small,
                      { color: selected ? colors.textPrimary : colors.textSecondary, marginTop: 6 },
                    ]}
                  >
                    {mood.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </GlassCard>

        <GlassCard style={{ marginBottom: spacing.md }}>
          <View style={styles.row}>
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
        </GlassCard>

        <TouchableOpacity
          style={[
            styles.logoutBtn,
            { borderColor: colors.danger, borderRadius: radii.pill, backgroundColor: hexToRgba(colors.danger, 0.1) },
          ]}
          onPress={handleLogout}
        >
          <Text style={[typography.bodyStrong, { color: colors.danger }]}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  swatchWrap: { alignItems: 'center', width: 68 },
  swatchRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  logoutBtn: { borderWidth: 1.5, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
});
