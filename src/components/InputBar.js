import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../utils/color';

export default function InputBar({ onSend, replyingTo, onCancelReply, onAttach }) {
  const { colors, spacing, radii, typography } = useTheme();
  const [text, setText] = useState('');

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  }

  return (
    <View style={[styles.wrap, { borderTopColor: hexToRgba(colors.textPrimary, 0.08) }]}>
      <BlurView
        intensity={30}
        tint="dark"
        style={StyleSheet.absoluteFill}
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: hexToRgba(colors.background, 0.7) }]} />

      {replyingTo ? (
        <View style={[styles.replyBar, { backgroundColor: hexToRgba(colors.surfaceAlt, 0.7), paddingHorizontal: spacing.md }]}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.small, { color: colors.primary }]}>Replying to</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
              {replyingTo.text}
            </Text>
          </View>
          <TouchableOpacity onPress={onCancelReply} hitSlop={10}>
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={[styles.row, { padding: spacing.sm }]}>
        <TouchableOpacity onPress={onAttach} hitSlop={8} style={{ padding: 6 }}>
          <Ionicons name="add-circle-outline" size={26} color={colors.textSecondary} />
        </TouchableOpacity>

        <View
          style={[
            styles.inputWrap,
            {
              backgroundColor: hexToRgba(colors.surface, 0.55),
              borderColor: hexToRgba(colors.textPrimary, 0.1),
              borderRadius: radii.pill,
            },
          ]}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message"
            placeholderTextColor={colors.textSecondary}
            style={[typography.body, { color: colors.textPrimary, flex: 1, paddingVertical: 8 }]}
            multiline
          />
        </View>

        <TouchableOpacity
          onPress={handleSend}
          disabled={!text.trim()}
          style={[styles.sendBtn, { backgroundColor: text.trim() ? colors.primary : hexToRgba(colors.surfaceAlt, 0.8) }]}
        >
          <Ionicons name="send" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  inputWrap: { flex: 1, paddingHorizontal: 14, marginHorizontal: 6, maxHeight: 120, borderWidth: 1 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  replyBar: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
});
