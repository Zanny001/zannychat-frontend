import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, Animated, TouchableOpacity, Linking } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useTheme } from '../theme/ThemeContext';
import Avatar from './Avatar';
import { extractFirstUrl } from '../utils/links';
import { fetchLinkPreview } from '../services/api';

const QUICK_REACTIONS = ['❤️', '😂', '👍', '😮', '😢'];

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, '0')}`;
}

// Isolated into its own component so useAudioPlayer only ever mounts
// for an actual voice message — ChatBubble itself can't conditionally
// call it (rules of hooks), and every other message type has no audio
// to load at all.
function VoiceBubbleContent({ message, isMine, captionColor }) {
  const { colors, spacing, typography } = useTheme();
  const player = useAudioPlayer(message.mediaUrl);
  const status = useAudioPlayerStatus(player);

  function togglePlayback() {
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  }

  const duration = status.duration || message.mediaDuration || 0;
  const progress = duration > 0 ? Math.min(1, (status.currentTime || 0) / duration) : 0;

  return (
    <TouchableOpacity
      onPress={togglePlayback}
      activeOpacity={0.85}
      style={styles.voiceRow}
      accessibilityRole="button"
      accessibilityLabel={status.playing ? 'Pause voice message' : 'Play voice message'}
      accessibilityHint="Plays or pauses this voice message"
    >
      <View style={[styles.playButton, { backgroundColor: isMine ? 'rgba(255,255,255,0.22)' : colors.surface }]}>
        <Ionicons name={status.playing ? 'pause' : 'play'} size={16} color={captionColor} />
      </View>
      <View style={{ flex: 1, marginLeft: spacing.sm }}>
        <View style={[styles.waveTrack, { backgroundColor: isMine ? 'rgba(255,255,255,0.3)' : colors.border }]}>
          <View
            style={[
              styles.waveFill,
              { width: `${progress * 100}%`, backgroundColor: isMine ? '#FFFFFF' : colors.primary },
            ]}
          />
        </View>
        <Text style={[typography.small, { color: isMine ? 'rgba(255,255,255,0.75)' : colors.textSecondary, marginTop: 4 }]}>
          {formatDuration(status.playing || status.currentTime > 0 ? status.currentTime : duration)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// Fetches once per message (the url dependency only changes if the
// message itself changes, which it doesn't after being sent) and
// renders nothing at all on failure — a preview that can't be built
// should never look like a broken UI element, just absent, same as a
// plain-text message with no link.
function LinkPreviewCard({ url, isMine }) {
  const { colors, spacing, radii, typography } = useTheme();
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchLinkPreview(url).then((result) => {
      if (mounted) setPreview(result);
    });
    return () => {
      mounted = false;
    };
  }, [url]);

  if (!preview || (!preview.title && !preview.description && !preview.image)) return null;

  return (
    <TouchableOpacity
      onPress={() => Linking.openURL(url).catch(() => {})}
      activeOpacity={0.85}
      style={[
        styles.linkCard,
        { borderColor: isMine ? 'rgba(255,255,255,0.25)' : colors.border, borderRadius: radii.sm },
      ]}
      accessibilityRole="link"
      accessibilityLabel={`Open link: ${preview.title || preview.siteName || url}`}
      accessibilityHint="Opens this webpage"
    >
      {preview.image ? (
        <Image source={{ uri: preview.image }} style={styles.linkImage} resizeMode="cover" />
      ) : null}
      <View style={{ padding: spacing.sm }}>
        <Text
          style={[typography.small, { color: isMine ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}
          numberOfLines={1}
        >
          {preview.siteName}
        </Text>
        {preview.title ? (
          <Text
            style={[typography.bodyStrong, { color: isMine ? '#FFFFFF' : colors.textPrimary, marginTop: 2 }]}
            numberOfLines={2}
          >
            {preview.title}
          </Text>
        ) : null}
        {preview.description ? (
          <Text
            style={[typography.caption, { color: isMine ? 'rgba(255,255,255,0.75)' : colors.textSecondary, marginTop: 2 }]}
            numberOfLines={2}
          >
            {preview.description}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// The two-voice idea shows up here directly: "mine" is a solid fill in
// the mood's signal color — bold, since it's the voice you're
// projecting. "Theirs" stays a quiet neutral surface with a slim
// thread-colored rail on the leading edge — present, but not shouting
// over the words. Loud + quiet, not loud + loud.
//
// message.mediaType (unset for plain text) switches what renders
// inside the bubble: 'image' shows a thumbnail (tap for fullscreen via
// onViewImage), 'file' shows a name+size row (tap opens it via
// onOpenFile), 'voice' shows an inline play button with a real
// progress bar, 'contact' shows a small shared-profile card (tap
// starts a chat via onOpenContact). senderName (group chats only,
// passed by ChatScreen) labels who sent a received message — a 1:1
// never needs it, you already know who "they" are.
//
// status ('pending' | 'sent' | 'delivered' | 'read', mine-only — ChatScreen computes
// it by comparing this message's createdAt against the other
// participant's last_read_at) drives the tick: a single grey check
// while it's still an optimistic local echo not yet confirmed by the
// server, double grey once it's really in the database, double signal-
// colored once they've read it. No fake "delivered" state in between —
// this build has no separate delivery acknowledgment to show one
// honestly.
export default function ChatBubble({
  message,
  isMine,
  senderName,
  status,
  seenByCount = 0,
  deliveredToCount = 0,
  replyPreview,
  onSwipeReply,
  onShowActions,
  reactions = [],
  reactionExtra = 0,
  searchHighlight = false,
  activeSearchHighlight = false,
  onViewImage,
  onOpenFile,
  onOpenContact,
}) {
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

  function handlePress() {
    if (message.deletedAt) return; // a tombstone has nothing to open
    if (message.mediaType === 'image') onViewImage?.(message.mediaUrl);
    else if (message.mediaType === 'file') onOpenFile?.(message.mediaUrl, message.mediaName);
    else if (message.mediaType === 'contact') onOpenContact?.(message.sharedUserId, message.mediaName);
  }

  const replyBorderColor = isMine ? 'rgba(255,255,255,0.6)' : colors.thread;
  const captionColor = isMine ? '#FFFFFF' : colors.textPrimary;

  function renderContent() {
    // Soft-deleted message: the row still exists (replies may quote it,
    // reports may reference it) but the content never renders.
    if (message.deletedAt) {
      return (
        <View style={styles.tombstoneRow}>
          <Ionicons name="ban-outline" size={14} color={isMine ? 'rgba(255,255,255,0.7)' : colors.textSecondary} />
          <Text
            style={[
              typography.caption,
              { fontStyle: 'italic', color: isMine ? 'rgba(255,255,255,0.7)' : colors.textSecondary, marginLeft: 6 },
            ]}
          >
            This message was deleted
          </Text>
        </View>
      );
    }

    if (message.mediaType === 'image') {
      return (
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={message.text ? `Open image: ${message.text}` : 'Open image attachment'}
          accessibilityHint="Opens the image in full screen"
        >
          <Image source={{ uri: message.mediaUrl }} style={[styles.image, { borderRadius: radii.sm }]} resizeMode="cover" />
          {message.text ? <Text style={[typography.body, { color: captionColor, marginTop: 6 }]}>{message.text}</Text> : null}
        </TouchableOpacity>
      );
    }

    if (message.mediaType === 'voice') {
      return <VoiceBubbleContent message={message} isMine={isMine} captionColor={captionColor} />;
    }

    if (message.mediaType === 'file') {
      return (
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.85}
          style={[styles.fileRow, { borderColor: replyBorderColor }]}
          accessibilityRole="button"
          accessibilityLabel={`Open file ${message.mediaName || 'attachment'}${message.mediaSize ? `, ${formatFileSize(message.mediaSize)}` : ''}`}
          accessibilityHint="Opens this file using an app on your device"
        >
          <View style={[styles.fileIcon, { backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : colors.surface }]}>
            <Ionicons name="document-text-outline" size={20} color={captionColor} />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={[typography.bodyStrong, { color: captionColor }]} numberOfLines={1}>
              {message.mediaName || 'File'}
            </Text>
            <Text style={[typography.small, { color: isMine ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>
              {formatFileSize(message.mediaSize)}
            </Text>
          </View>
          <Ionicons name="download-outline" size={18} color={captionColor} />
        </TouchableOpacity>
      );
    }

    if (message.mediaType === 'contact') {
      return (
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.85}
          style={[styles.fileRow, { borderColor: replyBorderColor }]}
          accessibilityRole="button"
          accessibilityLabel={`Open contact card for ${message.mediaName || 'contact'}`}
          accessibilityHint="Opens a conversation with this contact"
        >
          <Avatar name={message.mediaName || 'Contact'} size={36} />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={[typography.bodyStrong, { color: captionColor }]} numberOfLines={1}>
              {message.mediaName || 'Contact'}
            </Text>
            <Text style={[typography.small, { color: isMine ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>
              Contact card — tap to chat
            </Text>
          </View>
          <Ionicons name="chatbubble-outline" size={18} color={captionColor} />
        </TouchableOpacity>
      );
    }

    const url = extractFirstUrl(message.text);
    return (
      <View>
        <Text style={[typography.body, { color: captionColor }]}>{message.text}</Text>
        {url ? <LinkPreviewCard url={url} isMine={isMine} /> : null}
      </View>
    );
  }

  const hasReactions = reactions.length > 0 && !message.deletedAt;

  const bubble = (
    <TouchableOpacity
      activeOpacity={0.85}
      onLongPress={() => onShowActions?.(message)}
      accessibilityLabel={
        message.deletedAt
          ? 'Deleted message'
          : `${isMine ? 'Your message' : senderName ? `Message from ${senderName}` : 'Their message'}: ${
              message.text || message.mediaType || 'attachment'
            }`
      }
      accessibilityRole="button"
      accessibilityHint="Long-press for reactions and message actions. Swipe right to reply."
      style={[
        styles.row,
        { justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: hasReactions ? spacing.md : spacing.xs },
      ]}
    >
      {!isMine && <View style={[styles.threadRail, { backgroundColor: colors.thread }]} />}
      <View style={{ maxWidth: '76%' }}>
        {senderName ? (
          <Text style={[typography.small, { color: colors.thread, marginBottom: 2, marginLeft: 4 }]}>{senderName}</Text>
        ) : null}
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: isMine ? colors.bubbleMine : colors.bubbleTheirs,
              borderTopRightRadius: isMine ? radii.sm : radii.lg,
              borderTopLeftRadius: isMine ? radii.lg : radii.sm,
              borderBottomLeftRadius: radii.lg,
              borderBottomRightRadius: radii.lg,
              ...(searchHighlight ? { borderWidth: activeSearchHighlight ? 2 : 1, borderColor: colors.gold } : null),
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

          {renderContent()}

          <View style={styles.metaRow}>
            {message.editedAt && !message.deletedAt ? (
              <Text
                style={[typography.small, { fontStyle: 'italic', color: isMine ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}
              >
                edited ·{' '}
              </Text>
            ) : null}
            <Text style={[typography.small, { color: isMine ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>
              {message.createdAt}
            </Text>
            {isMine && !message.deletedAt && (
              <Ionicons
                name={status === 'pending' ? 'time-outline' : status === 'sent' ? 'checkmark' : 'checkmark-done'}
                size={14}
                color={status === 'read' ? colors.thread : 'rgba(255,255,255,0.75)'}
                style={{ marginLeft: 4 }}
                accessibilityLabel={status === 'read' ? 'Read' : status === 'delivered' ? 'Delivered' : status === 'pending' ? 'Sending' : 'Sent'}
              />
            )}
            {isMine && deliveredToCount > 0 && !message.deletedAt ? (
              <Text
                accessibilityLabel={`Delivered to ${deliveredToCount} ${deliveredToCount === 1 ? 'member' : 'members'}`}
                style={[typography.small, { color: 'rgba(255,255,255,0.78)', marginLeft: 4 }]}
              >
                Delivered to {deliveredToCount}
              </Text>
            ) : null}
            {isMine && seenByCount > 0 && !message.deletedAt ? (
              <Text
                accessibilityLabel={`Seen by ${seenByCount} ${seenByCount === 1 ? 'member' : 'members'}`}
                style={[typography.small, { color: 'rgba(255,255,255,0.78)', marginLeft: 4 }]}
              >
                Seen by {seenByCount}
              </Text>
            ) : null}
          </View>
          {hasReactions ? (
            <View style={[styles.reactionBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {reactions.map((emoji, i) => (
                <Text key={i} style={{ fontSize: 13, marginLeft: i > 0 ? 2 : 0 }}>
                  {emoji}
                </Text>
              ))}
              {reactionExtra > 0 ? (
                <Text style={[typography.small, { color: colors.textSecondary, marginLeft: 3 }]}>{reactionExtra}</Text>
              ) : null}
            </View>
          ) : null}
        </View>
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
  bubble: { paddingVertical: 8, paddingHorizontal: 12 },
  threadRail: { width: 3, borderRadius: 2, alignSelf: 'stretch', marginRight: 6, opacity: 0.85 },
  linkCard: { marginTop: 8, borderWidth: 1, overflow: 'hidden', minWidth: 200 },
  linkImage: { width: '100%', height: 120 },
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  tombstoneRow: { flexDirection: 'row', alignItems: 'center' },
  image: { width: 220, height: 220 },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 200,
    paddingVertical: 4,
  },
  fileIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  voiceRow: { flexDirection: 'row', alignItems: 'center', minWidth: 180, paddingVertical: 4 },
  playButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  waveTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  waveFill: { height: 4, borderRadius: 2 },
});
