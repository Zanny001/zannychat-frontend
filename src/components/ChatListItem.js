import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import Avatar from './Avatar';
import { useTheme } from '../theme/ThemeContext';

export default function ChatListItem({ conversation, onPress }) {
  const { colors, spacing, typography, radii } = useTheme();
  const { participant, lastMessage, lastMessageAt, unreadCount } = conversation;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.row, { paddingHorizontal: spacing.md, paddingVertical: spacing.sm }]}
      activeOpacity={0.7}
    >
      <Avatar name={participant.name} color={participant.avatarColor} online={participant.online} />
      <View style={{ flex: 1, marginLeft: spacing.sm }}>
        <View style={styles.topLine}>
          <Text style={[typography.bodyStrong, { color: colors.textPrimary }]} numberOfLines={1}>
            {participant.name}
          </Text>
          <Text style={[typography.small, { color: colors.textSecondary }]}>{lastMessageAt}</Text>
        </View>
        <View style={styles.bottomLine}>
          <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]} numberOfLines={1}>
            {lastMessage}
          </Text>
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary, borderRadius: radii.pill }]}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  topLine: { flexDirection: 'row', justifyContent: 'space-between' },
  bottomLine: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  badge: { minWidth: 20, height: 20, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
});
