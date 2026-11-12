import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../utils/color';
import Knot from './Knot';

// brand=true renders the ZannyChat mark + wordmark instead of a plain
// title — used on tab-root screens (Profile) where there's no
// "back" context and the header's job is identity, not navigation.
// Screens reached with a back button (Chat, New chat, Settings) pass
// their own title instead — repeating the app logo next to a
// contact's name would just be noise.
export default function Header({ title, onBack, right, subtitle, brand = false, onTitlePress }) {
  const { colors, mood, spacing, typography, layout } = useTheme();

  return (
    <View style={[styles.wrap, { borderBottomColor: hexToRgba(colors.textPrimary, 0.08) }]}>
      <BlurView
        intensity={28}
        tint="dark"
        style={StyleSheet.absoluteFill}
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: hexToRgba(colors.background, 0.62) }]} />

      <View style={[styles.container, { minHeight: layout.headerHeight, paddingHorizontal: spacing.md, paddingVertical: spacing.xs }]}>
        <View style={styles.left}>
          {onBack && (
            <Pressable
              onPress={onBack}
              hitSlop={10}
              style={({ pressed }) => [
                styles.backButton,
                { marginRight: spacing.sm },
                pressed && { backgroundColor: hexToRgba(colors.primary, 0.12) },
              ]}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
            </Pressable>
          )}
          {brand ? (
            <View style={styles.brandRow}>
              <Knot size={24} signalColor={mood.signal} threadColor={mood.thread} strokeWidth={5} />
              <Text style={[typography.title, { color: colors.textPrimary, marginLeft: 8 }]}>{title}</Text>
            </View>
          ) : (
            <Pressable
              disabled={!onTitlePress}
              onPress={onTitlePress}
              style={({ pressed }) => pressed && onTitlePress ? styles.titlePressed : undefined}
              accessibilityRole={onTitlePress ? 'button' : undefined}
              accessibilityLabel={onTitlePress ? `View ${title} profile` : undefined}
            >
              <Text style={[typography.heading, { color: colors.textPrimary }]} numberOfLines={1}>
                {title}
              </Text>
              {subtitle ? (
                <Text style={[typography.caption, { color: colors.textSecondary }]}>{subtitle}</Text>
              ) : null}
            </Pressable>
          )}
        </View>
        <View style={styles.right}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  container: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  backButton: { minWidth: 44, minHeight: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  titlePressed: { opacity: 0.72 },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  right: { flexDirection: 'row', alignItems: 'center' },
});
