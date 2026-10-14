import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../utils/color';
import { PHOTO_QUALITY_OPTIONS } from '../utils/mediaQuality';
import { loadMediaPreferences, updateMediaPreferences } from '../services/mediaPreferences';

export default function DataStorageScreen({ navigation }) {
  const { colors, spacing, typography, mood } = useTheme();
  const [prefs, setPrefs] = useState({ photoQuality: 'balanced', dataSaver: false });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    loadMediaPreferences().then((value) => {
      if (active) { setPrefs(value); setLoaded(true); }
    });
    return () => { active = false; };
  }, []);

  async function update(patch) {
    const next = await updateMediaPreferences(patch);
    setPrefs(next);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Data & storage" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
        <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: hexToRgba(colors.textPrimary, 0.1) }]}>
          <View style={[styles.orb, styles.orbOne, { backgroundColor: hexToRgba(mood.signal, 0.22) }]} />
          <View style={[styles.orb, styles.orbTwo, { backgroundColor: hexToRgba(mood.thread, 0.2) }]} />
          <View style={[styles.heroIcon, { backgroundColor: hexToRgba(mood.signal, 0.14), borderColor: hexToRgba(mood.signal, 0.28) }]}>
            <Ionicons name="cloud-upload-outline" size={25} color={mood.signal} />
          </View>
          <Text style={[typography.display, { color: colors.textPrimary, marginTop: 18, maxWidth: 280 }]}>Your media. Your settings.</Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: 8, maxWidth: 300 }]}>
            Choose how much detail your photos keep when you share them, and reduce upload data when you need to.
          </Text>
          <View style={styles.heroFooter}>
            <View style={[styles.statusDot, { backgroundColor: colors.online }]} />
            <Text style={[typography.small, { color: colors.textSecondary, marginLeft: 7 }]}>PREFERENCES SAVED ON THIS DEVICE</Text>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={[typography.heading, { color: colors.textPrimary }]}>Photo upload quality</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>Applied when you take or choose a photo.</Text>
        </View>
        <View style={styles.qualityList}>
          {Object.values(PHOTO_QUALITY_OPTIONS).map((option) => {
            const selected = prefs.photoQuality === option.key;
            const icon = option.key === 'compact' ? 'speedometer-outline' : option.key === 'balanced' ? 'aperture-outline' : 'sparkles-outline';
            return (
              <TouchableOpacity
                key={option.key}
                activeOpacity={0.82}
                disabled={!loaded}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${option.label}, ${option.detail}`}
                onPress={() => update({ photoQuality: option.key })}
                style={[styles.qualityOption, { backgroundColor: selected ? hexToRgba(mood.signal, 0.1) : colors.surface, borderColor: selected ? mood.signal : hexToRgba(colors.textPrimary, 0.1), opacity: loaded ? 1 : 0.55 }]}
              >
                <View style={[styles.qualityIcon, { backgroundColor: selected ? hexToRgba(mood.signal, 0.16) : colors.surfaceAlt }]}>
                  <Ionicons name={icon} size={21} color={selected ? mood.signal : colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{option.label}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>{option.detail}</Text>
                </View>
                <View style={[styles.radioOuter, { borderColor: selected ? mood.signal : colors.textSecondary }]}>
                  {selected ? <View style={[styles.radioInner, { backgroundColor: mood.signal }]} /> : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <GlassCard style={{ marginTop: spacing.lg }}>
          <View style={styles.dataSaverRow}>
            <View style={[styles.qualityIcon, { backgroundColor: hexToRgba(mood.thread, 0.12) }]}>
              <Ionicons name="leaf-outline" size={22} color={mood.thread} />
            </View>
            <View style={{ flex: 1, marginHorizontal: spacing.sm }}>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Data saver</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>Use compact photo uploads even when High detail is selected.</Text>
            </View>
            <Switch
              value={prefs.dataSaver}
              onValueChange={(value) => update({ dataSaver: value })}
              trackColor={{ false: colors.border, true: mood.thread }}
              thumbColor={colors.textPrimary}
              accessibilityLabel="Data saver"
              accessibilityRole="switch"
              disabled={!loaded}
            />
          </View>
          <View style={[styles.note, { backgroundColor: hexToRgba(mood.thread, 0.08), borderColor: hexToRgba(mood.thread, 0.18) }]}>
            <Ionicons name="information-circle-outline" size={17} color={mood.thread} />
            <Text style={[typography.caption, { color: colors.textSecondary, flex: 1, marginLeft: 8, lineHeight: 19 }]}>
              These settings affect photo upload compression. They do not change your mobile carrier plan or automatically download incoming media.
            </Text>
          </View>
        </GlassCard>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Ionicons name="shield-checkmark-outline" size={17} color={colors.accent} />
          <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: 8, flex: 1 }]}>Your preferences stay on this device and can be changed at any time.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 28, borderWidth: 1, padding: 22, overflow: 'hidden', minHeight: 255 },
  orb: { position: 'absolute', borderRadius: 999 },
  orbOne: { width: 190, height: 190, right: -70, top: -60 },
  orbTwo: { width: 135, height: 135, right: 28, bottom: -88 },
  heroIcon: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  heroFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 22 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  sectionHeading: { marginTop: 28, marginBottom: 14 },
  qualityList: { gap: 10 },
  qualityOption: { minHeight: 78, borderWidth: 1, borderRadius: 19, padding: 13, flexDirection: 'row', alignItems: 'center' },
  qualityIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  radioOuter: { width: 21, height: 21, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  radioInner: { width: 11, height: 11, borderRadius: 6 },
  dataSaverRow: { flexDirection: 'row', alignItems: 'center' },
  note: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: 13, borderWidth: 1, marginTop: 18 },
  footer: { flexDirection: 'row', alignItems: 'flex-start', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 22, paddingTop: 16 },
});
