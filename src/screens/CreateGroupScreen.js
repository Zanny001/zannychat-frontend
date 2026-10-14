import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
import { fetchContacts, createGroupConversation } from '../services/api';

// The backend requires 2+ other people for a group (see
// zannychat-backend's POST /conversations/group) — a "group" of just
// you and one other person is a 1:1, which already has its own,
// simpler flow.
const MIN_OTHER_MEMBERS = 2;

export default function CreateGroupScreen({ navigation }) {
  const { colors, spacing, typography, radii } = useTheme();
  const [contacts, setContacts] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchContacts().then(setContacts);
  }, []);

  function toggle(contactId) {
    setSelectedIds((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId]
    );
  }

  const canCreate = name.trim().length > 0 && selectedIds.length >= MIN_OTHER_MEMBERS;

  async function handleCreate() {
    if (!canCreate) return;
    setCreating(true);
    try {
      const memberProfiles = contacts.filter((c) => selectedIds.includes(c.id));
      const conversation = await createGroupConversation(selectedIds, name.trim(), memberProfiles);
      navigation.replace('Chat', { conversation });
    } catch (err) {
      Alert.alert("Couldn't create group", err.message || 'Please try again.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header
        title="New group"
        onBack={() => navigation.goBack()}
        right={
          creating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <TouchableOpacity onPress={handleCreate} disabled={!canCreate}>
              <Text style={[typography.bodyStrong, { color: canCreate ? colors.primary : colors.textSecondary }]}>Create</Text>
            </TouchableOpacity>
          )
        }
      />

      <View style={{ padding: spacing.md }}>
        <GlassInput value={name} onChangeText={setName} placeholder="Group name" />
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
          {selectedIds.length === 0
            ? `Pick at least ${MIN_OTHER_MEMBERS} people`
            : `${selectedIds.length} selected${selectedIds.length < MIN_OTHER_MEMBERS ? ` — need ${MIN_OTHER_MEMBERS - selectedIds.length} more` : ''}`}
        </Text>
      </View>

      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.lg }}
        renderItem={({ item }) => {
          const selected = selectedIds.includes(item.id);
          return (
            <TouchableOpacity onPress={() => toggle(item.id)} activeOpacity={0.8}>
              <GlassCard style={{ marginBottom: spacing.sm }} contentStyle={styles.row} intensity={26}>
                <Avatar name={item.name} color={item.avatarColor} imageUrl={item.avatarUrl} online={item.online} />
                <Text style={[typography.body, { color: colors.textPrimary, marginLeft: spacing.sm, flex: 1 }]}>{item.name}</Text>
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: selected ? colors.primary : 'transparent',
                      borderColor: selected ? colors.primary : colors.border,
                      borderRadius: radii.pill,
                    },
                  ]}
                >
                  {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
              </GlassCard>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 22, height: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
