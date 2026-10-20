import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Platform, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../utils/color';
import { clearDraft, loadDraft, saveDraft } from '../services/drafts';
import { shouldPersistDraft } from '../utils/drafts';
import { EMOJI_CATEGORIES } from '../utils/emojiCatalog';

function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, '0')}`;
}

// The mic/send toggle mirrors a pattern almost everyone already knows
// from WhatsApp: an empty field shows a mic (tap to record), any text
// swaps it for a send arrow. Recording takes over the whole row rather
// than living in a corner — it's a modal-ish action (you're either
// typing or recording, never both), so the UI says so.
//
// Editing (message edit, added in the post-audit pass) reuses the same
// bar: while `editing` is set the field is prefilled with the original
// text, the reply bar swaps for an "Editing message" bar, and the send
// button becomes a check — confirming calls onSend with the new text
// and ChatScreen turns that into an UPDATE rather than an INSERT.
export default function InputBar({
  onSend,
  onTyping,
  replyingTo,
  onCancelReply,
  editing,
  onCancelEdit,
  onAttach,
  isRecording,
  recordingSeconds,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  draftKey,
}) {
  const { colors, spacing, radii, typography } = useTheme();
  const [text, setText] = useState('');
  const [draftReady, setDraftReady] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState(0);
  const userEditedRef = useRef(false);
  const previousDraftKeyRef = useRef(null);
  const wasEditingRef = useRef(false);
  const restoringDraftRef = useRef(false);

  // Load a private per-account/per-conversation draft. A quick keystroke
  // wins over a late storage read so slow devices never overwrite new input.
  useEffect(() => {
    let active = true;
    if (previousDraftKeyRef.current && previousDraftKeyRef.current !== draftKey) {
      userEditedRef.current = false;
      setText('');
    }
    previousDraftKeyRef.current = draftKey || null;
    setDraftReady(false);
    if (!draftKey) { setDraftReady(true); return () => { active = false; }; }
    loadDraft(draftKey).then((draft) => {
      if (!active) return;
      if (!userEditedRef.current) setText(draft);
      setDraftReady(true);
    });
    return () => { active = false; };
  }, [draftKey]);

  // Editing a sent message temporarily borrows the composer. The unsent
  // draft remains stored and is restored when edit mode closes.
  useEffect(() => {
    if (editing) {
      wasEditingRef.current = true;
      setText(editing.text || '');
    } else if (wasEditingRef.current) {
      wasEditingRef.current = false;
      restoringDraftRef.current = true;
      let active = true;
      loadDraft(draftKey).then((draft) => {
        if (!active) return;
        setText(draft);
        restoringDraftRef.current = false;
      });
      return () => { active = false; restoringDraftRef.current = false; };
    }
  }, [editing, draftKey]);

  useEffect(() => {
    if (!draftReady || !draftKey || editing || restoringDraftRef.current) return undefined;
    setDraftSaved(false);
    let active = true;
    const timer = setTimeout(async () => {
      const saved = await saveDraft(draftKey, text);
      if (active && saved && shouldPersistDraft(text)) setDraftSaved(true);
    }, 450);
    return () => { active = false; clearTimeout(timer); };
  }, [draftReady, draftKey, editing, text]);

  function handleChange(next) {
    userEditedRef.current = true;
    setText(next);
    if (next.trim()) onTyping?.();
  }

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    const wasEditing = Boolean(editing);
    try {
      const result = await onSend(trimmed);
      if (result === false) return; // keep failed messages editable for retry
      if (wasEditing) return; // the draft is restored when edit mode closes
      setText('');
      userEditedRef.current = false;
      await clearDraft(draftKey);
      setDraftSaved(false);
    } catch (_) {
      // The parent normally surfaces send errors. Preserve the composer text.
    }
  }

  return (
    <View style={[styles.wrap, { borderTopColor: hexToRgba(colors.textPrimary, 0.08) }]}>
      {draftSaved && !editing && !isRecording ? (
        <View style={[styles.draftStatus, { paddingHorizontal: spacing.md }]}>
          <Ionicons name="checkmark-circle-outline" size={13} color={colors.textSecondary} />
          <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: 5 }]}>Draft saved on this device</Text>
        </View>
      ) : null}
      <BlurView
        intensity={28}
        tint="dark"
        style={StyleSheet.absoluteFill}
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: hexToRgba(colors.background, 0.7) }]} />

      {editing && !isRecording ? (
        <View style={[styles.replyBar, { backgroundColor: hexToRgba(colors.surfaceAlt, 0.7), paddingHorizontal: spacing.md }]}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.small, { color: colors.accent }]}>Editing message</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
              {editing.text}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onCancelEdit}
            hitSlop={10}
            accessibilityLabel="Cancel editing"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      ) : replyingTo && !isRecording ? (
        <View style={[styles.replyBar, { backgroundColor: hexToRgba(colors.surfaceAlt, 0.7), paddingHorizontal: spacing.md }]}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.small, { color: colors.primary }]}>Replying to</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
              {replyingTo.text}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onCancelReply}
            hitSlop={10}
            accessibilityLabel="Cancel reply"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      ) : null}

      {emojiOpen && !isRecording && !editing ? (
        <View style={[styles.emojiPanel, { borderTopColor: colors.border, backgroundColor: colors.surface }]} accessibilityLabel="Emoji picker">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.sm, gap: spacing.sm }}>
            {EMOJI_CATEGORIES.map((category, index) => (
              <TouchableOpacity key={category.label} onPress={() => setEmojiCategory(index)} accessibilityRole="button" accessibilityLabel={`${category.label} emoji`} style={[styles.emojiCategory, { backgroundColor: emojiCategory === index ? colors.surfaceAlt : 'transparent', borderColor: emojiCategory === index ? colors.primary : colors.border }]}><Text style={{ fontSize: 18 }}>{category.icon}</Text></TouchableOpacity>
            ))}
          </ScrollView>
          <ScrollView style={{ maxHeight: 150 }} contentContainerStyle={styles.emojiGrid}>
            {EMOJI_CATEGORIES[emojiCategory].emojis.map((emoji, index) => (
              <TouchableOpacity key={`${emoji}-${index}`} onPress={() => { handleChange(text + emoji); }} accessibilityRole="button" accessibilityLabel={`Insert ${emoji}`} style={styles.emojiCell}><Text style={{ fontSize: 25 }}>{emoji}</Text></TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {isRecording ? (
        <View style={[styles.row, { padding: spacing.sm }]}>
          <TouchableOpacity
            onPress={onCancelRecording}
            hitSlop={8}
            style={{ padding: 6 }}
            accessibilityLabel="Discard voice recording"
            accessibilityRole="button"
          >
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </TouchableOpacity>

          <View
            style={[styles.recordingIndicator, { backgroundColor: hexToRgba(colors.surface, 0.55) }]}
            accessibilityLabel={`Recording voice message, ${formatDuration(recordingSeconds)}`}
          >
            <View style={[styles.recordingDot, { backgroundColor: colors.danger }]} />
            <Text style={[typography.body, { color: colors.textPrimary, marginLeft: 8 }]}>
              Recording… {formatDuration(recordingSeconds)}
            </Text>
          </View>

          <TouchableOpacity
            onPress={onStopRecording}
            style={[styles.sendBtn, { backgroundColor: colors.primary }]}
            accessibilityLabel="Send voice message"
            accessibilityRole="button"
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.row, { padding: spacing.sm }]}>
          <TouchableOpacity
            onPress={onAttach}
            hitSlop={8}
            style={{ padding: 6 }}
            accessibilityLabel="Attach a photo, file, or contact"
            accessibilityRole="button"
          >
            <Ionicons name="add-circle-outline" size={26} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setEmojiOpen((open) => !open)} hitSlop={6} style={{ padding: 5 }} accessibilityRole="button" accessibilityLabel={emojiOpen ? 'Close emoji picker' : 'Open emoji picker'}>
            <Text style={{ fontSize: 23 }}>{emojiOpen ? '⌨️' : '😊'}</Text>
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
              onChangeText={handleChange}
              editable={draftReady || Boolean(editing)}
              placeholder={editing ? 'Edit message' : draftReady && text ? 'Message · draft saved on this device' : 'Message'}
              placeholderTextColor={colors.textSecondary}
              style={[typography.body, { color: colors.textPrimary, flex: 1, paddingVertical: 8 }]}
              multiline
              accessibilityLabel={editing ? 'Edit message text' : 'Message text'}
            />
          </View>

          <TouchableOpacity
            onPress={text.trim() ? handleSend : onStartRecording}
            style={[styles.sendBtn, { backgroundColor: text.trim() ? colors.primary : hexToRgba(colors.surfaceAlt, 0.8) }]}
            accessibilityLabel={text.trim() ? (editing ? 'Confirm edit' : 'Send message') : 'Record a voice message'}
            accessibilityRole="button"
          >
            <Ionicons
              name={text.trim() ? (editing ? 'checkmark' : 'send') : 'mic'}
              size={18}
              color={text.trim() ? '#FFFFFF' : colors.textPrimary}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  draftStatus: { flexDirection: 'row', alignItems: 'center', paddingTop: 5, paddingBottom: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  inputWrap: { flex: 1, paddingHorizontal: 14, marginHorizontal: 6, maxHeight: 120, borderWidth: 1 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  replyBar: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  recordingIndicator: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  recordingDot: { width: 8, height: 8, borderRadius: 4 },
  emojiPanel: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, paddingBottom: 6 },
  emojiCategory: { minWidth: 38, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 18, paddingHorizontal: 6 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 6, paddingTop: 6 },
  emojiCell: { width: '12.5%', minWidth: 32, alignItems: 'center', justifyContent: 'center', paddingVertical: 5 },
});
