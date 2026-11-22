import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../utils/color';
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
  const { colors, spacing, radii, typography, layout } = useTheme();
  const [userId, setUserId] = useState(null);
  const [folders, setFolders] = useState([]);
  const [name, setName] = useState('');
  const [rules, setRules] = useState(['unread']);
  const [excluded, setExcluded] = useState(['archived']);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [folderSearch, setFolderSearch] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    setLoadFailed(false);
    try {
      const user = await getCurrentUser();
      const id = user?.id || 'guest';
      setUserId(id);
      setFolders(await loadChatFolders(id));
    } catch (loadError) {
      setLoadFailed(true);
      setFolders([]);
      setError(loadError?.message || 'Could not load chat folders.');
    }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const visibleFolders = useMemo(() => {
    const query = folderSearch.trim().toLowerCase();
    if (!query) return folders;
    return folders.filter((folder) => [folder.name, ...(folder.rules || []), ...(folder.excluded || [])].join(' ').toLowerCase().includes(query));
  }, [folders, folderSearch]);

  const toggle = (list, setList, key) => setList((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  const create = async () => {
    if (loadFailed || loading) { setError('Load your existing folders successfully before making changes.'); return; }
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
  const edit = (folder) => { if (loadFailed || loading || saving) { setError('Reload your saved folders before editing.'); return; } setEditingId(folder.id); setName(folder.name); setRules([...folder.rules]); setExcluded([...folder.excluded]); setError(''); };
  const cancelEdit = () => { setEditingId(null); setName(''); setRules(['unread']); setExcluded(['archived']); setError(''); };
  const remove = (folder) => { if (loadFailed || loading || saving) { setError('Reload your saved folders before deleting.'); return; } Alert.alert('Delete folder?', `Delete “${folder.name}”? Your chats and messages will not be deleted.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      try {
        const next = await deleteChatFolder(userId, folder.id);
        setFolders(next);
      } catch (_) {
        setError('Could not delete this folder. Please try again.');
      }
    } },
  ]); };

  const Choice = ({ item, selected, onPress }) => item.icon ? (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityLabel={item.label}
      accessibilityState={{ checked: selected }}
      style={{ width: '48%', minWidth: 132, flexGrow: 1, minHeight: 88 }}
      activeOpacity={0.84}
    >
      <GlassCard noPadding glow={selected} intensity={selected ? 24 : 12} tintAlpha={selected ? 0.42 : 0.2} contentStyle={{ minHeight: 88, padding: spacing.sm, justifyContent: 'space-between', borderWidth: 1, borderColor: selected ? hexToRgba(colors.primary, 0.58) : colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: hexToRgba(selected ? colors.primary : colors.surfaceAlt, selected ? 0.2 : 0.7) }}>
            <Ionicons name={item.icon} size={18} color={selected ? colors.primary : colors.textSecondary} />
          </View>
          <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={19} color={selected ? colors.primary : colors.textSecondary} />
        </View>
        <Text style={[typography.small, { color: colors.textPrimary, fontWeight: selected ? '800' : '600' }]} numberOfLines={2}>{item.label}</Text>
      </GlassCard>
    </TouchableOpacity>
  ) : (
    <TouchableOpacity onPress={onPress} accessibilityRole="checkbox" accessibilityLabel={item.label} accessibilityState={{ checked: selected }} style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: spacing.sm, borderRadius: radii.md, backgroundColor: selected ? hexToRgba(colors.primary, 0.08) : 'transparent' }}>
      <Ionicons name={selected ? 'checkbox' : 'square-outline'} size={21} color={selected ? colors.primary : colors.textSecondary} />
      <Text style={[typography.body, { color: colors.textPrimary, marginLeft: spacing.sm, flex: 1, minWidth: 0 }]}>{item.label}</Text>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{selected ? 'On' : 'Off'}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Chat folders" subtitle="Build your own chat filters" onBack={() => navigation.goBack()} />
      <FlatList
        data={visibleFolders}
        keyExtractor={(folder) => String(folder.id)}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl || 32, flexGrow: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}
        ListHeaderComponent={
          <View>
            <GlassCard glow style={{ marginBottom: spacing.md }} contentStyle={{ padding: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
            <View style={{ width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: hexToRgba(colors.primary, 0.16), borderWidth: 1, borderColor: hexToRgba(colors.primary, 0.28) }}>
              <Ionicons name="albums-outline" size={21} color={colors.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0, marginLeft: spacing.sm }}>
              <Text style={[typography.heading, { color: colors.textPrimary }]}>Shape your chat space</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>Build a view around the conversations that matter.</Text>
            </View>
          </View>
          <View style={{ borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: hexToRgba(colors.surfaceAlt, 0.48), padding: spacing.sm, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Ionicons name="phone-portrait-outline" size={16} color={colors.accent || colors.primary} />
            <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>Folders are stored on this device and do not sync across devices yet.</Text>
          </View>
          <TextInput value={name} onChangeText={setName} maxLength={32} placeholder="e.g. Work, Close friends" placeholderTextColor={colors.textSecondary} accessibilityLabel="Folder name" style={[typography.body, { color: colors.textPrimary, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: 10, marginBottom: spacing.md }]} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Include conversations</Text>
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '800' }]}>{rules.length} selected</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {INCLUSIONS.map((item) => <Choice key={item.key} item={item} selected={rules.includes(item.key)} onPress={() => toggle(rules, setRules, item.key)} />)}
          </View>
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />
          <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginBottom: spacing.xs }]}>Fine-tune your view</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Hide conversations you don't want in this folder.</Text>
          {EXCLUSIONS.map((item) => <Choice key={item.key} item={item} selected={excluded.includes(item.key)} onPress={() => toggle(excluded, setExcluded, item.key)} />)}
          {error ? <Text accessibilityRole="alert" style={[typography.caption, { color: colors.danger, marginTop: spacing.sm }]}>{error}</Text> : null}
          {loadFailed ? <TouchableOpacity onPress={refresh} accessibilityRole="button" accessibilityLabel="Retry loading chat folders" style={{ minHeight: 48, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: spacing.sm }}><Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>Retry loading folders</Text></TouchableOpacity> : null}
          <TouchableOpacity onPress={create} disabled={saving || loading || loadFailed || !rules.length} accessibilityRole="button" accessibilityLabel={editingId ? 'Save chat folder changes' : 'Create chat folder'} accessibilityState={{ disabled: saving || loading || loadFailed || !rules.length, busy: saving }} style={{ backgroundColor: colors.primary, opacity: saving || loading || loadFailed || !rules.length ? 0.55 : 1, borderRadius: radii.pill, minHeight: 48, paddingVertical: 10, alignItems: 'center', marginTop: spacing.md, flexDirection: 'row', justifyContent: 'center' }}>
            {saving ? <ActivityIndicator color={colors.onPrimary} /> : <Ionicons name="add-circle-outline" size={18} color={colors.onPrimary} />}
            <Text style={[typography.bodyStrong, { color: colors.onPrimary, marginLeft: 8 }]}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Create folder'}</Text>
          </TouchableOpacity>
          {editingId ? <TouchableOpacity onPress={cancelEdit} accessibilityRole="button" accessibilityLabel="Cancel chat folder editing" style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}><Text style={[typography.body, { color: colors.textSecondary }]}>Cancel editing</Text></TouchableOpacity> : null}
        </GlassCard>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
              <Text style={[typography.heading, { color: colors.textPrimary }]}>Your folders</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>{visibleFolders.length} of {folders.length}</Text>
            </View>
            {folders.length > 0 ? <View style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.sm, marginBottom: spacing.sm }}>
              <Ionicons name="search-outline" size={17} color={colors.textSecondary} />
              <TextInput value={folderSearch} onChangeText={setFolderSearch} placeholder="Search folders and rules" placeholderTextColor={colors.textSecondary} accessibilityLabel="Search saved chat folders" returnKeyType="search" style={[typography.body, { flex: 1, minWidth: 0, color: colors.textPrimary, paddingVertical: spacing.sm, paddingLeft: spacing.sm }]} />
              {folderSearch ? <TouchableOpacity onPress={() => setFolderSearch('')} accessibilityRole="button" accessibilityLabel="Clear folder search" style={{ minWidth: 40, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="close-circle" size={18} color={colors.textSecondary} /></TouchableOpacity> : null}
            </View> : null}
          </View>
        }
        renderItem={({ item: folder }) => (
          <GlassCard style={{ marginBottom: spacing.sm }} contentStyle={{ padding: spacing.md, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.primary}18` }}><Ionicons name="folder-open-outline" size={20} color={colors.primary} /></View>
            <View style={{ flex: 1, minWidth: 0, marginLeft: spacing.sm }}><Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{folder.name}</Text><Text style={[typography.caption, { color: colors.textSecondary }]}>{folder.rules.join(' · ')}{folder.excluded.length ? ` · excludes ${folder.excluded.join(', ')}` : ''}</Text></View>
            <TouchableOpacity onPress={() => edit(folder)} disabled={loadFailed || loading || saving} accessibilityState={{ disabled: loadFailed || loading || saving }} accessibilityRole="button" accessibilityLabel={`Edit ${folder.name} folder`} hitSlop={8} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="create-outline" size={19} color={colors.primary} /></TouchableOpacity>
            <TouchableOpacity onPress={() => remove(folder)} disabled={loadFailed || loading || saving} accessibilityState={{ disabled: loadFailed || loading || saving }} accessibilityRole="button" accessibilityLabel={`Delete ${folder.name} folder`} hitSlop={8} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="trash-outline" size={19} color={colors.danger} /></TouchableOpacity>
          </GlassCard>
        )}
        ListEmptyComponent={loading ? <ActivityIndicator color={colors.primary} /> : loadFailed ? <Text accessibilityRole="alert" style={[typography.caption, { color: colors.danger, marginBottom: spacing.md }]}>Your existing folders are hidden until device storage can be read safely.</Text> : <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>No custom folders yet. Create one to organize your chats.</Text>}
        ListFooterComponent={loading && folders.length ? <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} /> : null}
      />
    </SafeAreaView>
  );
}
