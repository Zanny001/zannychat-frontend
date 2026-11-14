import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../utils/color';

// A branded bottom sheet for attachment, reaction and conversation actions.
// All actions use Pressable so keyboard, screen-reader and pressed states
// behave consistently with the rest of the shared interaction system.
//
// options: [{ key, label, icon?, destructive?, disabled?, onPress }]
// reactions (optional): [ { emoji, active?, onPress } ]
export default function ActionSheet({ visible, title, options = [], reactions, onClose }) {
  const { colors, spacing, radii, typography, resolvedMode } = useTheme();
  const insets = useSafeAreaInsets();
  const supportsBackdropBlur = Platform.OS !== 'android' || Number(Platform.Version) >= 31;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessible={false}
      >
        <Pressable
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(28, insets.bottom + 16),
              backgroundColor: hexToRgba(colors.surface, 0.82),
              borderColor: hexToRgba(colors.textPrimary, 0.12),
              borderTopLeftRadius: radii.lg,
              borderTopRightRadius: radii.lg,
            },
          ]}
          onPress={(event) => event.stopPropagation()}
          accessible={false}
          accessibilityViewIsModal
        >
          {supportsBackdropBlur ? (
            <BlurView
              intensity={40}
              tint={resolvedMode}
              style={StyleSheet.absoluteFill}
              experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
            />
          ) : null}
          <View style={[styles.grabber, { backgroundColor: hexToRgba(colors.textPrimary, 0.25) }]} />

          {title ? (
            <Text
              style={[
                typography.caption,
                { color: colors.textSecondary, marginBottom: spacing.sm, paddingHorizontal: spacing.md },
              ]}
            >
              {title}
            </Text>
          ) : null}

          {reactions ? (
            <View style={[styles.reactionRow, { marginBottom: spacing.sm, paddingHorizontal: spacing.md }]}>
              {reactions.map((reaction) => (
                <Pressable
                  key={reaction.emoji}
                  onPress={reaction.onPress}
                  accessibilityLabel={`React with ${reaction.emoji}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: Boolean(reaction.active) }}
                  style={({ pressed }) => [
                    styles.reactionChip,
                    {
                      backgroundColor: reaction.active ? hexToRgba(colors.primary, 0.22) : hexToRgba(colors.surfaceAlt, 0.6),
                      borderColor: reaction.active ? colors.primary : 'transparent',
                    },
                    pressed && { backgroundColor: hexToRgba(colors.primary, 0.28) },
                  ]}
                >
                  <Text style={{ fontSize: 22 }}>{reaction.emoji}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {options.map((option, index) => (
            <Pressable
              key={option.key || index}
              disabled={Boolean(option.disabled)}
              onPress={option.onPress}
              accessibilityLabel={option.label}
              accessibilityRole="button"
              accessibilityState={{ disabled: Boolean(option.disabled) }}
              style={({ pressed }) => [
                styles.optionRow,
                {
                  paddingHorizontal: spacing.md,
                  borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                  borderTopColor: hexToRgba(colors.textPrimary, 0.08),
                },
                pressed && { backgroundColor: hexToRgba(colors.primary, 0.08) },
                option.disabled && { opacity: 0.45 },
              ]}
            >
              {option.icon ? (
                <Ionicons
                  name={option.icon}
                  size={20}
                  color={option.destructive ? colors.danger : colors.accent}
                  style={{ marginRight: spacing.sm }}
                />
              ) : null}
              <Text
                style={[
                  typography.body,
                  { color: option.destructive ? colors.danger : colors.textPrimary, flex: 1 },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}

          <Pressable
            onPress={onClose}
            accessibilityLabel="Cancel"
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.optionRow,
              styles.cancelRow,
              { paddingHorizontal: spacing.md },
              pressed && { backgroundColor: hexToRgba(colors.primary, 0.08) },
            ]}
          >
            <Text style={[typography.bodyStrong, { color: colors.textSecondary, flex: 1, textAlign: 'center' }]}>
              Cancel
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    overflow: 'hidden',
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 10,
    paddingBottom: 28,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 10,
  },
  reactionRow: { flexDirection: 'row', gap: 10 },
  reactionChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  cancelRow: { marginTop: 6 },
});
