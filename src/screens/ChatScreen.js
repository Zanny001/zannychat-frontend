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
  const { colors, spacing, radii, typography } = useTheme();
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
    <View style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      <View style={[styles.bgOverlay, { backgroundColor: colors.background, opacity: 0.2 }]} />
      
      <View style={[styles.premiumHeader, { paddingHorizontal: spacing.md, paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingBottom: 16, backgroundColor: 'rgba(10, 10, 26, 0.85)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 16 }}>
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </TouchableOpacity>
        
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
          <Avatar name={conversation.participant.name} color={conversation.participant.avatarColor || colors.primary} size={40} />
          <View style={{ marginLeft: 12 }}>
            <Text style={[typography.bodyStrong, { color: '#fff', fontSize: 16 }]}>{conversation.participant.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <Ionicons name="lock-closed" size={10} color="rgba(255,255,255,0.5)" style={{ marginRight: 4 }} />
              <Text style={[typography.caption, { color: 'rgba(255,255,255,0.6)' }]}>
                {conversation.participant.online ? 'Online globally' : 'Securely connected'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radii.pill }]}>
          <Ionicons name="call-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: spacing.md, paddingHorizontal: spacing.sm }}
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
            Alert.alert('ZannyChat Vault', 'Secure file encryption and global transfers land in the next build.')
          }
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  bgOverlay: { ...StyleSheet.absoluteFillObject },
  premiumHeader: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }
});
