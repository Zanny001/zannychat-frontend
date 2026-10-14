import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import GlassCard from '../components/GlassCard';
import { fetchBlockedUsers, unblockUser, changePassword, deleteAccount } from '../services/api';
import { SUPABASE_ENABLED } from '../services/supabaseClient';
import { BACKEND_ENABLED } from '../services/backendClient';
import GlassInput from '../components/GlassInput';
import { validatePasswordChange } from '../utils/authValidation';

// One of the three Profile rows the Oct 2026 audit found rendering but
// doing nothing ("the single most visible 'looks finished, isn't'
// moment"). Now a real screen: your block list (with unblock), plus an
// honest statement of what privacy the app does and doesn't provide
// today — the audit's encryption finding restated where a user can
// actually read it, instead of only in a markdown file.
export default function PrivacySecurityScreen({ navigation }) {
  const { colors, spacing, typography } = useTheme();
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchBlockedUsers()
        .then(setBlocked)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [])
  );

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

  async function handleDeleteAccount() {
    if (!SUPABASE_ENABLED) {
      Alert.alert('Live account required', 'Account deletion is unavailable in demo mode. No account data has been deleted.');
      return;
    }
    if (deleteConfirmation !== 'DELETE') {
      Alert.alert('Confirm account deletion', 'Type DELETE exactly to confirm this permanent action.');
      return;
    }
    if (!deletePassword) {
      Alert.alert('Verify your password', 'Enter your current password to confirm account ownership.');
      return;
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
              await deleteAccount(deletePassword);
              Alert.alert('Account deleted', 'Your ZannyChat account has been deleted.', [
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Privacy & security" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
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
                  color={entry.profile?.avatar_color || entry.profile?.avatarColor || '#6C5CE7'}
                  imageUrl={entry.profile?.avatar_url || entry.profile?.avatarUrl}
                  size={36}
                />
                <Text style={[typography.body, { color: colors.textPrimary, flex: 1, marginLeft: spacing.sm }]} numberOfLines={1}>
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
            <Text style={[typography.bodyStrong, { color: '#FFFFFF' }]}>{savingPassword ? 'Updating…' : 'Update password'}</Text>
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

        <GlassCard style={{ marginTop: spacing.md, borderColor: '#D64545', borderWidth: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
            <Ionicons name="warning-outline" size={18} color="#D64545" />
            <Text style={[typography.heading, { color: '#D64545', marginLeft: spacing.sm }]}>Delete account</Text>
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.md }]}>
            This permanently removes your account and profile, deletes direct conversations and your messages, and removes your group memberships. Other group members keep their conversations. This cannot be undone. You must verify your current password.
          </Text>
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
            style={[styles.passwordButton, { backgroundColor: '#B4232C', opacity: deletingAccount || !SUPABASE_ENABLED || !BACKEND_ENABLED ? 0.55 : 1 }]}
          >
            <Text style={[typography.bodyStrong, { color: '#FFFFFF' }]}>{deletingAccount ? 'Deleting account…' : 'Delete my account permanently'}</Text>
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
