import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../utils/color';

// A lighter-weight sibling of GlassCard — no blur, just a translucent
// tint and hairline border. A compact field doesn't have enough behind
// it for a blur to read as anything but muddy; the tint + border alone
// already reads as "glass" at this size.
export default function GlassInput({ style, ...textInputProps }) {
  const { colors, radii, typography } = useTheme();

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: hexToRgba(colors.surface, 0.45),
          borderColor: hexToRgba(colors.textPrimary, 0.12),
          borderRadius: radii.md,
        },
        style,
      ]}
    >
      <TextInput
        placeholderTextColor={colors.textSecondary}
        style={[typography.body, styles.input, { color: colors.textPrimary }]}
        {...textInputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, marginBottom: 12 },
  input: { paddingHorizontal: 16, paddingVertical: 13 },
});
