import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import GlassCard from '../components/GlassCard';
import { fetchBlockedUsers, unblockUser, changePassword, deleteAccount } from '../services/api';
import { supabase, SUPABASE_ENABLED } from '../services/supabaseClient';
import { startGoogleOAuth } from '../services/googleAuth';
import { BACKEND_ENABLED } from '../services/backendClient';
import GlassInput from '../components/GlassInput';
import { validatePasswordChange } from '../utils/authValidation';
import { getPrivacyCheckupItems } from '../utils/privacyCheckup';

const ACCOUNT_DELETE_REAUTH_KEY = 'zannychat.account-delete-reauth.v1';
// Backend requires auth_time within five minutes; keep a 30-second safety margin.
const ACCOUNT_DELETE_REAUTH_TTL_MS = 4 * 60 * 1000 + 30 * 1000;

// One of the three Profile rows the Oct 2026 audit found rendering but
// doing nothing ("the single most visible 'looks finished, isn't'
// moment"). Now a real screen: your block list (with unblock), plus an
// honest statement of what privacy the app does and doesn't provide
// today — the audit's encryption finding restated where a user can
// actually read it, instead of only in a markdown file.
export default function PrivacySecurityScreen({ navigation }) {
  const { colors, spacing, typography, layout } = useTheme();
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [authProviders, setAuthProviders] = useState({ email: true, google: false });
  const [reauthenticatingGoogle, setReauthenticatingGoogle] = useState(false);
  const [googleReauthVerifiedUserId, setGoogleReauthVerifiedUserId] = useState(null);
  const [googleReauthMismatch, setGoogleReauthMismatch] = useState(false);
  const authUserIdRef = useRef(null);
  const blockedRequestRef = useRef(0);
  const authProviderRequestRef = useRef(0);

  const refreshBlockedUsers = useCallback(async (expectedUserId = null) => {
    const requestId = ++blockedRequestRef.current;
    try {
      if (!SUPABASE_ENABLED || !supabase) {
        const entries = await fetchBlockedUsers();
        if (requestId === blockedRequestRef.current) setBlocked(Array.isArray(entries) ? entries : []);
        return requestId;
      }
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const userId = authData?.user?.id || null;
      if (authError || !userId || (expectedUserId && userId !== expectedUserId)) {
        if (requestId === blockedRequestRef.current) setBlocked([]);
        return requestId;
      }
      const entries = await fetchBlockedUsers();
      const { data: latestAuthData } = await supabase.auth.getUser();
      if (requestId === blockedRequestRef.current && latestAuthData?.user?.id === userId) {
        setBlocked(Array.isArray(entries) ? entries : []);
      }
      return requestId;
    } catch {
      if (requestId === blockedRequestRef.current) setBlocked([]);
      return requestId;
    }
  }, []);

  const refreshAuthProviders = useCallback(async () => {
    if (!SUPABASE_ENABLED || !supabase) return;
    const requestId = ++authProviderRequestRef.current;
    const { data, error } = await supabase.auth.getUser();
    if (requestId !== authProviderRequestRef.current) return;
    if (error || !data?.user) {
      authUserIdRef.current = null;
      setAuthProviders({ email: false, google: false });
      setGoogleReauthVerifiedUserId(null);
      setGoogleReauthMismatch(false);
      return;
    }
    const providers = new Set([
      ...(Array.isArray(data.user.app_metadata?.providers) ? data.user.app_metadata.providers : []),
      data.user.app_metadata?.provider,
      ...(Array.isArray(data.user.identities) ? data.user.identities.map((identity) => identity.provider) : []),
    ].filter(Boolean));
    setAuthProviders({ email: providers.has('email'), google: providers.has('google') });
    if (authUserIdRef.current !== data.user.id) {
      authUserIdRef.current = data.user.id;
      setGoogleReauthVerifiedUserId(null);
      setGoogleReauthMismatch(false);
    }

    const pendingRaw = await AsyncStorage.getItem(ACCOUNT_DELETE_REAUTH_KEY);
    if (!pendingRaw) return;
    await AsyncStorage.removeItem(ACCOUNT_DELETE_REAUTH_KEY).catch(() => {});
    try {
      const pending = JSON.parse(pendingRaw);
      if (!Number.isFinite(pending.expiresAt) || pending.expiresAt < Date.now()) return;
      if (pending.userId === data.user.id) {
        setGoogleReauthVerifiedUserId(data.user.id);
        setGoogleReauthMismatch(false);
      } else {
        setGoogleReauthVerifiedUserId(null);
        setGoogleReauthMismatch(true);
      }
    } catch {
      setGoogleReauthVerifiedUserId(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      refreshBlockedUsers()
        .catch(() => null)
        .then((requestId) => {
          if (requestId === blockedRequestRef.current) setLoading(false);
        });
      refreshAuthProviders().catch(() => {});
    }, [refreshAuthProviders, refreshBlockedUsers])
  );

  useEffect(() => {
    if (!SUPABASE_ENABLED || !supabase?.auth?.onAuthStateChange) return undefined;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUserId = session?.user?.id || null;
      if (authUserIdRef.current !== nextUserId) {
        authUserIdRef.current = nextUserId;
        authProviderRequestRef.current += 1;
        blockedRequestRef.current += 1;
        setBlocked([]);
        setAuthProviders({ email: false, google: false });
        setGoogleReauthVerifiedUserId(null);
        setGoogleReauthMismatch(false);
        setNewPassword('');
        setConfirmPassword('');
        setDeletePassword('');
        setDeleteConfirmation('');
        setLoading(Boolean(nextUserId));
        if (nextUserId) {
          Promise.resolve()
            .then(() => refreshBlockedUsers(nextUserId))
            .catch(() => null)
            .then((requestId) => {
              if (requestId === blockedRequestRef.current && authUserIdRef.current === nextUserId) setLoading(false);
            });
        } else setLoading(false);
      }
      // A same-user Google reauthentication still needs to consume the
      // account-bound one-time marker saved before OAuth navigation.
      if (nextUserId && event === 'SIGNED_IN') {
        authProviderRequestRef.current += 1;
        Promise.resolve().then(() => refreshAuthProviders().catch(() => {}));
      }
    });
    return () => data?.subscription?.unsubscribe?.();
  }, [refreshAuthProviders, refreshBlockedUsers]);

  async function handleUnblock(entry) {
    const name = entry.profile?.name || 'this person';
    Alert.alert(`Unblock ${name}?`, 'They will be able to message you again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock',
        onPress: async () => {
          try {
            await unblockUser(entry.userId);
            setBlocked((prev) => prev.filter((b) => b.userId !== entry.userId));
          } catch (err) {
            Alert.alert("Couldn't unblock", err.message || 'Please try again.');
          }
        },
      },
    ]);
  }

  async function handleChangePassword() {
    if (!SUPABASE_ENABLED) {
      Alert.alert('Account connection required', 'Connect a Supabase account before changing its password.');
      return;
    }
    const validationError = validatePasswordChange(newPassword, confirmPassword);
    if (validationError) {
      Alert.alert('Check your new password', validationError);
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Password updated', 'Your account password has been changed.');
    } catch (err) {
      Alert.alert("Couldn't change password", err.message || 'Please sign in again and retry.');
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleGoogleReauthForDeletion() {
    if (!SUPABASE_ENABLED || !supabase || !authProviders.google) return;
    setReauthenticatingGoogle(true);
    setGoogleReauthVerifiedUserId(null);
    setGoogleReauthMismatch(false);
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user?.id) throw new Error('Your session has expired. Sign in again first.');
      if (authUserIdRef.current !== data.user.id) authUserIdRef.current = data.user.id;
      await AsyncStorage.setItem(ACCOUNT_DELETE_REAUTH_KEY, JSON.stringify({
        userId: data.user.id,
        expiresAt: Date.now() + ACCOUNT_DELETE_REAUTH_TTL_MS,
      }));
      const result = await startGoogleOAuth(supabase, { prompt: 'select_account' });
      if (result?.cancelled) {
        await AsyncStorage.removeItem(ACCOUNT_DELETE_REAUTH_KEY).catch(() => {});
        return;
      }
      // Native OAuth returns to this process; web OAuth reloads the app and
      // refreshAuthProviders validates the stored user ID when this screen opens.
      if (Platform.OS !== 'web') await refreshAuthProviders();
    } catch (error) {
      await AsyncStorage.removeItem(ACCOUNT_DELETE_REAUTH_KEY).catch(() => {});
      Alert.alert("Couldn't verify with Google", error.message || 'Please try again.');
    } finally {
      setReauthenticatingGoogle(false);
    }
  }

  async function handleDeleteAccount() {
    if (!SUPABASE_ENABLED || !BACKEND_ENABLED) {
      Alert.alert('Live account required', 'Account deletion requires your connected account and backend. No account data has been deleted.');
      return;
    }
    const { data: currentAuthData, error: currentAuthError } = await supabase.auth.getUser();
    const currentUserId = currentAuthError ? null : currentAuthData?.user?.id;
    if (!currentUserId) {
      Alert.alert('Session expired', 'Sign in again before deleting your account.');
      return;
    }
    if (authUserIdRef.current !== currentUserId) {
      await refreshAuthProviders();
      Alert.alert('Account changed', 'Your active account changed. Review the current account details and retry account deletion.');
      return;
    }
    if (deleteConfirmation !== 'DELETE') {
      Alert.alert('Confirm account deletion', 'Type DELETE exactly to confirm this permanent action.');
      return;
    }
    if (authProviders.email && !authProviders.google && !deletePassword) {
      Alert.alert('Verify your password', 'Enter your current password to confirm account ownership.');
      return;
    }
    if (!authProviders.email && !authProviders.google) {
      Alert.alert('Re-authentication required', 'Sign in again with your account provider before deleting your account.');
      return;
    }
    if (authProviders.google && !deletePassword) {
      if (googleReauthVerifiedUserId !== currentUserId) {
        if (googleReauthMismatch) {
          Alert.alert('Google account mismatch', 'The Google account used for verification does not match the account you are deleting. Sign back into the original account.');
        } else {
          Alert.alert('Verify with Google first', 'Re-verify the same Google account, return here, and then confirm deletion within five minutes.');
        }
        return;
      }
    }
    Alert.alert(
      'Permanently delete your account?',
      'Your profile, direct chats, and your messages will be deleted. Group conversations remain for other members, but your account and membership will be removed. This cannot be undone.',
      [
        { text: 'Keep account', style: 'cancel' },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true);
            try {
              const deletionResult = await deleteAccount(deletePassword || undefined);
              const cleanupMessage = deletionResult?.localCleanupComplete
                ? 'Your ZannyChat account has been deleted. Its local drafts and pending queue records were cleared.'
                : 'Your ZannyChat account has been deleted, but this device could not confirm that all local account data and sign-out state were cleared. Clear ZannyChat app storage on this device to remove any remaining local data.';
              Alert.alert('Account deleted', cleanupMessage, [
                { text: 'Continue', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] }) },
              ]);
            } catch (error) {
              Alert.alert("Couldn't delete account", error.message || 'Please try again.');
            } finally {
              setDeletingAccount(false);
              setDeletePassword('');
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Privacy & security" onBack={() => navigation.goBack()} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}>
        <GlassCard glow intensity={24} style={{ marginBottom: spacing.md, borderRadius: 24, borderWidth: 1, borderColor: hexToRgba(colors.primary, 0.28) }} contentStyle={{ padding: spacing.lg, gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: hexToRgba(colors.primary, 0.16), borderWidth: 1, borderColor: hexToRgba(colors.primary, 0.3) }}>
              <Ionicons name="shield-checkmark-outline" size={25} color={colors.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '900', letterSpacing: 1.3 }]}>ZANNYCHAT · TRUST CENTER</Text>
              <Text style={[typography.heading, { color: colors.textPrimary, fontSize: 21 }]}>Your privacy, clearly explained.</Text>
            </View>
          </View>
          <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]}>Review the controls you can use today, understand the limits of message protection, and make informed choices about your account.</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {[
              { icon: 'checkmark-circle-outline', label: getPrivacyCheckupItems().length + ' checkpoints' },
              { icon: 'lock-closed-outline', label: 'Account controls' },
              { icon: 'information-circle-outline', label: 'Honest privacy limits' },
            ].map((item) => (
              <View key={item.label} style={{ minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.sm, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
                <Ionicons name={item.icon} size={15} color={colors.accent} />
                <Text style={[typography.small, { color: colors.textSecondary, fontWeight: '700' }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </GlassCard>
        <GlassCard style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.accent} />
            <Text style={[typography.heading, { color: colors.textPrimary, marginLeft: spacing.sm }]}>Privacy checkup</Text>
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.sm }]}>A quick review of important account controls and the limits of message privacy.</Text>
          {getPrivacyCheckupItems().map((item, index) => (
            <View key={item.id} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing.sm, borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: colors.border }}>
              <Ionicons name={item.icon} size={19} color={colors.textSecondary} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, minWidth: 0, marginLeft: spacing.sm }}>
                <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{item.title}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 19, marginTop: 2 }]}>{item.detail}</Text>
                {item.action && (
                  <TouchableOpacity
                    onPress={() => item.action === 'Sessions' ? navigation.navigate('Sessions') : item.action === 'Data export' ? navigation.navigate('DataExport') : null}
                    accessibilityRole="button"
                    accessibilityLabel={item.title}
                    style={{ alignSelf: 'flex-start', paddingVertical: 6 }}
                  >
                    <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>{item.action === 'Sessions' ? 'Manage sessions' : item.action === 'Data export' ? 'Export data' : 'Review'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </GlassCard>

        <GlassCard style={{ marginBottom: spacing.md }}>
          <Text style={[typography.heading, { color: colors.textPrimary, marginBottom: spacing.xs }]}>Blocked users</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>
            Blocked people can't message you, and their messages don't reach you. Block from a chat's ⋮ menu.
          </Text>

          {loading ? null : blocked.length === 0 ? (
            <Text style={[typography.caption, { color: colors.textSecondary, fontStyle: 'italic' }]}>
              You haven't blocked anyone.
            </Text>
          ) : (
            blocked.map((entry) => (
              <View key={entry.userId} style={[styles.blockRow, { marginBottom: spacing.sm }]}>
                <Avatar
                  name={entry.profile?.name || 'Unknown'}
                  color={entry.profile?.avatar_color || entry.profile?.avatarColor || colors.primary}
                  imageUrl={entry.profile?.avatar_url || entry.profile?.avatarUrl}
                  size={36}
                />
                <Text style={[typography.body, { color: colors.textPrimary, flex: 1, minWidth: 0, marginLeft: spacing.sm }]} numberOfLines={1}>
                  {entry.profile?.name || 'Unknown'}
                </Text>
                <TouchableOpacity
                  onPress={() => handleUnblock(entry)}
                  accessibilityLabel={`Unblock ${entry.profile?.name || 'this person'}`}
                  accessibilityRole="button"
                >
                  <Text style={[typography.caption, { color: colors.primary }]}>Unblock</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </GlassCard>

        <GlassCard style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
            <Ionicons name="key-outline" size={18} color={colors.accent} />
            <Text style={[typography.heading, { color: colors.textPrimary, marginLeft: spacing.sm }]}>Change password</Text>
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.md }]}>
            Choose a new password for this signed-in account. You may be asked to sign in again if your session has expired.
          </Text>
          <GlassInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="New password (8–128 characters)"
            accessibilityLabel="New password"
            textContentType="newPassword"
            autoComplete="new-password"
            secureTextEntry
            editable={!savingPassword && SUPABASE_ENABLED}
            returnKeyType="next"
          />
          <GlassInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            accessibilityLabel="Confirm new password"
            textContentType="newPassword"
            autoComplete="new-password"
            secureTextEntry
            editable={!savingPassword && SUPABASE_ENABLED}
            onSubmitEditing={handleChangePassword}
            returnKeyType="done"
          />
          {!SUPABASE_ENABLED && (
            <Text style={[typography.small, { color: colors.textSecondary, marginBottom: spacing.sm }]}>Available when a live Supabase account is connected.</Text>
          )}
          <TouchableOpacity
            onPress={handleChangePassword}
            disabled={savingPassword || !SUPABASE_ENABLED}
            accessibilityRole="button"
            accessibilityLabel="Update account password"
            accessibilityState={{ disabled: savingPassword || !SUPABASE_ENABLED, busy: savingPassword }}
            style={[styles.passwordButton, { backgroundColor: colors.primary, opacity: savingPassword || !SUPABASE_ENABLED ? 0.55 : 1 }]}
          >
            <Text style={[typography.bodyStrong, { color: colors.onPrimary }]}>{savingPassword ? 'Updating…' : 'Update password'}</Text>
          </TouchableOpacity>
        </GlassCard>

        <GlassCard style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
            <Ionicons name="document-text-outline" size={18} color={colors.accent} />
            <Text style={[typography.heading, { color: colors.textPrimary, marginLeft: spacing.sm }]}>Unsent drafts</Text>
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.md }]}>Drafts are saved in this app's on-device storage, scoped to your account and conversation. They do not sync to other devices and are not independently encrypted as a secret vault. Account deletion attempts to remove your local drafts too.</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Drafts')} accessibilityRole="button" accessibilityLabel="Review unsent drafts" style={[styles.passwordButton, { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }]}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Review unsent drafts</Text>
          </TouchableOpacity>
        </GlassCard>

        <GlassCard style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.accent} />
            <Text style={[typography.heading, { color: colors.textPrimary, marginLeft: spacing.sm }]}>How private is ZannyChat?</Text>
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 20 }]}>
            Today: messages are protected by database row-level access control, so only conversation participants can
            read them through the app. Chat attachments live in a private storage bucket; the app requests a signed link
            only after storage access rules confirm conversation membership. A signed link is still a bearer link: anyone
            who receives it may be able to open that attachment until the link expires (currently up to 24 hours), so do
            not share attachment links outside the conversation. Profile avatars use a separate public image bucket.{'\n\n'}
            Important limit: messages are not end-to-end encrypted. The service operator could technically access message
            text. AI summaries and link previews currently process text on the server, so end-to-end encryption requires
            a deliberate redesign of those features before it can be promised.
          </Text>
        </GlassCard>

        <GlassCard style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
            <Ionicons name="phone-portrait-outline" size={18} color={colors.accent} />
            <Text style={[typography.heading, { color: colors.textPrimary, marginLeft: spacing.sm }]}>Devices & sessions</Text>
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.md }]}>Sign out on this device or request session revocation across devices. ZannyChat does not pretend to show a device list it cannot verify.</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Sessions')} accessibilityRole="button" accessibilityLabel="Manage devices and sessions" style={[styles.passwordButton, { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }]}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Manage sessions</Text>
          </TouchableOpacity>
        </GlassCard>

        <GlassCard style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
            <Ionicons name="cloud-download-outline" size={18} color={colors.accent} />
            <Text style={[typography.heading, { color: colors.textPrimary, marginLeft: spacing.sm }]}>Your personal data</Text>
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.md }]}>Create a portable copy of your profile, conversation memberships and readable message history. Attachments are excluded, and the export stays on your device unless you choose to share it.</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('DataExport')}
            accessibilityRole="button"
            accessibilityLabel="Export my personal data"
            style={[styles.passwordButton, { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }]}
          >
            <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Export my data</Text>
          </TouchableOpacity>
        </GlassCard>

        <GlassCard>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
            <Ionicons name="flag-outline" size={18} color={colors.accent} />
            <Text style={[typography.heading, { color: colors.textPrimary, marginLeft: spacing.sm }]}>Reporting</Text>
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 20 }]}>
            You can report a person from their chat's ⋮ menu, or a single message by long-pressing it. Reports go to a
            review queue with the message attached when you report one.
          </Text>
        </GlassCard>

        <GlassCard style={{ marginTop: spacing.md, borderColor: colors.danger, borderWidth: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
            <Ionicons name="warning-outline" size={18} color={colors.danger} />
            <Text style={[typography.heading, { color: colors.danger, marginLeft: spacing.sm }]}>Delete account</Text>
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.md }]}>
            This permanently removes your account and profile, deletes direct conversations and your messages, and removes your group memberships. Other group members keep their conversations. This cannot be undone. You must verify ownership with your password or sign-in provider.
          </Text>
          {authProviders.email && (
            <GlassInput
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder="Current password"
              accessibilityLabel="Current password for account deletion"
              textContentType="password"
              autoComplete="current-password"
              secureTextEntry
              editable={!deletingAccount && SUPABASE_ENABLED && BACKEND_ENABLED}
            />
          )}
          {authProviders.google && (
            <View style={{ marginBottom: spacing.md }}>
              <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.sm }]}>
                Google accounts can verify ownership with Google instead of a local password. After Google returns to ZannyChat, reopen Privacy & security and confirm deletion within five minutes. We verify that the same account returned.
              </Text>
              {googleReauthVerifiedUserId != null && googleReauthVerifiedUserId === authUserIdRef.current && (
                <Text style={[typography.caption, { color: colors.success || colors.primary, marginBottom: spacing.sm }]}>Google verification confirmed for this account.</Text>
              )}
              {googleReauthMismatch && (
                <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>The Google account did not match the account being deleted.</Text>
              )}
              <TouchableOpacity
                onPress={handleGoogleReauthForDeletion}
                disabled={reauthenticatingGoogle || deletingAccount || !BACKEND_ENABLED}
                accessibilityRole="button"
                accessibilityLabel="Re-verify account ownership with Google"
                style={[styles.passwordButton, { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, opacity: reauthenticatingGoogle ? 0.6 : 1 }]}
              >
                <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{reauthenticatingGoogle ? 'Opening Google…' : 'Verify with Google'}</Text>
              </TouchableOpacity>
            </View>
          )}
          <GlassInput
            value={deleteConfirmation}
            onChangeText={setDeleteConfirmation}
            placeholder="Type DELETE to confirm"
            accessibilityLabel="Type DELETE to confirm account deletion"
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!deletingAccount && SUPABASE_ENABLED && BACKEND_ENABLED}
          />
          {(!SUPABASE_ENABLED || !BACKEND_ENABLED) && (
            <Text style={[typography.small, { color: colors.textSecondary, marginBottom: spacing.sm }]}>Requires a connected Supabase project and configured ZannyChat backend. Demo mode cannot delete a real account.</Text>
          )}
          <TouchableOpacity
            onPress={handleDeleteAccount}
            disabled={deletingAccount || !SUPABASE_ENABLED || !BACKEND_ENABLED}
            accessibilityRole="button"
            accessibilityLabel="Permanently delete ZannyChat account"
            accessibilityState={{ disabled: deletingAccount || !SUPABASE_ENABLED || !BACKEND_ENABLED, busy: deletingAccount }}
            style={[styles.passwordButton, { backgroundColor: colors.danger, opacity: deletingAccount || !SUPABASE_ENABLED || !BACKEND_ENABLED ? 0.55 : 1 }]}
          >
            <Text style={[typography.bodyStrong, { color: colors.onDanger }]}>{deletingAccount ? 'Deleting account…' : 'Delete my account permanently'}</Text>
          </TouchableOpacity>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  blockRow: { flexDirection: 'row', alignItems: 'center' },
  passwordButton: { alignItems: 'center', justifyContent: 'center', borderRadius: 999, paddingVertical: 13, paddingHorizontal: 18 },
});
