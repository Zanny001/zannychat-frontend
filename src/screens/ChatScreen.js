import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import ChatBubble, { QUICK_REACTIONS } from '../components/ChatBubble';
import InputBar from '../components/InputBar';
import { hexToRgba } from '../utils/color';
import {
  fetchMessages,
  sendMessage,
  subscribeToMessages,
  fetchSmartReplies,
  summarizeConversation,
  fetchContacts,
  createConversation,
  uploadChatImage,
  uploadChatFile,
  sendAttachment,
} from '../services/api';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB — a soft client-side guard, not a hard platform limit

export default function ChatScreen({ route, navigation }) {
  const { conversation } = route.params;
  const { colors, spacing, radii, typography } = useTheme();
  const [messages, setMessages] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [reactions, setReactions] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [summarizing, setSummarizing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const listRef = useRef(null);
  const lastSuggestedFor = useRef(null);

  const load = useCallback(async () => {
    const data = await fetchMessages(conversation.id);
    setMessages(data);
  }, [conversation.id]);

  // Realtime subscription lives here (mount/unmount only) so it's
  // never torn down and recreated on every focus.
  useEffect(() => {
    load();
    const unsubscribe = subscribeToMessages(conversation.id, (newMessage) => {
      setMessages((prev) => {
        // Resolves replyPreview the same way fetchMessages does for an
        // initial load — this message wasn't in that batch, so it needs
        // its own lookup against what's currently on screen.
        const replyPreview = newMessage.replyToId
          ? prev.find((m) => m.id === newMessage.replyToId)?.text
          : undefined;
        return [...prev, { ...newMessage, replyPreview }];
      });
    });
    return unsubscribe;
  }, [conversation.id, load]);

  // Reloads on every focus, separate from the mount effect above — the
  // case this actually matters for is coming back from sharing a
  // contact (NewChatScreen, "share" mode), which in mock mode has no
  // realtime to push the new message here any other way.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Smart replies only make sense when the other person spoke last —
  // suggesting replies to your own message is backwards. Guarded by
  // lastSuggestedFor so a re-render doesn't re-fire the request for a
  // message already suggested against.
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.senderId === 'me' || last.id === lastSuggestedFor.current) {
      return;
    }
    lastSuggestedFor.current = last.id;
    fetchSmartReplies(conversation.id).then(setSuggestions);
  }, [messages, conversation.id]);

  async function handleSend(text) {
    const optimistic = {
      id: `temp-${Date.now()}`,
      senderId: 'me',
      text,
      createdAt: 'Now',
      replyPreview: replyingTo?.text,
    };
    setMessages((prev) => [...prev, optimistic]);
    setReplyingTo(null);
    setSuggestions([]);
    try {
      await sendMessage(conversation.id, text, replyingTo?.id);
    } catch (err) {
      Alert.alert('Message not sent', err.message || 'Please try again.');
    }
  }

  async function handleSummarize() {
    setSummarizing(true);
    try {
      const summary = await summarizeConversation(conversation.id);
      Alert.alert(`Summary of your chat with ${conversation.participant.name}`, summary);
    } catch (err) {
      Alert.alert("Couldn't summarize", err.message || 'Please try again.');
    } finally {
      setSummarizing(false);
    }
  }

  function handleReact(message) {
    Alert.alert(
      'React',
      undefined,
      QUICK_REACTIONS.map((emoji) => ({
        text: emoji,
        onPress: () => setReactions((prev) => ({ ...prev, [message.id]: emoji })),
      })).concat({ text: 'Cancel', style: 'cancel' })
    );
  }

  function handleAttach() {
    Alert.alert('Attach', undefined, [
      { text: '📷 Photo', onPress: handlePickImage },
      { text: '📄 File', onPress: handlePickFile },
      { text: '👤 Contact', onPress: () => navigation.navigate('NewChat', { shareToConversationId: conversation.id }) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo library access in Settings to send images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;

    setUploading(true);
    try {
      const { url } = await uploadChatImage(conversation.id, asset.uri, asset.mimeType || 'image/jpeg');
      const sent = await sendAttachment(conversation.id, { mediaUrl: url, mediaType: 'image' });
      setMessages((prev) => [...prev, sent]);
    } catch (err) {
      Alert.alert("Couldn't send photo", err.message || 'Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handlePickFile() {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;

    if (asset.size && asset.size > MAX_FILE_SIZE) {
      Alert.alert('File too large', 'Files are limited to 25MB for now.');
      return;
    }

    setUploading(true);
    try {
      const uploaded = await uploadChatFile(conversation.id, asset.uri, asset.name, asset.mimeType, asset.size);
      const sent = await sendAttachment(conversation.id, {
        mediaUrl: uploaded.url,
        mediaType: 'file',
        mediaName: uploaded.name,
        mediaSize: uploaded.size,
      });
      setMessages((prev) => [...prev, sent]);
    } catch (err) {
      Alert.alert("Couldn't send file", err.message || 'Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleOpenFile(url) {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert("Couldn't open file", 'No app on this device can open that link.');
    }
  }

  // Opens (or starts) a conversation with a contact shared inside this
  // chat. Uses push, not navigate — navigate to a screen already on the
  // stack (we're already on "Chat") would just update this screen's
  // params instead of opening a new one.
  async function handleOpenContact(sharedUserId, name) {
    if (!sharedUserId) return;
    try {
      const contacts = await fetchContacts();
      const profile = contacts.find((c) => c.id === sharedUserId) || {
        id: sharedUserId,
        name: name || 'Contact',
        avatarColor: '#6C5CE7',
      };
      const newConversation = await createConversation(sharedUserId, profile);
      navigation.push('Chat', { conversation: newConversation });
    } catch (err) {
      Alert.alert("Couldn't open contact", err.message || 'Please try again.');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header
        title={conversation.participant.name}
        subtitle={conversation.participant.online ? 'Online' : 'Offline'}
        onBack={() => navigation.goBack()}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity style={{ marginRight: spacing.sm }} onPress={handleSummarize} disabled={summarizing}>
              {summarizing ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <Ionicons name="sparkles-outline" size={20} color={colors.textPrimary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={{ marginRight: spacing.sm }}>
              <Ionicons name="call-outline" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <Avatar
              name={conversation.participant.name}
              color={conversation.participant.avatarColor}
              imageUrl={conversation.participant.avatarUrl}
              size={32}
            />
          </View>
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: spacing.md }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <ChatBubble
              message={item}
              isMine={item.senderId === 'me'}
              replyPreview={item.replyPreview}
              reaction={reactions[item.id]}
              onSwipeReply={setReplyingTo}
              onReact={handleReact}
              onViewImage={setFullscreenImage}
              onOpenFile={handleOpenFile}
              onOpenContact={handleOpenContact}
            />
          )}
        />

        {uploading && (
          <View style={[styles.uploadingRow, { paddingHorizontal: spacing.md }]}>
            <ActivityIndicator size="small" color={colors.textSecondary} />
            <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: 8 }]}>Sending…</Text>
          </View>
        )}

        {suggestions.length > 0 && !replyingTo && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: 8 }}
          >
            {suggestions.map((s, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => handleSend(s)}
                style={[
                  styles.chip,
                  { backgroundColor: hexToRgba(colors.accent, 0.14), borderColor: hexToRgba(colors.accent, 0.4), borderRadius: radii.pill },
                ]}
              >
                <Text style={[typography.caption, { color: colors.accent }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <InputBar
          onSend={handleSend}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          onAttach={handleAttach}
        />
      </KeyboardAvoidingView>

      <Modal visible={Boolean(fullscreenImage)} transparent animationType="fade" onRequestClose={() => setFullscreenImage(null)}>
        <View style={styles.lightbox}>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setFullscreenImage(null)} hitSlop={16}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {fullscreenImage && (
            <Image source={{ uri: fullscreenImage }} style={styles.lightboxImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 8 },
  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  lightboxImage: { width: '100%', height: '80%' },
  lightboxClose: { position: 'absolute', top: 56, right: 20, zIndex: 1 },
});
