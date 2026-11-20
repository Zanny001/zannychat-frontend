import React from 'react';
import { Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../utils/color';

/**
 * Shared Crown Aurora header for secondary LIVE destinations.
 * Keeps navigation, hierarchy and action hit targets consistent without
 * introducing a second navigation surface or changing screen behavior.
 */
export default function LivePremiumHeader({
  navigation,
  eyebrow = 'ZANNYCHAT · LIVE',
  title,
  subtitle,
  icon = 'radio-outline',
  onBack,
  backLabel = 'Back to LIVE',
  onRefresh,
  refreshLabel = 'Refresh this screen',
  trailing,
  badge,
}) {
  const { colors, spacing, typography } = useTheme();
  const { width: viewportWidth } = useWindowDimensions();
  const compact = viewportWidth < 380;
  const handleBack = onBack || (() => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation?.navigate?.('Main', { screen: 'LIVE' });
  });

  return (
    <View style={{
      width: '100%',
      minHeight: 76,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xs,
    }}>
      <TouchableOpacity
        onPress={handleBack}
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        style={{
          width: 46,
          height: 46,
          borderRadius: 15,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="chevron-back" size={21} color={colors.textPrimary} />
      </TouchableOpacity>

      {!compact ? <View style={{
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: hexToRgba(colors.primary, 0.13),
        borderWidth: 1,
        borderColor: hexToRgba(colors.primary, 0.3),
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <View pointerEvents="none" style={{
          position: 'absolute',
          width: 42,
          height: 42,
          borderRadius: 21,
          top: -19,
          right: -15,
          backgroundColor: hexToRgba(colors.accent || colors.primary, 0.22),
        }} />
        <Ionicons name={icon} size={21} color={colors.primary} />
      </View> : null}

      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text numberOfLines={1} style={[typography.caption, {
          color: colors.primary,
          fontWeight: '900',
          letterSpacing: 1.15,
          fontSize: 10,
        }]}>{eyebrow}</Text>
        <Text numberOfLines={2} style={[typography.heading, {
          color: colors.textPrimary,
          fontSize: compact ? 21 : 23,
          lineHeight: 28,
          flexShrink: 1,
        }]}>{title}</Text>
        {subtitle ? <Text numberOfLines={2} style={[typography.caption, {
          color: colors.textSecondary,
          lineHeight: 17,
        }]}>{subtitle}</Text> : null}
      </View>

      {badge && !compact ? (
        <View style={{
          paddingHorizontal: 9,
          paddingVertical: 7,
          borderRadius: 11,
          backgroundColor: hexToRgba(colors.gold || colors.accent || colors.primary, 0.12),
          borderWidth: 1,
          borderColor: hexToRgba(colors.gold || colors.accent || colors.primary, 0.26),
        }}>
          <Text style={[typography.caption, {
            color: colors.gold || colors.accent || colors.primary,
            fontWeight: '900',
            letterSpacing: 0.7,
          }]}>{badge}</Text>
        </View>
      ) : null}
      {trailing}
      {onRefresh ? (
        <TouchableOpacity
          onPress={onRefresh}
          accessibilityRole="button"
          accessibilityLabel={refreshLabel}
          style={{
            width: 46,
            height: 46,
            borderRadius: 15,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="refresh" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
