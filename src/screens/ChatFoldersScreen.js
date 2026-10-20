import React, { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../theme/ThemeContext';
import { getCurrentUser } from '../services/api';
import { loadChatFolders, saveChatFolder, deleteChatFolder } from '../services/chatFolders';

const INCLUSIONS = [
  { key: 'unread', label: 'Unread chats', icon: 'mail-unread-outline' },
  { key: 'favorites', label: 'Favorites', icon: 'star-outline' },
  { key: 'groups', label: 'Groups', icon: 'people-outline' },
  { key: 'private', label: 'Private chats', icon: 'person-outline' },
];
const EXCLUSIONS = [
  { key: 'muted', label: 'Exclude muted chats' },
  { key: 'read', label: 'Exclude read chats' },
  { key: 'archived', label: 'Exclude archived chats' },
];

export default function ChatFoldersScreen({ navigation }) {
  const { colors, spacing, radii, typography } = useTheme();
  const [userId, setUserId] = useState(null);
  const [folders, setFolders] = useState([]);
  const [name, setName] = useState('');
  const [rules, setRules] = useState(['unread']);
  const [excluded, setExcluded] = useState(['archived']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      const id = user?.id || 'guest';
      setUserId(id);
      setFolders(await loadChatFolders(id));
    } catch (_) { setError('Could not load chat folders.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const toggle = (list, setList, key) => setList((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  const create = async () => {
    const cleanName = name.trim();
    if (!cleanName) { setError('Enter a name for this folder.'); return; }
    setSaving(true); setError('');
    try {
      const isEditing = Boolean(editingId);
      const next = await saveChatFolder(userId, { id: editingId || `folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: cleanName, rules, excluded, createdAt: folders.find((folder) => folder.id === editingId)?.createdAt || new Date().toISOString() });
      setFolders(next); setName(''); setRules(['unread']); setExcluded(['archived']); setEditingId(null);
      Alert.alert(isEditing ? 'Folder updated' : 'Folder created', `${cleanName} is ready. It will appear in your Chats filters.`);
    } catch (err) { setError(err?.message || 'Could not save this folder.'); }
    finally { setSaving(false); }
  };
  const edit = (folder) => { setEditingId(folder.id); setName(folder.name); setRules([...folder.rules]); setExcluded([...folder.excluded]); setError(''); };
  const cancelEdit = () => { setEditingId(null); setName(''); setRules(['unread']); setExcluded(['archived']); setError(''); };
  const remove = (folder) => Alert.alert('Delete folder?', `Delete “${folder.name}”? Your chats and messages will not be deleted.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { const next = await deleteChatFolder(userId, folder.id); setFolders(next); } },
  ]);

  const Choice = ({ item, selected, onPress, subtitle }) => (
    <TouchableOpacity onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11 }}>
      <Ionicons name={selected ? 'checkbox' : 'square-outline'} size={21} color={selected ? colors.primary : colors.textSecondary} />
      <Text style={[typography.body, { color: colors.textPrimary, marginLeft: spacing.sm, flex: 1 }]}>{item.label}</Text>
      {item.icon ? <Ionicons name={item.icon} size={18} color={colors.textSecondary} /> : null}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Chat folders" subtitle="Build your own chat filters" onBack={() => navigation.goBack()} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl || 32 }}>
        <GlassCard style={{ marginBottom: spacing.md }} contentStyle={{ padding: spacing.md }}>
          <Text style={[typography.heading, { color: colors.textPrimary, marginBottom: spacing.xs }]}>Create a folder</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>A chat appears when it matches any selected category. Folders are saved on this device and are not synced across devices yet.</Text>
          <TextInput value={name} onChangeText={setName} maxLength={32} placeholder="e.g. Work, Close friends" placeholderTextColor={colors.textSecondary} accessibilityLabel="Folder name" style={[typography.body, { color: colors.textPrimary, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: 12, marginBottom: spacing.md }]} />
          <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Include chats</Text>
          {INCLUSIONS.map((item) => <Choice key={item.key} item={item} selected={rules.includes(item.key)} onPress={() => toggle(rules, setRules, item.key)} />)}
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.sm }} />
          <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Additional filters</Text>
          {EXCLUSIONS.map((item) => <Choice key={item.key} item={item} selected={excluded.includes(item.key)} onPress={() => toggle(excluded, setExcluded, item.key)} />)}
          {error ? <Text style={[typography.caption, { color: colors.danger, marginTop: spacing.sm }]}>{error}</Text> : null}
          <TouchableOpacity onPress={create} disabled={saving || !rules.length} accessibilityRole="button" style={{ backgroundColor: colors.primary, opacity: saving || !rules.length ? 0.55 : 1, borderRadius: radii.pill, paddingVertical: 13, alignItems: 'center', marginTop: spacing.md, flexDirection: 'row', justifyContent: 'center' }}>
            {saving ? <ActivityIndicator color="#fff" /> : <Ionicons name="add-circle-outline" size={18} color="#fff" />}
            <Text style={[typography.bodyStrong, { color: '#fff', marginLeft: 8 }]}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Create folder'}</Text>
          </TouchableOpacity>
          {editingId ? <TouchableOpacity onPress={cancelEdit} accessibilityRole="button" style={{ alignItems: 'center', paddingVertical: 10 }}><Text style={[typography.body, { color: colors.textSecondary }]}>Cancel editing</Text></TouchableOpacity> : null}
        </GlassCard>
        <Text style={[typography.heading, { color: colors.textPrimary, marginBottom: spacing.sm }]}>Your folders · {folders.length}</Text>
        {loading ? <ActivityIndicator color={colors.primary} /> : folders.length ? folders.map((folder) => (
          <GlassCard key={folder.id} style={{ marginBottom: spacing.sm }} contentStyle={{ padding: spacing.md, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.primary}18` }}><Ionicons name="folder-open-outline" size={20} color={colors.primary} /></View>
            <View style={{ flex: 1, marginLeft: spacing.sm }}><Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{folder.name}</Text><Text style={[typography.caption, { color: colors.textSecondary }]}>{folder.rules.join(' · ')}{folder.excluded.length ? ` · excludes ${folder.excluded.join(', ')}` : ''}</Text></View>
            <TouchableOpacity onPress={() => edit(folder)} accessibilityRole="button" accessibilityLabel={`Edit ${folder.name} folder`} hitSlop={8} style={{ padding: 7 }}><Ionicons name="create-outline" size={19} color={colors.primary} /></TouchableOpacity>
            <TouchableOpacity onPress={() => remove(folder)} accessibilityRole="button" accessibilityLabel={`Delete ${folder.name} folder`} hitSlop={8} style={{ padding: 7 }}><Ionicons name="trash-outline" size={19} color={colors.danger} /></TouchableOpacity>
          </GlassCard>
        )) : <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>No custom folders yet. Create one to organize your chats.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}
