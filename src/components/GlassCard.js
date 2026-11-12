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
  glow = false,
}) {
  const { colors, radii, spacing, elevation } = useTheme();
  const radius = borderRadius ?? radii.md;
  const shadow = elevation.card;

  return (
    <View
      style={[
        styles.elevated,
        {
          borderRadius: radius,
          backgroundColor: colors.surface,
          shadowColor: colors.shadow,
          shadowOpacity: glow ? 0.32 : shadow.shadowOpacity,
          shadowRadius: glow ? 22 : shadow.shadowRadius,
          shadowOffset: { width: 0, height: shadow.shadowOffsetY },
          elevation: glow ? shadow.android + 2 : shadow.android,
        },
      ]}
    >
      <View style={[styles.wrap, { borderRadius: radius, borderColor: hexToRgba(colors.textPrimary, 0.1) }, style]}>
        <BlurView
          intensity={intensity}
          tint="dark"
          style={StyleSheet.absoluteFill}
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: hexToRgba(colors.surface, tintAlpha) }]} />
        <View style={[!noPadding && { padding: spacing.md }, contentStyle]}>{children}</View>
        <View pointerEvents="none" style={[styles.specularTop, { backgroundColor: hexToRgba(colors.textPrimary, glow ? 0.24 : 0.13), borderTopLeftRadius: radius, borderTopRightRadius: radius }]} />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.innerEdge, { borderRadius: radius, borderColor: hexToRgba(colors.textPrimary, glow ? 0.16 : 0.08) }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  elevated: {
    // Keep elevation on an unclipped parent so the glass surface can retain
    // overflow:hidden without clipping its shadow.
  },
  wrap: {
    overflow: 'hidden',
    borderWidth: 1,
  },
  specularTop: { position: 'absolute', top: 0, left: 18, right: 18, height: 1 },
  innerEdge: { borderWidth: 1 },
});
