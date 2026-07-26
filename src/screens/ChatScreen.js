import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, FlatList, KeyboardAvoidingView, Platform, Alert, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import ChatBubble, { QUICK_REACTIONS } from '../components/ChatBubble';
import InputBar from '../components/InputBar';
import { fetchMessages, sendMessage, subscribeToMessages } from '../services/api';

export default function ChatScreen({ route, navigation }) {
  const { conversation } = route.params;
  const { colors, spacing } = useTheme();
  const [messages, setMessages] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [reactions, setReactions] = useState({});
  const listRef = useRef(null);

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
    try {
      await sendMessage(conversation.id, text, replyingTo?.id);
    } catch (err) {
      Alert.alert('Message not sent', err.message || 'Please try again.');
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

const styles = StyleSheet.create({});
