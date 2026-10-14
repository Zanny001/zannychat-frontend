import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../utils/color';

// A branded bottom sheet that replaces every place the app used to
// open a bare native Alert.alert action list (the attach menu, the
// reaction picker, the chat overflow menu) — the one spot where the
// OS's default UI broke the glass design language, called out in the
// Oct 2026 audit as the only visible break in the system.
//
// options: [{ key, label, icon?, destructive?, onPress }]
// reactions (optional): a row of quick-reaction emojis rendered at the
// top of the sheet — [ { emoji, active?, onPress } ]
export default function ActionSheet({ visible, title, options = [], reactions, onClose }) {
  const { colors, spacing, radii, typography } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityLabel="Dismiss"
        accessibilityRole="button"
      >
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: hexToRgba(colors.surface, 0.82),
              borderColor: hexToRgba(colors.textPrimary, 0.12),
              borderTopLeftRadius: radii.lg,
              borderTopRightRadius: radii.lg,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <BlurView
            intensity={40}
            tint="dark"
            style={StyleSheet.absoluteFill}
            experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
          />
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
              {reactions.map((r) => (
                <TouchableOpacity
                  key={r.emoji}
                  onPress={r.onPress}
                  accessibilityLabel={`React with ${r.emoji}`}
                  accessibilityRole="button"
                  style={[
                    styles.reactionChip,
                    {
                      backgroundColor: r.active ? hexToRgba(colors.primary, 0.22) : hexToRgba(colors.surfaceAlt, 0.6),
                      borderColor: r.active ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  <Text style={{ fontSize: 22 }}>{r.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {options.map((option, index) => (
            <TouchableOpacity
              key={option.key || index}
              onPress={option.onPress}
              accessibilityLabel={option.label}
              accessibilityRole="button"
              style={[
                styles.optionRow,
                {
                  paddingHorizontal: spacing.md,
                  borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                  borderTopColor: hexToRgba(colors.textPrimary, 0.08),
                },
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
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            onPress={onClose}
            accessibilityLabel="Cancel"
            accessibilityRole="button"
            style={[styles.optionRow, styles.cancelRow, { paddingHorizontal: spacing.md }]}
          >
            <Text style={[typography.bodyStrong, { color: colors.textSecondary, flex: 1, textAlign: 'center' }]}>
              Cancel
            </Text>
          </TouchableOpacity>
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
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  cancelRow: { marginTop: 6 },
});
