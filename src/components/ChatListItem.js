import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../utils/color';

// Conversation rows prioritize fast scanning over decorative containers.
// The avatar carries presence; the title carries identity; the preview and
// timestamp carry recency; the unread count is the single attention cue.
// Long-press remains available for favorite, mute and archive actions.
export default function ChatListItem({ conversation, onPress, onLongPressActions }) {
  const { colors, spacing, typography, radii } = useTheme();
  const item = conversation || {};
  const participant = item.participant || {};
  const {
    lastMessage = '',
    lastMessageAt = '',
    unreadCount = 0,
    isGroup,
    isFavorite,
    isMuted,
  } = item;

  const displayName = participant.name || (isGroup ? 'Group conversation' : 'Unknown chat');
  const preview = lastMessage || 'Start a conversation';
  const unreadLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      onLongPress={onLongPressActions}
      delayLongPress={450}
      accessibilityRole="button"
      accessibilityLabel={`${displayName}, ${preview}${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      accessibilityHint="Long-press for favorite, mute, and archive options"
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: hexToRgba(colors.textPrimary, 0.08) },
        pressed && { backgroundColor: hexToRgba(colors.primary, 0.08) },
      ]}
    >
      <Avatar
        name={displayName}
        color={participant.avatarColor}
        imageUrl={participant.avatarUrl}
        online={isGroup ? undefined : participant.online}
        isGroup={isGroup}
      />

      <View style={[styles.details, { marginLeft: spacing.sm }]}>
        <View style={styles.topLine}>
          <View style={styles.nameRow}>
            {isFavorite ? (
              <Ionicons name="star" size={13} color={colors.gold} style={{ marginRight: spacing.xxs }} />
            ) : null}
            {isMuted ? (
              <Ionicons name="volume-mute-outline" size={14} color={colors.textSecondary} style={{ marginRight: spacing.xxs }} />
            ) : null}
            <Text
              style={[typography.bodyStrong, { color: colors.textPrimary, flexShrink: 1 }]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
          </View>
          {!!lastMessageAt && (
            <Text
              style={[typography.small, styles.timestamp, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {lastMessageAt}
            </Text>
          )}
        </View>

        <View style={styles.bottomLine}>
          <Text
            style={[
              unreadCount > 0 ? typography.bodyStrong : typography.caption,
              { color: unreadCount > 0 ? colors.textPrimary : colors.textSecondary, flex: 1 },
            ]}
            numberOfLines={1}
          >
            {preview}
          </Text>
          {unreadCount > 0 ? (
            <View
              style={[
                styles.badge,
                { backgroundColor: colors.primary, borderRadius: radii.pill, marginLeft: spacing.sm },
              ]}
              accessible={false}
            >
              <Text style={styles.badgeText}>{unreadLabel}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  details: { flex: 1, minWidth: 0 },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  timestamp: { marginLeft: 8, fontVariant: ['tabular-nums'] },
  bottomLine: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  badge: {
    minWidth: 22,
    minHeight: 22,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontFamily: 'Manrope_700Bold', fontVariant: ['tabular-nums'] },
});
