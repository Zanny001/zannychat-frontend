import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../utils/color';

// The one component that carries "deep glassmorphism" for the whole
// app: a blur of whatever's behind, tinted toward the active mood's
// surface color, with a hairline light border to catch the edge like
// real glass would. Every card, row, and input container in the
// premium redesign is this, not a flat colored View.
//
// Android's blur renderer is weaker than iOS's, so the tint overlay
// (not the blur itself) is what actually carries the look on either
// platform — the blur is a bonus, not the load-bearing part.
export default function GlassCard({
  children,
  style,
  contentStyle,
  intensity = 36,
  tintAlpha = 0.46,
  borderRadius,
  noPadding = false,
}) {
  const { colors, radii, spacing } = useTheme();
  const radius = borderRadius ?? radii.md;

  return (
    <View style={[styles.wrap, { borderRadius: radius, borderColor: hexToRgba(colors.textPrimary, 0.1) }, style]}>
      <BlurView
        intensity={intensity}
        tint="dark"
        style={StyleSheet.absoluteFill}
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: hexToRgba(colors.surface, tintAlpha) }]} />
      <View style={[!noPadding && { padding: spacing.md }, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderWidth: 1,
  },
});
