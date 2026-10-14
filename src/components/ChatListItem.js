import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import GlassCard from './GlassCard';
import { useTheme } from '../theme/ThemeContext';

// Every conversation preview is its own glass card now rather than a
// row in a flat list — the "translucent, bordered, floating" look the
// premium redesign asks for. The globe + lock pair is a quiet status
// line: this thread is private (RLS-gated — only participants can read
// it via the app) and reachable anywhere. Not a claim of end-to-end
// encryption specifically — see the honesty note on Onboarding's copy.
// Long-press toggles favorite (the gold star) — see ChatListScreen's
// Favorites filter pill, which is what this exists for.
export default function ChatListItem({ conversation, onPress, onLongPressActions }) {
  const { colors, spacing, typography, radii } = useTheme();
  const { participant, lastMessage, lastMessageAt, unreadCount, isGroup, isFavorite, isMuted } = conversation;

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPressActions}
      activeOpacity={0.8}
      accessibilityLabel={`${participant.name}, ${lastMessage || 'no messages yet'}${
        unreadCount > 0 ? `, ${unreadCount} unread` : ''
      }`}
      accessibilityHint="Long-press for favorite, mute, and archive options"
      accessibilityRole="button"
    >
      <GlassCard style={{ marginBottom: spacing.sm }} contentStyle={styles.content}>
        <Avatar
          name={participant.name}
          color={participant.avatarColor}
          imageUrl={participant.avatarUrl}
          online={isGroup ? undefined : participant.online}
          isGroup={isGroup}
        />
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <View style={styles.topLine}>
            <View style={styles.nameRow}>
              {isFavorite && <Ionicons name="star" size={12} color={colors.gold} style={{ marginRight: 4 }} />}
              {isMuted && (
                <Ionicons name="volume-mute-outline" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
              )}
              <Text style={[typography.bodyStrong, { color: colors.textPrimary, flexShrink: 1 }]} numberOfLines={1}>
                {participant.name}
              </Text>
            </View>
            <Text style={[typography.small, { color: colors.textSecondary }]}>{lastMessageAt}</Text>
          </View>
          <View style={styles.bottomLine}>
            <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]} numberOfLines={1}>
              {lastMessage}
            </Text>
            <View style={styles.statusIcons}>
              <Ionicons name="globe-outline" size={12} color={colors.textSecondary} style={{ opacity: 0.7 }} />
              <Ionicons
                name="lock-closed-outline"
                size={12}
                color={colors.textSecondary}
                style={{ opacity: 0.7, marginLeft: 5 }}
              />
            </View>
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.primary, borderRadius: radii.pill }]}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: { flexDirection: 'row', alignItems: 'center' },
  topLine: { flexDirection: 'row', justifyContent: 'space-between' },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  bottomLine: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  statusIcons: { flexDirection: 'row', alignItems: 'center', marginLeft: 6 },
  badge: { minWidth: 20, height: 20, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontFamily: 'Manrope_700Bold' },
});
