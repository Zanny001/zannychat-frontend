import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export default function Header({ title, onBack, right, subtitle }) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, borderBottomColor: colors.border, paddingHorizontal: spacing.md },
      ]}
    >
      <View style={styles.left}>
        {onBack && (
          <TouchableOpacity onPress={onBack} hitSlop={10} style={{ marginRight: spacing.sm }}>
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        <View>
          <Text style={[typography.heading, { color: colors.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[typography.caption, { color: colors.textSecondary }]}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  left: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  right: { flexDirection: 'row', alignItems: 'center' },
});
