import React, { useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

const QUICK_REACTIONS = ['❤️', '😂', '👍', '😮', '😢'];

// The two-voice idea shows up here directly: "mine" is a solid fill in
// the mood's signal color — bold, since it's the voice you're
// projecting. "Theirs" stays a quiet neutral surface with a slim
// thread-colored rail on the leading edge — present, but not shouting
// over the words. Loud + quiet, not loud + loud.
export default function ChatBubble({ message, isMine, replyPreview, onSwipeReply, onReact, reaction }) {
  const { colors, spacing, radii, typography } = useTheme();
  const swipeableRef = useRef(null);

  function renderLeftAction(progress) {
    const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
    return (
      <View style={styles.replyIconWrap}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="arrow-undo" size={20} color={colors.primary} />
        </Animated.View>
      </View>
    );
  }

  function handleSwipeOpen() {
    onSwipeReply?.(message);
    swipeableRef.current?.close();
  }

  const replyBorderColor = isMine ? 'rgba(255,255,255,0.6)' : colors.thread;

  const bubble = (
    <TouchableOpacity
      activeOpacity={0.85}
      onLongPress={() => onReact?.(message)}
      style={[
        styles.row,
        { justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: reaction ? spacing.md : spacing.xs },
      ]}
    >
      {!isMine && <View style={[styles.threadRail, { backgroundColor: colors.thread }]} />}
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isMine ? colors.bubbleMine : colors.bubbleTheirs,
            borderTopRightRadius: isMine ? radii.sm : radii.lg,
            borderTopLeftRadius: isMine ? radii.lg : radii.sm,
            borderBottomLeftRadius: radii.lg,
            borderBottomRightRadius: radii.lg,
          },
        ]}
      >
        {replyPreview ? (
          <View style={[styles.replyPreview, { borderLeftColor: replyBorderColor }]}>
            <Text
              style={[typography.caption, { color: isMine ? 'rgba(255,255,255,0.85)' : colors.textSecondary }]}
              numberOfLines={1}
            >
              {replyPreview}
            </Text>
          </View>
        ) : null}
        <Text style={[typography.body, { color: isMine ? '#FFFFFF' : colors.textPrimary }]}>{message.text}</Text>
        <View style={styles.metaRow}>
          <Text style={[typography.small, { color: isMine ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>
            {message.createdAt}
          </Text>
          {isMine && <Ionicons name="checkmark-done" size={14} color="rgba(255,255,255,0.75)" style={{ marginLeft: 4 }} />}
        </View>
        {reaction ? (
          <View style={[styles.reactionBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ fontSize: 13 }}>{reaction}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftAction}
      onSwipeableOpen={handleSwipeOpen}
      leftThreshold={40}
      overshootLeft={false}
    >
      {bubble}
    </Swipeable>
  );
}

export { QUICK_REACTIONS };

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12 },
  bubble: { maxWidth: '76%', paddingVertical: 8, paddingHorizontal: 12 },
  threadRail: { width: 3, borderRadius: 2, alignSelf: 'stretch', marginRight: 6, opacity: 0.85 },
  metaRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 2 },
  replyPreview: {
    borderLeftWidth: 2,
    paddingLeft: 6,
    marginBottom: 4,
    opacity: 0.9,
  },
  replyIconWrap: { justifyContent: 'center', paddingHorizontal: 16 },
  reactionBadge: {
    position: 'absolute',
    bottom: -10,
    right: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
});
