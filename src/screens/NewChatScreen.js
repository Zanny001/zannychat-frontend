import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import { fetchContacts } from '../services/api';

export default function NewChatScreen({ navigation }) {
  const { colors, spacing, typography } = useTheme();
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    fetchContacts().then(setContacts);
  }, []);

  function startChat(contact) {
    navigation.navigate('Chat', {
      conversation: {
        id: `new-${contact.id}`,
        participant: contact,
        lastMessage: '',
        lastMessageAt: '',
        unreadCount: 0,
      },
    });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="New chat" onBack={() => navigation.goBack()} />

      <TouchableOpacity
        style={[styles.qrRow, { paddingHorizontal: spacing.md, borderBottomColor: colors.border }]}
        onPress={() => Alert.alert('Scan to connect', 'Camera-based QR contact discovery ships in the next build.')}
      >
        <View style={[styles.qrIcon, { backgroundColor: colors.surface }]}>
          <Ionicons name="qr-code-outline" size={20} color={colors.accent} />
        </View>
        <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginLeft: spacing.sm }]}>
          Scan QR to add a contact
        </Text>
      </TouchableOpacity>

      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, { paddingHorizontal: spacing.md, paddingVertical: spacing.sm }]}
            onPress={() => startChat(item)}
          >
            <Avatar name={item.name} color={item.avatarColor} online={item.online} />
            <Text style={[typography.body, { color: colors.textPrimary, marginLeft: spacing.sm }]}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  qrRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  qrIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
