import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import GlassCard from '../components/GlassCard';
import { fetchContacts, createConversation } from '../services/api';

export default function NewChatScreen({ navigation }) {
  const { colors, spacing, typography } = useTheme();
  const [contacts, setContacts] = useState([]);

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="New chat" onBack={() => navigation.goBack()} />

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

      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: spacing.md }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => startChat(item)} activeOpacity={0.8}>
            <GlassCard style={{ marginBottom: spacing.sm }} contentStyle={styles.row} intensity={26}>
              <Avatar name={item.name} color={item.avatarColor} online={item.online} />
              <Text style={[typography.body, { color: colors.textPrimary, marginLeft: spacing.sm }]}>{item.name}</Text>
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
