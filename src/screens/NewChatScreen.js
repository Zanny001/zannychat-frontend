import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import GlassCard from '../components/GlassCard';
import { fetchContacts, createConversation, sendAttachment } from '../services/api';

// Doubles as the contact picker for "share a contact" — when opened
// with shareToConversationId in params (see ChatScreen's attach menu),
// tapping someone sends them as a contact card into that conversation
// instead of starting a new chat with them.
export default function NewChatScreen({ navigation, route }) {
  const { colors, spacing, typography } = useTheme();
  const [contacts, setContacts] = useState([]);
  const [sendingId, setSendingId] = useState(null);
  const shareToConversationId = route?.params?.shareToConversationId;
  const isShareMode = Boolean(shareToConversationId);

  useEffect(() => {
    fetchContacts().then(setContacts);
  }, []);

  async function startChat(contact) {
    try {
      const conversation = await createConversation(contact.id, contact);
      navigation.navigate('Chat', { conversation });
    } catch (err) {
      Alert.alert('Couldn\u2019t start chat', err.message || 'Please try again.');
    }
  }

  async function shareContact(contact) {
    setSendingId(contact.id);
    try {
      await sendAttachment(shareToConversationId, {
        mediaType: 'contact',
        sharedUserId: contact.id,
        mediaName: contact.name,
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert("Couldn't share contact", err.message || 'Please try again.');
    } finally {
      setSendingId(null);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={isShareMode ? 'Share a contact' : 'New chat'} onBack={() => navigation.goBack()} />

      {!isShareMode && (
        <View style={{ padding: spacing.md }}>
          <TouchableOpacity
            onPress={() => Alert.alert('Scan to connect', 'Camera-based QR contact discovery ships in the next build.')}
            activeOpacity={0.8}
          >
            <GlassCard contentStyle={styles.qrRow}>
              <View style={[styles.qrIcon, { backgroundColor: colors.surface }]}>
                <Ionicons name="qr-code-outline" size={20} color={colors.accent} />
              </View>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginLeft: spacing.sm }]}>
                Scan QR to add a contact
              </Text>
            </GlassCard>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: isShareMode ? spacing.md : 0 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => (isShareMode ? shareContact(item) : startChat(item))}
            activeOpacity={0.8}
            disabled={sendingId === item.id}
          >
            <GlassCard style={{ marginBottom: spacing.sm }} contentStyle={styles.row} intensity={26}>
              <Avatar name={item.name} color={item.avatarColor} imageUrl={item.avatarUrl} online={item.online} />
              <Text style={[typography.body, { color: colors.textPrimary, marginLeft: spacing.sm, flex: 1 }]}>{item.name}</Text>
              {sendingId === item.id && <ActivityIndicator size="small" color={colors.textSecondary} />}
            </GlassCard>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  qrRow: { flexDirection: 'row', alignItems: 'center' },
  qrIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
