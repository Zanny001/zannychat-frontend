import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Contacts from 'expo-contacts/legacy';
import { buildReviewableContacts, MAX_MATCH_PHONE_NUMBERS, normalizeSelectedPhoneInput, selectedPhoneNumbers } from '../utils/contactImport';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../theme/ThemeContext';
import { createConversation, getPhoneDiscoverySettings, matchPhoneContacts, setPhoneDiscoverability } from '../services/api';
import { BACKEND_ENABLED } from '../services/backendClient';
import { SUPABASE_ENABLED } from '../services/supabaseClient';

export default function ContactDiscoveryScreen({ navigation }) {
  const { colors, spacing, typography, radii } = useTheme();
  const [settings, setSettings] = useState(null);
  const [phones, setPhones] = useState('');
  const [importedContacts, setImportedContacts] = useState([]);
  const [importing, setImporting] = useState(false);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const screenActive = useRef(false);
  // A generation token prevents requests started on a previous screen focus
  // from repopulating sensitive contact data after the user returns.
  const screenEpoch = useRef(0);
  const liveReady = BACKEND_ENABLED && SUPABASE_ENABLED;

  const loadSettings = useCallback(async () => {
    const requestEpoch = screenEpoch.current;
    setLoading(true); setError('');
    try {
      const next = await getPhoneDiscoverySettings();
      if (screenActive.current && screenEpoch.current === requestEpoch) setSettings(next);
    } catch (err) {
      if (screenActive.current && screenEpoch.current === requestEpoch) setError(err?.message || 'Could not load discovery privacy settings.');
    } finally {
      if (screenActive.current && screenEpoch.current === requestEpoch) setLoading(false);
    }
  }, []);

  useEffect(() => { if (!liveReady) setLoading(false); }, [liveReady]);

  // Contact names and numbers are sensitive. Clear them when the user leaves
  // this screen, and ignore in-flight imports/matches that resolve after blur.
  useFocusEffect(useCallback(() => {
    screenEpoch.current += 1;
    screenActive.current = true;
    if (liveReady) loadSettings();
    return () => {
      screenActive.current = false;
      screenEpoch.current += 1;
      setPhones('');
      setImportedContacts([]);
      setMatches([]);
      setImporting(false);
      setMatching(false);
      setSaving(false);
      setLoading(false);
      setError('');
    };
  }, [liveReady, loadSettings]));

  async function toggleDiscoverability() {
    if (saving || !settings?.verifiedPhone) return;
    const requestEpoch = screenEpoch.current;
    setSaving(true); setError('');
    try {
      const next = await setPhoneDiscoverability(!settings.discoverable);
      if (!screenActive.current || screenEpoch.current !== requestEpoch) return;
      setSettings((old) => ({ ...old, ...next }));
      Alert.alert(next.discoverable ? 'Phone discovery enabled' : 'Phone discovery disabled', next.discoverable ? 'Other ZannyChat members can find your public profile when their selected contacts include your verified phone number.' : 'Your phone lookup entry has been removed.');
    } catch (err) { if (screenActive.current && screenEpoch.current === requestEpoch) setError(err?.message || 'Could not update privacy settings.'); }
    finally { if (screenActive.current && screenEpoch.current === requestEpoch) setSaving(false); }
  }

  async function importContacts() {
    if (importing || matching) return;
    const requestEpoch = screenEpoch.current;
    setImporting(true); setError('');
    try {
      const permission = await Contacts.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        if (screenActive.current && screenEpoch.current === requestEpoch) setError('Contacts permission was not granted. You can still enter selected international phone numbers manually.');
        return;
      }
      // Load only the fields needed for matching. The data stays in component memory
      // until the user selects specific numbers; nothing is persisted or uploaded here.
      const result = await Contacts.getContactsAsync({ fields: [Contacts.Fields.FirstName, Contacts.Fields.MiddleName, Contacts.Fields.LastName, Contacts.Fields.PhoneNumbers], pageSize: 1000, sort: Contacts.SortTypes.FirstName });
      const reviewable = buildReviewableContacts(result.data || []);
      if (!screenActive.current || screenEpoch.current !== requestEpoch) return;
      setImportedContacts(reviewable);
      if (!reviewable.length) setError('No contacts with international-format phone numbers were found. Numbers without a leading + and country code are skipped rather than guessed.');
    } catch (err) {
      if (screenActive.current && screenEpoch.current === requestEpoch) setError(err?.message || 'Could not read contacts. You can enter selected international phone numbers manually.');
    } finally { if (screenActive.current && screenEpoch.current === requestEpoch) setImporting(false); }
  }

  function toggleImportedContact(id) {
    setImportedContacts((current) => current.map((row) => row.id === id ? { ...row, selected: !row.selected } : row));
  }

  async function runMatch() {
    const selectedImported = selectedPhoneNumbers(importedContacts);
    const manual = normalizeSelectedPhoneInput(phones);
    const selected = [...new Set([...manual.valid, ...selectedImported])];
    if (!selected.length) { setError('Enter one or more valid international phone numbers, such as +2348012345678. Numbers without a leading + and country code are not guessed.'); return; }
    if (selected.length > MAX_MATCH_PHONE_NUMBERS) { setError(`For privacy and reliability, match up to ${MAX_MATCH_PHONE_NUMBERS} numbers per search.`); return; }
    const inputWarning = manual.invalid.length ? `${manual.invalid.length} manually entered number(s) were skipped. Use + and country code; no country is guessed. Valid selected numbers will still be checked.` : '';
    const requestEpoch = screenEpoch.current;
    setMatching(true); setError(inputWarning); setMatches([]);
    try {
      const result = await matchPhoneContacts(selected);
      if (!screenActive.current || screenEpoch.current !== requestEpoch) return;
      setMatches(result.matches || []);
      setPhones(''); // Discard raw input after response; never persist it locally.
      setImportedContacts([]); // Drop imported contact data from screen memory after matching.
    } catch (err) { if (screenActive.current && screenEpoch.current === requestEpoch) setError(err?.message || 'Contact matching failed. Please try again.'); }
    finally { if (screenActive.current && screenEpoch.current === requestEpoch) setMatching(false); }
  }

  async function startChat(profile) {
    try {
      const conversation = await createConversation(profile.id, profile);
      navigation.replace('Chat', { conversation });
    } catch (err) { Alert.alert('Could not start chat', err?.message || 'Please try again.'); }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Find friends" onBack={() => navigation.goBack()} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <GlassCard contentStyle={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}><Ionicons name="people-circle-outline" size={27} color={colors.primary} /></View>
            <View style={{ flex: 1 }}><Text style={[typography.heading, { color: colors.textPrimary }]}>Find your people</Text><Text style={[typography.caption, { color: colors.textSecondary }]}>Private, opt-in phone matching</Text></View>
          </View>
          <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]}>Choose specific phone numbers to match against registered ZannyChat members. Numbers are sent only when you tap Match, processed in memory on the secure backend, and never returned in results or saved to this device by this screen.</Text>
        </GlassCard>

        <GlassCard contentStyle={{ gap: spacing.sm }}>
          <Text style={[typography.heading, { color: colors.textPrimary }]}>Who can find you?</Text>
          {loading ? <ActivityIndicator color={colors.primary} /> : !liveReady ? <Text style={[typography.body, { color: colors.textSecondary }]}>Connect a live account and backend to manage phone discovery.</Text> : !settings?.verifiedPhone ? <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 21 }]}>Your account does not have a verified phone number yet. Verify it with Supabase Auth before enabling discoverability.</Text> : (
            <TouchableOpacity onPress={toggleDiscoverability} disabled={saving} accessibilityRole="switch" accessibilityLabel="Phone number discoverability" accessibilityHint={settings.discoverable ? 'Turn off to hide your account from phone matching' : 'Turn on to let people who have your number find you'} accessibilityState={{ checked: !!settings.discoverable, disabled: saving }} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, opacity: saving ? 0.6 : 1 }}>
              <Ionicons name={settings.discoverable ? 'shield-checkmark-outline' : 'shield-outline'} size={24} color={settings.discoverable ? colors.primary : colors.textSecondary} />
              <View style={{ flex: 1 }}><Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{settings.discoverable ? 'Discoverable by phone' : 'Hidden from phone discovery'}</Text><Text style={[typography.caption, { color: colors.textSecondary }]}>{settings.discoverable ? 'Tap to opt out and remove your lookup entry.' : 'Tap to let people who have your number find you.'}</Text></View>
              <Ionicons name={settings.discoverable ? 'toggle' : 'toggle-outline'} size={32} color={settings.discoverable ? colors.primary : colors.textSecondary} />
            </TouchableOpacity>
          )}
        </GlassCard>

        <GlassCard contentStyle={{ gap: spacing.sm }}>
          <Text style={[typography.heading, { color: colors.textPrimary }]}>Import selected contacts</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 20 }]}>Permission is requested only when you tap Import. ZannyChat reads names and phone numbers for on-device review; it does not upload your address book. Only numbers you select and submit are sent for matching. For now, numbers must already include + and a country code.</Text>
          <TouchableOpacity onPress={importContacts} disabled={!liveReady || importing || matching} accessibilityRole="button" accessibilityLabel="Import contacts for private review" accessibilityState={{ disabled: !liveReady || importing || matching, busy: importing }} style={{ minHeight: 48, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm, opacity: !liveReady || importing || matching ? 0.55 : 1 }}>
            {importing ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="people-outline" size={19} color={colors.primary} />}
            <Text style={[typography.bodyStrong, { color: colors.primary }]}>{importing ? 'Reading contacts…' : 'Import contacts for review'}</Text>
          </TouchableOpacity>
          {importedContacts.length > 0 && <View style={{ gap: spacing.xs }}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Choose numbers to check · {importedContacts.filter((row) => row.selected).length} selected</Text>
            {importedContacts.slice(0, 100).map((row) => <TouchableOpacity key={row.id} onPress={() => toggleImportedContact(row.id)} accessibilityRole="checkbox" accessibilityLabel={`Select ${row.name}, ${row.phone}`} accessibilityState={{ checked: row.selected }} style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Ionicons name={row.selected ? 'checkbox' : 'square-outline'} size={23} color={row.selected ? colors.primary : colors.textSecondary} />
              <View style={{ flex: 1 }}><Text style={[typography.body, { color: colors.textPrimary }]}>{row.name}</Text><Text style={[typography.caption, { color: colors.textSecondary }]}>{row.phone}</Text></View>
            </TouchableOpacity>)}
            {importedContacts.length > 100 && <Text style={[typography.caption, { color: colors.textSecondary }]}>Showing the first 100 eligible numbers. You can still enter additional numbers manually, up to the 100-number request limit.</Text>}
            <TouchableOpacity onPress={() => setImportedContacts([])} accessibilityRole="button" accessibilityLabel="Clear imported contacts" style={{ minHeight: 44, justifyContent: 'center' }}><Text style={[typography.bodyStrong, { color: colors.textSecondary }]}>Clear imported contacts</Text></TouchableOpacity>
          </View>}
        </GlassCard>

        <GlassCard contentStyle={{ gap: spacing.sm }}>
          <Text style={[typography.heading, { color: colors.textPrimary }]}>Or enter selected numbers</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 20 }]}>Enter only the contacts you want to check, one per line or separated by commas. Use international E.164 format (for example, +2348012345678). Maximum 100 per search.</Text>
          <TextInput value={phones} onChangeText={setPhones} editable={!matching} multiline autoCapitalize="none" autoCorrect={false} keyboardType="phone-pad" placeholder={'+2348012345678\n+14155552671'} placeholderTextColor={colors.textSecondary} accessibilityLabel="Selected contact phone numbers in international format" style={[typography.body, { minHeight: 110, textAlignVertical: 'top', color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md }]} />
          <TouchableOpacity onPress={runMatch} disabled={!liveReady || matching} accessibilityRole="button" accessibilityLabel="Match selected phone numbers" accessibilityState={{ disabled: !liveReady || matching, busy: matching }} style={{ minHeight: 48, borderRadius: radii.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm, opacity: !liveReady || matching ? 0.55 : 1 }}>
            {matching ? <ActivityIndicator color={colors.onPrimary} /> : <Ionicons name="search-outline" size={19} color={colors.onPrimary} />}
            <Text style={[typography.bodyStrong, { color: colors.onPrimary }]}>{matching ? 'Matching securely…' : `Match selected numbers (${Math.min(MAX_MATCH_PHONE_NUMBERS, new Set([...normalizeSelectedPhoneInput(phones).valid, ...selectedPhoneNumbers(importedContacts)]).size)})`}</Text>
          </TouchableOpacity>
        </GlassCard>

        {!!error && <GlassCard contentStyle={{ gap: spacing.sm }}><Text accessibilityRole="alert" style={[typography.body, { color: colors.textPrimary }]}>{error}</Text><TouchableOpacity onPress={loadSettings} accessibilityRole="button" accessibilityLabel="Refresh phone discovery settings" style={{ minHeight: 44, justifyContent: 'center' }}><Text style={[typography.bodyStrong, { color: colors.primary }]}>Refresh settings</Text></TouchableOpacity></GlassCard>}
        {matches.length > 0 && <View style={{ gap: spacing.sm }}><Text style={[typography.heading, { color: colors.textPrimary }]}>On ZannyChat · {matches.length}</Text>{matches.map((profile) => <GlassCard key={profile.id} contentStyle={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}><View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: profile.avatarColor || colors.surface, alignItems: 'center', justifyContent: 'center' }}><Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{(profile.name || 'Z').slice(0, 1).toUpperCase()}</Text></View><View style={{ flex: 1 }}><Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{profile.name}</Text>{profile.status ? <Text numberOfLines={1} style={[typography.caption, { color: colors.textSecondary }]}>{profile.status}</Text> : null}</View><TouchableOpacity onPress={() => startChat(profile)} accessibilityRole="button" accessibilityLabel={`Chat with ${profile.name}`} style={{ minWidth: 76, minHeight: 44, paddingHorizontal: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={[typography.small, { color: colors.onPrimary }]}>Message</Text></TouchableOpacity></GlassCard>)}</View>}
        {!matching && matches.length === 0 && <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.sm }]}>No matches shown yet. Matching is private and never reveals which phone numbers were checked.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}
