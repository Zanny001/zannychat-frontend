import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { supabase } from '../services/supabaseClient';
import { backendFetch } from '../services/backendClient';

export default function CallInvitePicker({
  visible,
  onClose,
  onInvite,
  conversationId,
  roomId,
  filterToConversationMembers = false,
  excludeIds = [],
  title = 'Add people to call',
}) {
  const { colors, typography } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [invitingId, setInvitingId] = useState(null);
  const [errorText, setErrorText] = useState('');
  const [successText, setSuccessText] = useState('');

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setResults([]);
    setErrorText('');
    setSuccessText('');
    setInvitingId(null);
  }, [visible]);

  const searchPeople = useCallback(async () => {
    const term = query.trim().replace(/^@/, '');
    if (term.length < 2) {
      setErrorText('Enter at least two characters to search.');
      setResults([]);
      return;
    }
    setSearching(true);
    setErrorText('');
    setSuccessText('');
    try {
      const { data, error } = await supabase.rpc('search_public_profiles', {
        p_query: term,
        p_limit: 25,
      });
      if (error) throw error;

      let people = Array.isArray(data) ? data : [];
      if (filterToConversationMembers) {
        if (!conversationId) throw new Error('The group conversation could not be verified.');
        const { data: members, error: membersError } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conversationId);
        if (membersError) throw membersError;
        const memberIds = new Set((members || []).map((member) => String(member.user_id)));
        people = people.filter((person) => memberIds.has(String(person.id)));
      }

      let activeParticipantIds = [];
      if (roomId) {
        const roster = await backendFetch(`/group-calls/${roomId}/participants`);
        activeParticipantIds = Array.isArray(roster?.participantIds) ? roster.participantIds : [];
      }
      const excluded = new Set([...(excludeIds || []), ...activeParticipantIds].filter(Boolean).map(String));
      people = people.filter((person) => person?.id && !excluded.has(String(person.id)));
      setResults(people);
      if (!people.length) setSuccessText('No eligible people found. Try another name or username.');
    } catch (error) {
      setErrorText(error?.message || 'Could not search for people right now.');
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [conversationId, excludeIds, filterToConversationMembers, query]);

  const invitePerson = async (person) => {
    if (!onInvite || invitingId) return;
    setInvitingId(person.id);
    setErrorText('');
    setSuccessText('');
    try {
      await onInvite(person);
      setResults((current) => current.filter((item) => item.id !== person.id));
      setSuccessText(`Invitation sent to ${person.name || person.username || 'this person'}.`);
    } catch (error) {
      setErrorText(error?.message || 'Could not invite this person.');
    } finally {
      setInvitingId(null);
    }
  };

  return (
    <Modal visible={Boolean(visible)} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.header}>
            <View style={styles.headingCopy}>
              <Text style={[typography.title, { color: colors.textPrimary }]}>{title}</Text>
              <Text style={[typography.small, { color: colors.textSecondary }]}>Search by name or username</Text>
            </View>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close add people" style={styles.closeButton}>
              <Ionicons name="close" size={23} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <TextInput
              value={query}
              onChangeText={(value) => { setQuery(value); setResults([]); setErrorText(''); setSuccessText(''); }}
              onSubmitEditing={searchPeople}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Name or @username"
              placeholderTextColor={colors.textSecondary}
              selectionColor={colors.primary}
              style={[styles.searchInput, { color: colors.textPrimary }]}
              accessibilityLabel="Search people by name or username"
            />
            <TouchableOpacity
              onPress={searchPeople}
              disabled={searching}
              accessibilityRole="button"
              accessibilityLabel="Search people"
              style={[styles.searchButton, { backgroundColor: colors.primary, opacity: searching ? 0.7 : 1 }]}
            >
              {searching
                ? <ActivityIndicator color={colors.onPrimary} size="small" />
                : <Ionicons name="search" size={19} color={colors.onPrimary} />}
            </TouchableOpacity>
          </View>

          {errorText ? <Text style={[typography.small, styles.message, { color: colors.danger }]}>{errorText}</Text> : null}
          {successText ? <Text style={[typography.small, styles.message, { color: colors.textSecondary }]}>{successText}</Text> : null}

          <FlatList
            data={results}
            keyExtractor={(person) => String(person.id)}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.results}
            renderItem={({ item }) => {
              const displayName = item.name || item.username || 'ZannyChat member';
              const initial = String(displayName).trim().slice(0, 1).toUpperCase() || '?';
              const busy = invitingId === item.id;
              return (
                <View style={[styles.personRow, { borderBottomColor: colors.border }]}>
                  <View style={[styles.avatar, { backgroundColor: item.avatar_color || colors.primary }]}>
                    <Text style={styles.avatarText}>{initial}</Text>
                  </View>
                  <View style={styles.personCopy}>
                    <Text numberOfLines={1} style={[styles.personName, { color: colors.textPrimary }]}>{displayName}</Text>
                    <Text numberOfLines={1} style={[typography.small, { color: colors.textSecondary }]}>@{item.username || 'member'}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => invitePerson(item)}
                    disabled={Boolean(invitingId)}
                    accessibilityRole="button"
                    accessibilityLabel={`Invite ${displayName}`}
                    style={[styles.inviteButton, { backgroundColor: colors.primary, opacity: invitingId && !busy ? 0.55 : 1 }]}
                  >
                    {busy
                      ? <ActivityIndicator color={colors.onPrimary} size="small" />
                      : <Text style={[typography.small, styles.inviteLabel, { color: colors.onPrimary }]}>Invite</Text>}
                  </TouchableOpacity>
                </View>
              );
            }}
            ListEmptyComponent={!searching && query.trim().length >= 2 && !errorText && !successText
              ? <Text style={[typography.small, styles.empty, { color: colors.textSecondary }]}>No matching people.</Text>
              : null}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  sheet: {
    width: '100%',
    maxHeight: '82%',
    minHeight: 360,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 26,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headingCopy: { flex: 1, gap: 4 },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingLeft: 13,
    paddingRight: 5,
    minHeight: 50,
  },
  searchInput: { flex: 1, minWidth: 0, fontSize: 15, paddingVertical: 10 },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: { marginTop: 10, marginBottom: 4 },
  results: { paddingTop: 8, paddingBottom: 12 },
  personRow: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  personCopy: { flex: 1, minWidth: 0, gap: 3 },
  personName: { fontSize: 14, fontWeight: '700' },
  inviteButton: {
    minWidth: 68,
    minHeight: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  inviteLabel: { fontWeight: '800' },
  empty: { textAlign: 'center', paddingVertical: 24 },
});
