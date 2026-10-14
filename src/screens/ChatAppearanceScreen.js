import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../theme/ThemeContext';
import { CHAT_CANVASES, DEFAULT_CHAT_CANVAS, normalizeChatCanvas, resolveChatCanvas } from '../utils/chatAppearance';
import { loadChatCanvas, saveChatCanvas } from '../services/chatAppearance';

export default function ChatAppearanceScreen({ navigation }) {
  const { colors, spacing, radii, typography } = useTheme();
  const [selected, setSelected] = useState(DEFAULT_CHAT_CANVAS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadChatCanvas().then((value) => {
      if (mounted) { setSelected(normalizeChatCanvas(value)); setReady(true); }
    });
    return () => { mounted = false; };
  }, []);

  async function chooseCanvas(key) {
    setSelected(key);
    await saveChatCanvas(key);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Chat appearance" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
        <View style={[styles.eyebrow, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}35` }]}>
          <Ionicons name="sparkles-outline" size={15} color={colors.primary} />
          <Text style={[typography.small, { color: colors.primary, marginLeft: 7, letterSpacing: 1 }]}>YOUR CONVERSATION CANVAS</Text>
        </View>
        <Text style={[typography.title, { color: colors.textPrimary, marginTop: spacing.md }]}>Make every chat feel like yours.</Text>
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.lg }]}>Choose a refined background for conversation screens. Your selected mood still controls message colors and the rest of the app.</Text>

        <GlassCard style={{ marginBottom: spacing.lg }}>
          <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginBottom: spacing.sm }]}>LIVE PREVIEW</Text>
          <View style={[styles.preview, { backgroundColor: resolveChatCanvas(selected, colors.background), borderColor: colors.border, borderRadius: radii.lg }]}>
            <View style={[styles.previewPill, { backgroundColor: colors.surface, alignSelf: 'flex-start' }]}><Text style={[typography.small, { color: colors.textPrimary }]}>Hey! How's your day going?</Text></View>
            <View style={[styles.previewPill, { backgroundColor: colors.primary, alignSelf: 'flex-end', marginTop: 10 }]}><Text style={[typography.small, { color: '#FFFFFF' }]}>Much better now ✨</Text></View>
            <View style={[styles.previewMeta, { borderTopColor: `${colors.textPrimary}16` }]}><Ionicons name="lock-closed-outline" size={12} color={colors.textSecondary} /><Text style={[typography.small, { color: colors.textSecondary, marginLeft: 5 }]}>Appearance only · no message content changed</Text></View>
          </View>
        </GlassCard>

        <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginBottom: spacing.sm }]}>CHOOSE A CANVAS</Text>
        {CHAT_CANVASES.map((canvas) => {
          const active = selected === canvas.key;
          const background = resolveChatCanvas(canvas.key, colors.background);
          return (
            <TouchableOpacity key={canvas.key} onPress={() => chooseCanvas(canvas.key)} activeOpacity={0.82} accessibilityRole="radio" accessibilityState={{ checked: active }} accessibilityLabel={`${canvas.label}. ${canvas.description}`} style={{ marginBottom: spacing.sm }}>
              <GlassCard style={[styles.option, { borderColor: active ? colors.primary : colors.border, borderWidth: active ? 1.5 : 1 }]} contentStyle={styles.optionContent}>
                <View style={[styles.swatch, { backgroundColor: background, borderColor: colors.border }]}>
                  <View style={[styles.swatchBubble, { backgroundColor: colors.primary }]} />
                  <View style={[styles.swatchBubble, { backgroundColor: colors.surface, alignSelf: 'flex-end' }]} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{canvas.label}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>{canvas.description}</Text>
                </View>
                <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={active ? colors.primary : colors.textSecondary} />
              </GlassCard>
            </TouchableOpacity>
          );
        })}
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm }]}>{ready ? 'Your choice is saved on this device.' : 'Loading your saved appearance…'} Changes apply to open chats as they are opened again.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  eyebrow: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  preview: { minHeight: 156, padding: 14, borderWidth: 1, justifyContent: 'center' },
  previewPill: { maxWidth: '85%', borderRadius: 15, paddingHorizontal: 12, paddingVertical: 9 },
  previewMeta: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, marginTop: 15, paddingTop: 9 },
  option: { marginBottom: 0 },
  optionContent: { flexDirection: 'row', alignItems: 'center' },
  swatch: { width: 54, height: 54, borderRadius: 14, borderWidth: 1, padding: 7, justifyContent: 'space-between' },
  swatchBubble: { width: 24, height: 9, borderRadius: 5 },
});
