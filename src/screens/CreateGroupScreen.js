import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
import { fetchContacts, createGroupConversation } from '../services/api';
import { hexToRgba } from '../utils/color';

// The backend requires 2+ other people for a group (see
// zannychat-backend's POST /conversations/group) — a "group" of just
// you and one other person is a 1:1, which already has its own,
// simpler flow.
const MIN_OTHER_MEMBERS = 2;

export default function CreateGroupScreen({ navigation }) {
  const { colors, spacing, typography, radii, layout } = useTheme();
  const [contacts, setContacts] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [contactsError, setContactsError] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const mountedRef = useRef(true);

  async function loadContacts() {
    setLoadingContacts(true);
    setContactsError('');
    try {
      const result = await fetchContacts();
      if (mountedRef.current) setContacts(Array.isArray(result) ? result : []);
    } catch (err) {
      if (mountedRef.current) setContactsError(err?.message || 'Could not load contacts. Please try again.');
    } finally {
      if (mountedRef.current) setLoadingContacts(false);
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    loadContacts();
    return () => { mountedRef.current = false; };
  }, []);

  function toggle(contactId) {
    setSelectedIds((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId]
    );
  }

  const selectedContacts = contacts.filter((contact) => selectedIds.includes(contact.id));
  const visibleContacts = useMemo(() => { const query = contactSearch.trim().toLowerCase(); return query ? contacts.filter((contact) => String(contact.name || '').toLowerCase().includes(query)) : contacts; }, [contacts, contactSearch]);
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
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <Header
        title="New group"
        onBack={() => navigation.goBack()}
        right={
          creating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <TouchableOpacity onPress={handleCreate} disabled={!canCreate || creating} accessibilityRole="button" accessibilityLabel="Create group" accessibilityState={{ disabled: !canCreate || creating, busy: creating }} style={{ minHeight: 48, justifyContent: "center" }}>
              <Text style={[typography.bodyStrong, { color: canCreate ? colors.primary : colors.textSecondary }]}>Create</Text>
            </TouchableOpacity>
          )
        }
      />

      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}>
        <GlassCard glow style={{ borderRadius: 24, borderWidth: 1, borderColor: hexToRgba(colors.primary, 0.28), marginBottom: spacing.sm }} contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: hexToRgba(colors.primary, 0.16), borderWidth: 1, borderColor: hexToRgba(colors.primary, 0.32) }}>
              <Ionicons name="people" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '900', letterSpacing: 1.2 }]}>CREATE YOUR CIRCLE</Text>
              <Text style={[typography.heading, { color: colors.textPrimary, fontSize: 20, lineHeight: 25 }]}>Bring your people together.</Text>
            </View>
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 19 }]}>Give your group a name, choose your people and create a space that feels like yours.</Text>
          <GlassInput value={name} onChangeText={setName} placeholder="Give your group a name" accessibilityLabel="Group name" />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
            <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>
              {selectedIds.length === 0
                ? `Choose at least ${MIN_OTHER_MEMBERS} people to begin`
                : `${selectedIds.length} people selected${selectedIds.length < MIN_OTHER_MEMBERS ? ` · ${MIN_OTHER_MEMBERS - selectedIds.length} more needed` : ''}`}
            </Text>
            <View style={{ paddingHorizontal: 11, paddingVertical: 7, borderRadius: 12, backgroundColor: hexToRgba(canCreate ? colors.primary : colors.textSecondary, 0.12), borderWidth: 1, borderColor: hexToRgba(canCreate ? colors.primary : colors.textSecondary, 0.24) }}>
              <Text style={[typography.small, { color: canCreate ? colors.primary : colors.textSecondary, fontWeight: '900', letterSpacing: 0.5 }]}>{selectedIds.length} SELECTED</Text>
            </View>
          </View>
          {selectedContacts.length > 0 ? (
            <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '800', letterSpacing: 0.8 }]}>YOUR SELECTED PEOPLE</Text>
                <Text style={[typography.small, { color: colors.textSecondary }]}>{selectedContacts.length} of {contacts.length}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs, paddingVertical: 2 }}>
                {selectedContacts.map((contact) => (
                  <TouchableOpacity key={contact.id} onPress={() => toggle(contact.id)} activeOpacity={0.78} accessibilityRole="button" accessibilityLabel={`Remove ${contact.name} from group`} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7, paddingLeft: 7, paddingRight: 11, borderRadius: 15, borderWidth: 1, borderColor: hexToRgba(colors.primary, 0.34), backgroundColor: hexToRgba(colors.primary, 0.11) }}>
                    <Avatar name={contact.name} color={contact.avatarColor} imageUrl={contact.avatarUrl} size={30} />
                    <Text numberOfLines={1} style={[typography.caption, { color: colors.textPrimary, fontWeight: '800', maxWidth: 112 }]}>{contact.name}</Text>
                    <Ionicons name="close-circle" size={16} color={colors.primary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </GlassCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs }}>
          <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '800', letterSpacing: 1 }]}>INVITE YOUR PEOPLE</Text>
          <Text style={[typography.small, { color: colors.textSecondary }]}>{contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'}</Text>
        </View>
        <GlassInput value={contactSearch} onChangeText={setContactSearch} placeholder="Find someone by name" accessibilityLabel="Search contacts by name" autoCapitalize="none" returnKeyType="search" />
      </View>

      <FlatList
        data={visibleContacts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.lg, flexGrow: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}
        ListEmptyComponent={
          loadingContacts ? (
            <ActivityIndicator color={colors.primary} style={{ padding: spacing.xl }} />
          ) : contactsError ? (
            <View style={{ alignItems: 'center', padding: spacing.lg, gap: spacing.sm }}>
              <Text accessibilityRole="alert" style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>{contactsError}</Text>
              <TouchableOpacity onPress={loadContacts} accessibilityRole="button" accessibilityLabel="Retry loading contacts" style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md }}>
                <Text style={[typography.bodyStrong, { color: colors.primary }]}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : contactSearch.trim() ? (
            <View style={{ alignItems: 'center', padding: spacing.lg, gap: spacing.sm }}>
              <Ionicons name="search-outline" size={26} color={colors.textSecondary} />
              <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>No contacts match that name.</Text>
              <TouchableOpacity onPress={() => setContactSearch('')} accessibilityRole="button" accessibilityLabel="Clear contact search" style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md }}><Text style={[typography.bodyStrong, { color: colors.primary }]}>Clear search</Text></TouchableOpacity>
            </View>
          ) : (
            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', padding: spacing.lg }]}>No contacts available to add yet.</Text>
          )
        }
        renderItem={({ item }) => {
          const selected = selectedIds.includes(item.id);
          return (
            <TouchableOpacity onPress={() => toggle(item.id)} activeOpacity={0.8} accessibilityRole="checkbox" accessibilityLabel={'Select ' + item.name + ' for group'} accessibilityState={{ checked: selected }} style={{ minHeight: 48 }}>
              <GlassCard glow={selected} tintAlpha={selected ? 0.42 : 0.24} style={{ marginBottom: spacing.sm, borderWidth: 1, borderColor: selected ? hexToRgba(colors.primary, 0.58) : colors.border, borderRadius: 18 }} contentStyle={[styles.row, { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }] } intensity={26}>
                <Avatar name={item.name} color={item.avatarColor} imageUrl={item.avatarUrl} online={item.online} />
                <Text style={[typography.body, { color: colors.textPrimary, marginLeft: spacing.sm, flex: 1, minWidth: 0 }]}>{item.name}</Text>
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
                  {selected && <Ionicons name="checkmark" size={14} color={colors.onPrimary} />}
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
