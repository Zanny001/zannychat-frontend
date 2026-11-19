import React from 'react';
import { View, Text } from 'react-native';
import ChatBubble from './ChatBubble';
import { useTheme } from '../theme/ThemeContext';

/**
 * Presentation-only row for the conversation timeline.
 * ChatScreen owns message state, permissions and callbacks; this component
 * owns only the day separator and message-bubble composition.
 */
export default function ChatMessageRow({
  item,
  mine = false,
  isGroup = false,
  status,
  seenByCount = 0,
  deliveredToCount = 0,
  reactions = [],
  reactionExtra = 0,
  searchHighlight = false,
  activeSearchHighlight = false,
  onSwipeReply,
  onShowActions,
  onViewImage,
  onSaveMedia,
  onOpenFile,
  onOpenContact,
}) {
  const { colors, spacing, typography } = useTheme();

  if (item?.type === 'day') {
    return (
      <View style={{ alignItems: 'center', marginVertical: spacing.sm }}>
        <Text style={[typography.small, { color: colors.textSecondary }]}>{item.label}</Text>
      </View>
    );
  }

  return (
    <ChatBubble
      message={item}
      isMine={mine}
      senderName={isGroup && !mine ? item?.senderName : undefined}
      status={status}
      seenByCount={seenByCount}
      deliveredToCount={deliveredToCount}
      replyPreview={item?.replyPreview}
      reactions={reactions}
      reactionExtra={reactionExtra}
      searchHighlight={searchHighlight}
      activeSearchHighlight={activeSearchHighlight}
      onSwipeReply={onSwipeReply}
      onShowActions={onShowActions}
      onViewImage={onViewImage}
      onSaveMedia={onSaveMedia}
      onOpenFile={onOpenFile}
      onOpenContact={onOpenContact}
    />
  );
}
