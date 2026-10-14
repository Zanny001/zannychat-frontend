
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import GlassCard from '../components/GlassCard';
import {
  fetchContacts,
  createConversation,
  sendAttachment,
} from '../services/api';

export default function NewChatScreen({ navigation, route }) {
  const { colors, spacing, typography } = useTheme();

  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [contactsError, setContactsError] = useState('');
  const [chatError, setChatError] = useState('');
  const [openingChatId, setOpeningChatId] = useState(null);
  const [sendingId, setSendingId] = useState(null);

  const shareToConversationId = route?.params?.shareToConversationId;
  const isShareMode = Boolean(shareToConversationId);

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
      console.log('[NewChat] Creating conversation for contact:', contact.id);

      const conversation = await createConversation(contact.id, contact);

      if (!conversation?.id) {
        throw new Error(
          'The server did not return a valid conversation. Please try again.'
        );
      }

      console.log(
        '[NewChat] Conversation created:',
        conversation.id
      );

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
        <View
          style={{
            paddingHorizontal: spacing.md,
            paddingTop: spacing.md,
            gap: spacing.sm,
            marginBottom: spacing.sm,
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.navigate('QRContact')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Connect by QR code"
            accessibilityHint="Opens your contact QR code and camera scanner"
          >
            <GlassCard contentStyle={styles.qrRow}>
              <View
                style={[
                  styles.qrIcon,
                  { backgroundColor: colors.surface },
                ]}
              >
                <Ionicons
                  name="qr-code-outline"
                  size={20}
                  color={colors.accent}
                />
              </View>

              <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                <Text
                  style={[
                    typography.bodyStrong,
                    { color: colors.textPrimary },
                  ]}
                >
                  Connect by QR code
                </Text>

                <Text
                  style={[
                    typography.caption,
                    { color: colors.textSecondary },
                  ]}
                >
                  Share your code or scan a contact
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textSecondary}
              />
            </GlassCard>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('CreateGroup')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="New group"
          >
            <GlassCard contentStyle={styles.qrRow}>
              <View
                style={[
                  styles.qrIcon,
                  { backgroundColor: colors.surface },
                ]}
              >
                <Ionicons
                  name="people-outline"
                  size={20}
                  color={colors.accent}
                />
              </View>

              <Text
                style={[
                  typography.bodyStrong,
                  {
                    color: colors.textPrimary,
                    marginLeft: spacing.sm,
                  },
                ]}
              >
                New group
              </Text>
            </GlassCard>
          </TouchableOpacity>
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
          data={contacts}
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
                  No contacts found.
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
