import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function Avatar({ name, color = '#6C5CE7', size = 48, online }) {
  const { colors } = useTheme();

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.circle,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        ]}
      >
        <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials(name)}</Text>
      </View>
      {online !== undefined && (
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor: online ? colors.online : colors.textSecondary,
              borderColor: colors.background,
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: size * 0.14,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statusDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    borderWidth: 2,
  },
});
