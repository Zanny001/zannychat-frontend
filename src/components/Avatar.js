import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

function readableForeground(color, fallback) {
  const hex = typeof color === 'string' ? color.trim().replace(/^#/, '') : '';
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return fallback;
  const channels = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  return luminance > 0.179 ? '#111827' : '#FFFFFF';
}

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

// Shows a real photo when imageUrl is set, falling back to the
// color+initials circle otherwise — including if the image URL fails
// to load (a broken link shouldn't leave a blank circle). isGroup
// swaps the online dot for a people-icon badge — a group has no single
// online/offline state to show.
export default function Avatar({ name, color, size = 48, online, imageUrl, isGroup }) {
  const { colors } = useTheme();
  const avatarColor = color || colors.primary;
  const avatarTextColor = !color || color === colors.primary ? colors.onPrimary : readableForeground(avatarColor, colors.onPrimary);
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !imageFailed;

  return (
    // Exposes whose avatar this is to assistive tech — the audit found
    // no Avatar anywhere carried a name, so screen readers announced
    // nothing meaningful for any of them.
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityLabel={name ? `${name}'s avatar` : 'Avatar'}
      accessibilityRole="image"
    >
      {showImage ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <View
          style={[
            styles.circle,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: avatarColor },
          ]}
        >
          {isGroup ? (
            <Ionicons name="people" size={size * 0.46} color={avatarTextColor} />
          ) : (
            <Text style={[styles.initials, { fontSize: size * 0.38, color: avatarTextColor }]}>{initials(name)}</Text>
          )}
        </View>
      )}
      {isGroup ? (
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor: colors.surface,
              borderColor: colors.background,
              width: size * 0.32,
              height: size * 0.32,
              borderRadius: size * 0.16,
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
        >
          <Ionicons name="people" size={size * 0.18} color={colors.textSecondary} />
        </View>
      ) : (
        online !== undefined && (
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
        )
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
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  statusDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    borderWidth: 2,
  },
});
