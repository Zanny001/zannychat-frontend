import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import { fetchContacts } from '../services/api';

export default function NewChatScreen({ navigation }) {
  const { colors, spacing, typography, radii } = useTheme();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      <Header title="Global Connect" onBack={() => navigation.goBack()} />

      <TouchableOpacity
        style={[styles.qrCard, { marginHorizontal: spacing.md, marginVertical: spacing.md, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radii.lg, borderColor: 'rgba(255,255,255,0.1)' }]}
        onPress={() => Alert.alert('ZannyChat Connect', 'Encrypted camera-based QR contact discovery ships in the next build.')}
      >
        <View style={[styles.qrIcon, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
          <Ionicons name="qr-code-outline" size={24} color={colors.primary} />
        </View>
        <View style={{ marginLeft: spacing.md }}>
          <Text style={[typography.bodyStrong, { color: '#fff' }]}>Scan Global ID</Text>
          <Text style={[typography.caption, { color: 'rgba(255,255,255,0.6)', marginTop: 2 }]}>Connect instantly via QR code</Text>
        </View>
      </TouchableOpacity>

      <Text style={[typography.caption, { color: 'rgba(255,255,255,0.5)', paddingHorizontal: spacing.lg, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 1 }]}>
        Your Network
      </Text>

      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: spacing.md }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.contactRow, { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: radii.md, marginBottom: 8 }]}
            onPress={() => startChat(item)}
          >
            <Avatar name={item.name} color={item.avatarColor} online={item.online} />
            <View style={{ marginLeft: spacing.sm, flex: 1 }}>
              <Text style={[typography.bodyStrong, { color: '#fff' }]}>{item.name}</Text>
              <Text style={[typography.caption, { color: 'rgba(255,255,255,0.4)', marginTop: 2 }]}>Verified Contact</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contactRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  qrCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderWidth: 1 },
  qrIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
