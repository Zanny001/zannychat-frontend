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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
} from '../services/api';

export default function ChatScreen({ route, navigation }) {
  const { conversation } = route.params;
  const { colors, spacing, radii, typography } = useTheme();
  const [messages, setMessages] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [reactions, setReactions] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [summarizing, setSummarizing] = useState(false);
  const listRef = useRef(null);
  const lastSuggestedFor = useRef(null);

  const load = useCallback(async () => {
    const data = await fetchMessages(conversation.id);
    setMessages(data);
  }, [conversation.id]);

  useEffect(() => {
    load();
    const unsubscribe = subscribeToMessages(conversation.id, (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
    });
    return unsubscribe;
  }, [conversation.id, load]);

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
            <Avatar name={conversation.participant.name} color={conversation.participant.avatarColor} size={32} />
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
            />
          )}
        />

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
          onAttach={() =>
            Alert.alert('Attachments', 'Media, documents, and the encrypted vault land in a later build.')
          }
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
});
