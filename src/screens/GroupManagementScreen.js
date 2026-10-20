import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, Share, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../theme/ThemeContext';
import { createGroupInvite, fetchGroupInvites, fetchGroupMembers, fetchGroupMetadata, getCurrentUser, removeGroupMember, revokeGroupInvite, setGroupMemberAdmin, updateGroupMetadata } from '../services/api';
import { filterGroupMembers } from '../utils/filterGroupMembers';

export default function GroupManagementScreen({ navigation, route }) {
  const conversation = route?.params?.conversation;
  const conversationId = conversation?.id;
  const { colors, spacing, typography, radii } = useTheme();
  const [members, setMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState('all');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [activeInvite, setActiveInvite] = useState(null);
  const [groupInvites, setGroupInvites] = useState([]);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [groupMetadata, setGroupMetadata] = useState({ name: '', topic: '', description: '', adminOnlyMessages: false });
  const [metadataBusy, setMetadataBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!conversationId) { setError('Open group management from a group conversation.'); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const [roster, user, metadata] = await Promise.all([fetchGroupMembers(conversationId), getCurrentUser(), fetchGroupMetadata(conversationId)]);
      setGroupMetadata({ name: metadata?.name || conversation?.participant?.name || '', topic: metadata?.topic || '', description: metadata?.description || '', adminOnlyMessages: Boolean(metadata?.adminOnlyMessages) });
      setMembers(Array.isArray(roster?.members) ? roster.members : []);
      setCurrentUserId(user?.id || null);
      if ((roster?.members || []).some((member) => member.id === user?.id && member.isAdmin)) {
        try { setGroupInvites(await fetchGroupInvites(conversationId)); } catch { setGroupInvites([]); }
      } else setGroupInvites([]);
    } catch (err) { setError(err?.message || 'Could not load group members.'); }
    finally { setLoading(false); }
  }, [conversationId]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const mine = members.find((member) => member.id === currentUserId);
  const isAdmin = Boolean(mine?.isAdmin);
  const visibleMembers = filterGroupMembers(members, memberSearch, memberRoleFilter);

  const changeAdmin = (member) => {
    const next = !member.isAdmin;
    Alert.alert(next ? 'Promote to admin?' : 'Remove admin role?', `${member.profile?.name || 'This member'} ${next ? 'will be able to manage group members' : 'will no longer be able to manage group members'}.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: next ? 'Promote' : 'Remove role', onPress: async () => {
        setBusyId(member.id);
        try { await setGroupMemberAdmin(conversationId, member.id, next); await refresh(); }
        catch (err) { Alert.alert('Could not update role', err?.message || 'Please try again.'); }
        finally { setBusyId(null); }
      } },
    ]);
  };

  const removeMember = (member) => {
    const self = member.id === currentUserId;
    Alert.alert(self ? 'Leave group?' : 'Remove member?', self ? 'You will leave this group on this account.' : `Remove ${member.profile?.name || 'this member'} from the group?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: self ? 'Leave group' : 'Remove', style: 'destructive', onPress: async () => {
        setBusyId(member.id);
        try {
          await removeGroupMember(conversationId, member.id);
          if (self) { navigation.popToTop(); }
          else await refresh();
        } catch (err) { Alert.alert(self ? 'Could not leave group' : 'Could not remove member', err?.message || 'Please try again.'); }
        finally { setBusyId(null); }
      } },
    ]);
  };

  const createInvite = async () => {
    try {
      setInviteBusy(true);
      const invite = await createGroupInvite(conversationId, { expiresInHours: 168, maxUses: 25 });
      setActiveInvite(invite);
      setGroupInvites(await fetchGroupInvites(conversationId));
      await Share.share({ message: `Join ${groupMetadata.name || conversation?.participant?.name || 'my ZannyChat group'} on ZannyChat. This invite expires ${new Date(invite.expiresAt).toLocaleString()} and can be used up to ${invite.maxUses} times.

Invite link: ${invite.inviteLink}

If the link does not open the app, copy this invite token into Profile → Join a group:
${invite.token}` });
    } catch (err) { Alert.alert('Could not create invite', err?.message || 'Please try again.'); }
    finally { setInviteBusy(false); }
  };
  const revokeInvite = (invite = activeInvite) => { if (!invite?.id) return; Alert.alert('Revoke invite?', 'Anyone who has not used this link will no longer be able to join with it.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Revoke', style: 'destructive', onPress: async () => {
      setInviteBusy(true);
      try { await revokeGroupInvite(conversationId, invite.id); if (activeInvite?.id === invite.id) setActiveInvite(null); setGroupInvites(await fetchGroupInvites(conversationId)); Alert.alert('Invite revoked', 'This invite can no longer be used.'); }
      catch (err) { Alert.alert('Could not revoke invite', err?.message || 'Please try again.'); }
      finally { setInviteBusy(false); }
    } },
  ]); };
  const actionStyle = { minHeight: 38, borderRadius: radii.md, paddingHorizontal: spacing.sm, justifyContent: 'center', borderWidth: 1, borderColor: colors.border };
  const saveMetadata = async () => {
    try { setMetadataBusy(true); const saved = await updateGroupMetadata(conversationId, groupMetadata); setGroupMetadata({ name: saved.name || '', topic: saved.topic || '', description: saved.description || '', adminOnlyMessages: typeof saved.adminOnlyMessages === 'boolean' ? saved.adminOnlyMessages : Boolean(groupMetadata.adminOnlyMessages) }); Alert.alert('Group details saved', 'The group name, topic, description, and announcement setting have been updated.'); }
    catch (err) { Alert.alert('Could not save group details', err?.message || 'Please try again.'); }
    finally { setMetadataBusy(false); }
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <Header title="Group members" subtitle={`${groupMetadata.name || conversation?.participant?.name || 'Group'} · ${members.length} members`} onBack={() => navigation.goBack()} />
    {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} /> : error ? <View style={{ padding: spacing.lg }}>
      <Text style={[typography.body, { color: colors.textSecondary }]}>{error}</Text>
      <TouchableOpacity onPress={refresh} accessibilityRole="button" style={{ paddingVertical: spacing.md }}><Text style={[typography.bodyStrong, { color: colors.primary }]}>Try again</Text></TouchableOpacity>
    </View> : <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      <GlassCard style={{ marginBottom: spacing.md }} contentStyle={{ padding: spacing.md, gap: spacing.xs }}>
        <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Manage members</Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{isAdmin ? 'You are a group admin. Changes are verified by the server.' : 'You can review members and leave the group. Only admins can change other members.'}</Text>
      </GlassCard>
      {isAdmin ? <GlassCard style={{ marginBottom: spacing.md }} contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
        <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Group details</Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>Manage the group name, topic, and description. Changes are saved on the server.</Text>
        <TextInput value={groupMetadata.name} onChangeText={(name) => setGroupMetadata((current) => ({ ...current, name }))} maxLength={80} placeholder="Group name (80 characters)" placeholderTextColor={colors.textSecondary} accessibilityLabel="Group name" style={[typography.body, { color: colors.textPrimary, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, padding: spacing.sm }]} />
        <TextInput value={groupMetadata.topic} onChangeText={(topic) => setGroupMetadata((current) => ({ ...current, topic }))} maxLength={80} placeholder="Group topic (80 characters)" placeholderTextColor={colors.textSecondary} accessibilityLabel="Group topic" style={[typography.body, { color: colors.textPrimary, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, padding: spacing.sm }]} />
        <TextInput value={groupMetadata.description} onChangeText={(description) => setGroupMetadata((current) => ({ ...current, description }))} maxLength={500} multiline placeholder="Group description (500 characters)" placeholderTextColor={colors.textSecondary} accessibilityLabel="Group description" style={[typography.body, { color: colors.textPrimary, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, padding: spacing.sm, minHeight: 84, textAlignVertical: 'top' }]} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm }}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Announcement mode</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>When enabled, only group admins can send messages. The server enforces this for all clients.</Text>
          </View>
          <Switch value={Boolean(groupMetadata.adminOnlyMessages)} onValueChange={(adminOnlyMessages) => setGroupMetadata((current) => ({ ...current, adminOnlyMessages }))} accessibilityLabel="Only admins can send group messages" trackColor={{ false: colors.border, true: colors.primary }} />
        </View>
        <TouchableOpacity disabled={metadataBusy || !groupMetadata.name.trim() || groupMetadata.name.trim().length > 80 || groupMetadata.topic.length > 80 || groupMetadata.description.length > 500} onPress={saveMetadata} accessibilityRole="button" style={[actionStyle, { alignSelf: 'flex-start', backgroundColor: colors.primary, borderColor: colors.primary, opacity: metadataBusy ? 0.6 : 1 }]}>
          {metadataBusy ? <ActivityIndicator color={colors.onPrimary || '#FFFFFF'} /> : <Text style={[typography.caption, { color: colors.onPrimary || '#FFFFFF' }]}>Save group details</Text>}
        </TouchableOpacity>
      </GlassCard> : <GlassCard style={{ marginBottom: spacing.md }} contentStyle={{ padding: spacing.md, gap: spacing.xs }}>
        <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{groupMetadata.name || conversation?.participant?.name || 'Group'}</Text><Text style={[typography.caption, { color: colors.textSecondary }]}>{groupMetadata.topic || 'Group topic not set'}</Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{groupMetadata.description || 'No group description has been added.'}</Text><Text style={[typography.caption, { color: colors.textSecondary }]}>{groupMetadata.adminOnlyMessages ? 'Announcement mode is on · only admins can send messages.' : 'All group members can send messages.'}</Text>
      </GlassCard>}
      {isAdmin ? <GlassCard style={{ marginBottom: spacing.md }} contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
        <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Invite people</Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>Create a one-time-visible invite link. It expires in 7 days and can be used by up to 25 new members. You can revoke active invites through the backend if a link is shared accidentally.</Text>
        <TouchableOpacity disabled={inviteBusy} onPress={createInvite} accessibilityRole="button" style={[actionStyle, { alignSelf: 'flex-start', backgroundColor: colors.primary, borderColor: colors.primary, opacity: inviteBusy ? 0.6 : 1 }]}>
          {inviteBusy ? <ActivityIndicator color={colors.onPrimary || '#FFFFFF'} /> : <Text style={[typography.caption, { color: colors.onPrimary || '#FFFFFF' }]}>Create and share invite</Text>}
        </TouchableOpacity>
        {activeInvite ? <Text style={[typography.caption, { color: colors.textSecondary }]}>Latest invite expires {new Date(activeInvite.expiresAt).toLocaleString()} · up to {activeInvite.maxUses} uses. Its raw token is shown only once when shared.</Text> : null}
        {groupInvites.length ? <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Invite history ({groupInvites.length})</Text>
          {groupInvites.map((invite) => <View key={invite.id} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, gap: spacing.xs }}>
            <Text style={[typography.caption, { color: colors.textPrimary }]}>{invite.status === 'used_up' ? 'Used up' : invite.status === 'expired' ? 'Expired' : invite.status === 'revoked' ? 'Revoked' : 'Active'} · {invite.useCount}/{invite.maxUses} uses</Text>
            <Text style={[typography.small, { color: colors.textSecondary }]}>Expires {new Date(invite.expiresAt).toLocaleString()}</Text>
            {invite.status === 'active' ? <TouchableOpacity disabled={inviteBusy} onPress={() => revokeInvite(invite)} accessibilityRole="button" style={[actionStyle, { alignSelf: 'flex-start', borderColor: colors.danger || colors.border }]}><Text style={[typography.caption, { color: colors.danger || colors.textPrimary }]}>Revoke invite</Text></TouchableOpacity> : null}
          </View>)}
        </View> : null}
      </GlassCard> : null}
      <GlassCard style={{ marginBottom: spacing.sm }} contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
        <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Members ({visibleMembers.length}{visibleMembers.length !== members.length ? ` of ${members.length}` : ''})</Text>
        <TextInput value={memberSearch} onChangeText={setMemberSearch} placeholder="Search members by name" placeholderTextColor={colors.textSecondary} accessibilityLabel="Search group members by name" returnKeyType="search" style={[typography.body, { color: colors.textPrimary, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, padding: spacing.sm }]} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {[['all', 'Everyone'], ['admins', 'Admins'], ['members', 'Members']].map(([value, label]) => <TouchableOpacity key={value} onPress={() => setMemberRoleFilter(value)} accessibilityRole="button" accessibilityState={{ selected: memberRoleFilter === value }} style={[actionStyle, { backgroundColor: memberRoleFilter === value ? colors.primary : 'transparent', borderColor: memberRoleFilter === value ? colors.primary : colors.border }]}><Text style={[typography.caption, { color: memberRoleFilter === value ? (colors.onPrimary || '#FFFFFF') : colors.textPrimary }]}>{label}</Text></TouchableOpacity>)}
        </View>
      </GlassCard>
      {visibleMembers.map((member) => {
        const isSelf = member.id === currentUserId;
        const busy = busyId === member.id;
        return <GlassCard key={member.id} style={{ marginBottom: spacing.sm }} contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Avatar name={member.profile?.name || 'Member'} imageUrl={member.profile?.avatarUrl} size={42} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{member.profile?.name || 'ZannyChat member'}{isSelf ? ' (you)' : ''}</Text>
              <Text style={[typography.caption, { color: member.isAdmin ? colors.primary : colors.textSecondary }]}>{member.isAdmin ? 'Group admin' : 'Member'}</Text>
            </View>
            {busy ? <ActivityIndicator color={colors.primary} /> : null}
          </View>
          {(isAdmin && !isSelf) || isSelf ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {isAdmin && !isSelf ? <>
              <TouchableOpacity disabled={Boolean(busyId)} onPress={() => changeAdmin(member)} accessibilityRole="button" accessibilityLabel={`${member.isAdmin ? 'Remove admin role from' : 'Promote'} ${member.profile?.name || 'member'}`} style={actionStyle}>
                <Text style={[typography.caption, { color: colors.primary }]}>{member.isAdmin ? 'Remove admin' : 'Make admin'}</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={Boolean(busyId)} onPress={() => removeMember(member)} accessibilityRole="button" style={[actionStyle, { borderColor: colors.danger || colors.border }]}>
                <Text style={[typography.caption, { color: colors.danger || colors.textPrimary }]}>Remove member</Text>
              </TouchableOpacity>
            </> : null}
            {isSelf ? <TouchableOpacity disabled={Boolean(busyId)} onPress={() => removeMember(member)} accessibilityRole="button" style={actionStyle}>
              <Text style={[typography.caption, { color: colors.textPrimary }]}>Leave group</Text>
            </TouchableOpacity> : null}
          </View> : null}
        </GlassCard>;
      })}
      {!visibleMembers.length ? <Text style={[typography.caption, { color: colors.textSecondary, paddingVertical: spacing.md }]}>{members.length ? 'No members match your search and filter.' : 'No group members were returned.'}</Text> : null}
      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm }]}>Member changes require a working backend session and migration 0019. If an action fails, your membership has not been changed by this screen.</Text>
    </ScrollView>}
  </SafeAreaView>;
}
