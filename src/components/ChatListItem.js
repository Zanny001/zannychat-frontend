import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import GlassCard from './GlassCard';
import { useTheme } from '../theme/ThemeContext';

// Every conversation preview is its own glass card now rather than a
// row in a flat list — the "translucent, bordered, floating" look the
// premium redesign asks for. The globe + lock pair is a quiet status
// line: this thread is end-to-end encrypted and reachable anywhere.
export default function ChatListItem({ conversation, onPress }) {
  const { colors, spacing, typography, radii } = useTheme();
  const { participant, lastMessage, lastMessageAt, unreadCount } = conversation;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <GlassCard style={{ marginBottom: spacing.sm }} contentStyle={styles.content}>
        <Avatar name={participant.name} color={participant.avatarColor} online={participant.online} />
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <View style={styles.topLine}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary, flexShrink: 1 }]} numberOfLines={1}>
              {participant.name}
            </Text>
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
  bottomLine: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  statusIcons: { flexDirection: 'row', alignItems: 'center', marginLeft: 6 },
  badge: { minWidth: 20, height: 20, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontFamily: 'Manrope_700Bold' },
});
