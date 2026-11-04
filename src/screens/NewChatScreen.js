
import React, { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import GlassCard from '../components/GlassCard';
import { debugLog } from '../utils/diagnostics';
import { filterMemberDirectory, memberFavoritesStorageKey, toggleMemberFavorite } from '../utils/memberFavorites';
import { startPresence, subscribePresence } from '../services/presence';
import {
  fetchContacts,
  createConversation,
  sendAttachment,
  getCurrentUser,
} from '../services/api';

export default function NewChatScreen({ navigation, route }) {
  const { colors, spacing, typography } = useTheme();

  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [contactsError, setContactsError] = useState('');
  const [chatError, setChatError] = useState('');
  const [openingChatId, setOpeningChatId] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [directoryFilter, setDirectoryFilter] = useState('all');
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [favoriteStorageKey, setFavoriteStorageKey] = useState('zannychat:member-favorites:v1:guest');
  const [onlineIds, setOnlineIds] = useState(new Set());

  const shareToConversationId = route?.params?.shareToConversationId;
  const isShareMode = Boolean(shareToConversationId);
  const presenceAwareContacts = contacts.map((contact) => ({ ...contact, online: onlineIds.has(contact.id) }));
  const activeFilter = onlineOnly ? 'online' : directoryFilter;
  const visibleContacts = useMemo(() => filterMemberDirectory(presenceAwareContacts, memberSearch, activeFilter, favoriteIds), [contacts, onlineIds, memberSearch, activeFilter, favoriteIds]);

  useEffect(() => {
    let active = true;
    getCurrentUser().then(async (user) => {
      const key = memberFavoritesStorageKey(user?.id);
      const raw = await AsyncStorage.getItem(key);
      let parsed = [];
      try { parsed = raw ? JSON.parse(raw) : []; } catch (_) { parsed = []; }
      if (active) { setFavoriteStorageKey(key); setFavoriteIds(Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []); }
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  async function toggleFavorite(contactId) {
    const next = toggleMemberFavorite(favoriteIds, contactId);
    setFavoriteIds(next);
    try { await AsyncStorage.setItem(favoriteStorageKey, JSON.stringify(next)); } catch (_) {
      setFavoriteIds(favoriteIds);
      Alert.alert('Could not save favorite', 'Please check device storage and try again.');
    }
  }

  useEffect(() => {
    startPresence();
    return subscribePresence(setOnlineIds);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadContacts() {
      setLoadingContacts(true);
      setContactsError('');

      try {
        const result = await fetchContacts();

        if (isMounted) {
          setContacts(Array.isArray(result) ? result : []);
        }
      } catch (err) {
        console.error('[NewChat] Failed to fetch contacts:', err);

        if (isMounted) {
          setContactsError(
            err?.message || 'Could not load contacts. Please try again.'
          );
        }
      } finally {
        if (isMounted) {
          setLoadingContacts(false);
        }
      }
    }

    loadContacts();

    return () => {
      isMounted = false;
    };
  }, []);

  async function startChat(contact) {
    if (openingChatId !== null) return;

    if (!contact?.id) {
      setChatError('This contact has no valid user ID. Please refresh your contacts.');
      return;
    }

    setOpeningChatId(contact.id);
    setChatError('');


    try {
      debugLog('[NewChat] Creating conversation');
      const createStartedAt = Date.now();

      const conversation = await createConversation(contact.id, contact);
      debugLog('[Perf][NewChat] createConversationMs:', Date.now() - createStartedAt);

      if (!conversation?.id) {
        throw new Error(
          'The server did not return a valid conversation. Please try again.'
        );
      }

      debugLog('[NewChat] Conversation created');

      navigation.navigate('Chat', { conversation });
    } catch (err) {
      console.error('[NewChat] Failed to open chat:', err);

      setChatError(
        err?.message || 'Could not start this chat. Please try again.'
      );
    } finally {
      setOpeningChatId(null);
    }
  }

  async function shareContact(contact) {
    if (sendingId !== null) return;

    setSendingId(contact.id);
    setChatError('');

    try {
      await sendAttachment(shareToConversationId, {
        mediaType: 'contact',
        sharedUserId: contact.id,
        mediaName: contact.name,
      });

      navigation.goBack();
    } catch (err) {
      console.error('[NewChat] Failed to share contact:', err);

      Alert.alert(
        "Couldn't share contact",
        err?.message || 'Please try again.'
      );
    } finally {
      setSendingId(null);
    }
  }

  async function retryContacts() {
    setLoadingContacts(true);
    setContactsError('');

    try {
      const result = await fetchContacts();
      setContacts(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error('[NewChat] Contact retry failed:', err);
      setContactsError(
        err?.message || 'Could not load contacts. Please try again.'
      );
    } finally {
      setLoadingContacts(false);
    }
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Header
        title={isShareMode ? 'Share a contact' : 'New chat'}
        onBack={() => navigation.goBack()}
      />

      {!isShareMode && (
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.sm, marginBottom: spacing.sm }}>
          <Text style={[typography.title, { color: colors.textPrimary }]}>Find people on ZannyChat</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Search registered members and start a private conversation instantly.</Text>
          <View style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: spacing.md, backgroundColor: colors.surface }}>
            <Ionicons name="search-outline" size={19} color={colors.textSecondary} />
            <TextInput value={memberSearch} onChangeText={setMemberSearch} placeholder="Search names or status…" placeholderTextColor={colors.textSecondary} accessibilityLabel="Search ZannyChat members" returnKeyType="search" autoCapitalize="none" style={[typography.body, { flex: 1, marginLeft: spacing.sm, color: colors.textPrimary, minHeight: 46 }]} />
            {memberSearch ? <TouchableOpacity onPress={() => setMemberSearch('')} accessibilityRole="button" accessibilityLabel="Clear member search" style={{ minWidth: 40, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="close-circle" size={20} color={colors.textSecondary} /></TouchableOpacity> : null}
          </View>
          <View style={{ gap: spacing.sm }}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>{loadingContacts ? 'Finding members…' : `${visibleContacts.length} of ${contacts.length} member${contacts.length === 1 ? '' : 's'}${favoriteIds.length ? ` · ${favoriteIds.length} saved` : ''}`}</Text>
            <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' }}>
              {[{ id: 'all', label: 'All members', icon: 'people-outline' }, { id: 'online', label: 'Online', icon: 'radio-button-on-outline' }, { id: 'favorites', label: 'Favorites', icon: 'star-outline' }].map((option) => {
                const selected = activeFilter === option.id;
                return <TouchableOpacity key={option.id} onPress={() => { setDirectoryFilter(option.id); setOnlineOnly(false); }} accessibilityRole="radio" accessibilityState={{ selected }} style={{ minHeight: 42, paddingHorizontal: spacing.md, borderRadius: 22, borderWidth: 1, borderColor: selected ? colors.accent : colors.border, backgroundColor: selected ? colors.surface : 'transparent', flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name={option.icon} size={16} color={selected ? colors.accent : colors.textSecondary} /><Text style={[typography.caption, { color: selected ? colors.accent : colors.textSecondary }]}>{option.label}</Text></TouchableOpacity>;
              })}
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TouchableOpacity onPress={() => navigation.navigate('ContactDiscovery')} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Find friends by phone"><GlassCard contentStyle={styles.qrRow}><Ionicons name="people-outline" size={18} color={colors.accent} /><Text style={[typography.caption, { color: colors.textPrimary, marginLeft: 6 }]}>Find friends</Text></GlassCard></TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('QRContact')} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Connect by QR code"><GlassCard contentStyle={styles.qrRow}><Ionicons name="qr-code-outline" size={18} color={colors.accent} /><Text style={[typography.caption, { color: colors.textPrimary, marginLeft: 6 }]}>Scan QR</Text></GlassCard></TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('CreateGroup')} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="New group"><GlassCard contentStyle={styles.qrRow}><Ionicons name="people-outline" size={18} color={colors.accent} /><Text style={[typography.caption, { color: colors.textPrimary, marginLeft: 6 }]}>New group</Text></GlassCard></TouchableOpacity>
          </View>
        </View>
      )}


      {Boolean(chatError) && (
        <View
          accessibilityRole="alert"
          style={[
            styles.errorBox,
            {
              marginHorizontal: spacing.md,
              marginBottom: spacing.sm,
              backgroundColor: colors.surface,
              borderColor: '#ff7777',
            },
          ]}
        >
          <Text style={styles.errorText}>{chatError}</Text>
        </View>
      )}

      {Boolean(contactsError) && (
        <View
          style={[
            styles.errorBox,
            {
              marginHorizontal: spacing.md,
              marginBottom: spacing.sm,
              backgroundColor: colors.surface,
              borderColor: '#ff7777',
            },
          ]}
        >
          <Text style={styles.errorText}>{contactsError}</Text>

          <TouchableOpacity
            onPress={retryContacts}
            disabled={loadingContacts}
            accessibilityRole="button"
          >
            <Text
              style={[
                typography.bodyStrong,
                { color: colors.accent, marginTop: spacing.sm },
              ]}
            >
              Try again
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {loadingContacts ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text
            style={[
              typography.caption,
              { color: colors.textSecondary, marginTop: spacing.sm },
            ]}
          >
            Loading contacts...
          </Text>
        </View>
      ) : (
        <FlatList
          data={visibleContacts}
          keyExtractor={(item, index) =>
            item?.id ? String(item.id) : `contact-${index}`
          }
          contentContainerStyle={{
            paddingHorizontal: spacing.md,
            paddingTop: isShareMode ? spacing.md : 0,
            paddingBottom: spacing.md,
            flexGrow: 1,
          }}
          ListEmptyComponent={
            !contactsError ? (
              <View style={styles.centered}>
                <Text
                  style={[
                    typography.body,
                    { color: colors.textSecondary, textAlign: 'center' },
                  ]}
                >
                  {contacts.length === 0 ? 'No ZannyChat members found yet.' : activeFilter === 'favorites' && !memberSearch.trim() ? 'No favorites saved yet. Tap the star beside a member to keep them close.' : activeFilter === 'online' ? 'Nobody is online right now. Try All members to see everyone.' : `No members match “${memberSearch.trim()}”. Try another name or status.`}
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const isOpening = openingChatId === item.id;
            const isSending = sendingId === item.id;
            const isBusy = openingChatId !== null || sendingId !== null;

            return (
              <TouchableOpacity
                onPress={() =>
                  isShareMode ? shareContact(item) : startChat(item)
                }
                activeOpacity={0.7}
                disabled={isBusy}
                accessibilityRole="button"
                accessibilityLabel={
                  isShareMode
                    ? `Share contact ${item.name}`
                    : `Open chat with ${item.name}`
                }
                accessibilityState={{ disabled: isBusy }}
              >
                <GlassCard
                  style={{ marginBottom: spacing.sm }}
                  contentStyle={styles.row}
                  intensity={26}
                >
                  <Avatar
                    name={item.name}
                    color={item.avatarColor}
                    imageUrl={item.avatarUrl}
                    online={item.online}
                  />

                  <Text
                    style={[
                      typography.body,
                      {
                        color: colors.textPrimary,
                        marginLeft: spacing.sm,
                        flex: 1,
                      },
                    ]}
                  >
                    {item.name}
                  </Text>

                  {!isShareMode && <TouchableOpacity onPress={() => toggleFavorite(item.id)} accessibilityRole="button" accessibilityLabel={favoriteIds.includes(item.id) ? `Remove ${item.name} from favorites` : `Add ${item.name} to favorites`} accessibilityState={{ selected: favoriteIds.includes(item.id) }} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={favoriteIds.includes(item.id) ? 'star' : 'star-outline'} size={20} color={favoriteIds.includes(item.id) ? '#F4B740' : colors.textSecondary} /></TouchableOpacity>}

                  {(isOpening || isSending) && (
                    <ActivityIndicator
                      size="small"
                      color={colors.textSecondary}
                    />
                  )}
                </GlassCard>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qrRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qrIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: '#ff7777',
    fontSize: 14,
  },
});
