import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Image,
  Platform, Alert, ActivityIndicator, ScrollView, Switch, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import GlassInput from '../components/GlassInput';
import {
  getCurrentUser, updateProfile, uploadAvatar, getMyProfileDetails,
  updateMyProfileDetails, uploadProfileCover,
} from '../services/api';

const DEFAULT_DETAILS = {
  about: '', occupation: '', location: '', website: '', birthday: '', pronouns: '',
  cover_image_url: null, profile_visibility: 'everyone', show_location: false,
  show_occupation: false, show_website: true, show_birthday: false, show_pronouns: true,
  show_last_seen: false, show_online_status: true, show_read_receipts: true,
  photo_visibility: 'everyone', group_invite_permission: 'everyone',
  call_permission: 'everyone', status_audience: 'contacts',
};

export default function EditProfileScreen({ navigation }) {
  const { colors, spacing, typography, radii } = useTheme();
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarPreviewUri, setAvatarPreviewUri] = useState(null);
  const [coverPreviewUri, setCoverPreviewUri] = useState(null);
  const [mediaError, setMediaError] = useState('');
  const [details, setDetails] = useState(DEFAULT_DETAILS);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getCurrentUser(), getMyProfileDetails()]).then(([u, d]) => {
      if (!active) return;
      setUser(u);
      setName(u?.name || '');
      setUsername(u?.username || '');
      setStatus(u?.status || '');
      setAvatarUrl(u?.avatarUrl || u?.avatar_url || null);
      setDetails({ ...DEFAULT_DETAILS, ...(d || {}) });
    }).catch((err) => {
      if (active) Alert.alert('Profile unavailable', err?.message || 'Please try again.');
    });
    return () => { active = false; };
  }, []);

  const completionFields = [name, username, status, avatarUrl, details.about, details.occupation, details.location, details.website];
  const profileCompletion = Math.round((completionFields.filter((value) => String(value || '').trim()).length / completionFields.length) * 100);

  function setDetail(key, value) {
    setDetails((current) => ({ ...current, [key]: value }));
  }

  async function chooseImage(kind) {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: true,
        aspect: kind === 'cover' ? [16, 9] : [1, 1], quality: 0.82,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const setter = kind === 'cover' ? setUploadingCover : setUploadingPhoto;
      setMediaError('');
      if (kind === 'cover') setCoverPreviewUri(asset.uri);
      else setAvatarPreviewUri(asset.uri);
      setter(true);
      try {
        const uploadSource = asset.file || asset.uri;
        if (kind === 'cover') {
          const cover = await uploadProfileCover(uploadSource, asset.mimeType || 'image/jpeg');
          setDetail('cover_path', cover.path);
          setDetail('cover_image_url', cover.url);
          setCoverPreviewUri(null);
        } else {
          const url = await uploadAvatar(uploadSource, asset.mimeType || 'image/jpeg');
          setAvatarUrl(url);
          setAvatarPreviewUri(null);
        }
      } catch (err) {
        setMediaError(err?.message || 'The image could not be uploaded. Please try again.');
      } finally { setter(false); }
    } catch (err) {
      setMediaError(err?.message || 'The image picker could not be opened. Please try again.');
    }
  }

  async function handleSave() {
    if (!name.trim()) return Alert.alert('Name required', 'Enter a display name before saving.');
    if (username.trim() && !/^[a-zA-Z0-9_]{3,24}$/.test(username.trim())) {
      return Alert.alert('Invalid username', 'Use 3–24 letters, numbers or underscores.');
    }
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), status: status.trim(), username: username.trim().toLowerCase() });
      await updateMyProfileDetails({ ...details, birthday: details.birthday || null });
      navigation.goBack();
    } catch (err) {
      const message = String(err?.message || 'Please try again.');
      Alert.alert("Couldn't save profile", /duplicate|unique/i.test(message) ? 'That username is already taken. Choose another.' : message);
    } finally {
      setSaving(false);
    }
  }

  function Section({ title, children }) {
    return <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }]}>
      <Text style={[typography.bodyStrong, { color: colors.text, marginBottom: spacing.md }]}>{title}</Text>
      {children}
    </View>;
  }

  function Field({ label, value, onChangeText, placeholder, multiline = false, keyboardType }) {
    return <View style={{ marginBottom: spacing.md }}>
      <Text style={[typography.small, { color: colors.textSecondary, marginBottom: 6 }]}>{label.toUpperCase()}</Text>
      <GlassInput value={value == null ? '' : String(value)} onChangeText={onChangeText} placeholder={placeholder} multiline={multiline} keyboardType={keyboardType} />
    </View>;
  }

  function Toggle({ label, value, onValueChange, hint }) {
    return <View style={styles.toggleRow}>
      <View style={{ flex: 1, paddingRight: spacing.md }}>
        <Text style={[typography.body, { color: colors.text }]}>{label}</Text>
        {hint ? <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>{hint}</Text> : null}
      </View>
      <Switch value={Boolean(value)} onValueChange={onValueChange} trackColor={{ false: colors.border, true: colors.primary }} />
    </View>;
  }

  function Choice({ label, value, options, onChange }) {
    const current = Math.max(0, options.findIndex((item) => item.value === value));
    const next = options[(current + 1) % options.length];
    return <TouchableOpacity accessibilityRole="button" onPress={() => onChange(next.value)} style={styles.choiceRow}>
      <Text style={[typography.body, { color: colors.text, flex: 1 }]}>{label}</Text>
      <Text style={[typography.bodyStrong, { color: colors.primary }]}>{options[current].label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </TouchableOpacity>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Edit profile" onBack={() => navigation.goBack()} right={
        <TouchableOpacity onPress={handleSave} disabled={saving} accessibilityRole="button" accessibilityLabel="Save profile">
          {saving ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={[typography.bodyStrong, { color: colors.primary }]}>Save</Text>}
        </TouchableOpacity>
      } />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
          <Section title="Profile appearance">
            <TouchableOpacity onPress={() => chooseImage('cover')} disabled={uploadingCover} style={[styles.cover, { backgroundColor: colors.surfaceElevated, borderRadius: radii.md }]}>
              {(coverPreviewUri || details.cover_image_url) ? <Image source={{ uri: coverPreviewUri || details.cover_image_url }} resizeMode="cover" style={StyleSheet.absoluteFillObject} /> : <Ionicons name="image-outline" size={26} color={colors.textSecondary} />}
              {uploadingCover ? <ActivityIndicator color={colors.primary} /> : <Text style={[typography.caption, { color: colors.textSecondary }]}>Add or change cover image</Text>}
            </TouchableOpacity>
            <View style={{ alignItems: 'center', marginVertical: spacing.md }}>
              <TouchableOpacity onPress={() => chooseImage('avatar')} disabled={uploadingPhoto} style={styles.avatarWrap} accessibilityLabel="Change profile picture">
                <Avatar name={name || 'You'} color={user?.avatarColor || colors.primary} size={96} imageUrl={avatarPreviewUri || avatarUrl} />
                <View style={[styles.cameraBadge, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
                  {uploadingPhoto ? <ActivityIndicator size="small" color={colors.onPrimary} /> : <Ionicons name="camera" size={16} color={colors.onPrimary} />}
                </View>
              </TouchableOpacity>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm }]}>Profile photo</Text>
            </View>
            {mediaError ? <Text accessibilityRole="alert" style={[typography.caption, { color: '#D64545', marginBottom: spacing.sm }]}>{mediaError}</Text> : null}
            <Field label="Display name" value={name} onChangeText={setName} placeholder="Your name" />
            <Field label="Username" value={username} onChangeText={setUsername} placeholder="your_username" />
            <Field label="About / status" value={status} onChangeText={setStatus} placeholder="Hey there, I'm using ZannyChat" />
            <Field label="About details" value={details.about} onChangeText={(v) => setDetail('about', v)} placeholder="Tell people a little about yourself" multiline />
            <View style={{ marginTop: 4, marginBottom: spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Profile completeness</Text>
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>{profileCompletion}%</Text>
              </View>
              <View style={{ height: 6, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.border }}>
                <View style={{ height: 6, width: `${profileCompletion}%`, backgroundColor: colors.primary, borderRadius: 4 }} />
              </View>
            </View>
            <TouchableOpacity onPress={() => setPreviewVisible(true)} accessibilityRole="button" style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radii.md, backgroundColor: colors.surfaceElevated }}>
              <Ionicons name="eye-outline" size={18} color={colors.primary} />
              <Text style={[typography.bodyStrong, { color: colors.primary }]}>Preview your profile</Text>
            </TouchableOpacity>
          </Section>

          <Section title="Additional information">
            <Field label="Occupation" value={details.occupation} onChangeText={(v) => setDetail('occupation', v)} placeholder="What do you do?" />
            <Field label="Location" value={details.location} onChangeText={(v) => setDetail('location', v)} placeholder="City or region" />
            <Field label="Website" value={details.website} onChangeText={(v) => setDetail('website', v)} placeholder="https://example.com" keyboardType="url" />
            <Field label="Birthday" value={details.birthday} onChangeText={(v) => setDetail('birthday', v)} placeholder="YYYY-MM-DD" />
            <Field label="Pronouns" value={details.pronouns} onChangeText={(v) => setDetail('pronouns', v)} placeholder="Optional" />
            <Text style={[typography.caption, { color: colors.textSecondary }]}>These details are optional. Visibility is controlled separately below.</Text>
          </Section>

          <Section title="Profile privacy">
            <Choice label="Who can view your profile" value={details.profile_visibility} onChange={(v) => setDetail('profile_visibility', v)} options={[{ value: 'everyone', label: 'Everyone' }, { value: 'contacts', label: 'Contacts' }, { value: 'nobody', label: 'Nobody' }]} />
            <Choice label="Profile photo visibility" value={details.photo_visibility} onChange={(v) => setDetail('photo_visibility', v)} options={[{ value: 'everyone', label: 'Everyone' }, { value: 'contacts', label: 'Contacts' }, { value: 'nobody', label: 'Nobody' }]} />
            <Toggle label="Show location" value={details.show_location} onValueChange={(v) => setDetail('show_location', v)} />
            <Toggle label="Show occupation" value={details.show_occupation} onValueChange={(v) => setDetail('show_occupation', v)} />
            <Toggle label="Show website" value={details.show_website} onValueChange={(v) => setDetail('show_website', v)} />
            <Toggle label="Show birthday" value={details.show_birthday} onValueChange={(v) => setDetail('show_birthday', v)} />
            <Toggle label="Show pronouns" value={details.show_pronouns} onValueChange={(v) => setDetail('show_pronouns', v)} />
            <Toggle label="Show online status" value={details.show_online_status} onValueChange={(v) => setDetail('show_online_status', v)} />
            <Toggle label="Show last seen" value={details.show_last_seen} onValueChange={(v) => setDetail('show_last_seen', v)} />
            <Toggle label="Show read receipts" value={details.show_read_receipts} onValueChange={(v) => setDetail('show_read_receipts', v)} />
          </Section>

          <Section title="Contact and audience permissions">
            <Choice label="Group invitations" value={details.group_invite_permission} onChange={(v) => setDetail('group_invite_permission', v)} options={[{ value: 'everyone', label: 'Everyone' }, { value: 'contacts', label: 'Contacts' }, { value: 'nobody', label: 'Nobody' }]} />
            <Choice label="Calls" value={details.call_permission} onChange={(v) => setDetail('call_permission', v)} options={[{ value: 'everyone', label: 'Everyone' }, { value: 'contacts', label: 'Contacts' }, { value: 'nobody', label: 'Nobody' }]} />
            <Choice label="Status audience" value={details.status_audience} onChange={(v) => setDetail('status_audience', v)} options={[{ value: 'everyone', label: 'Everyone' }, { value: 'contacts', label: 'Contacts' }, { value: 'selected', label: 'Selected contacts' }, { value: 'nobody', label: 'Nobody' }]} />
          </Section>
          <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }]}>Your private profile settings are stored separately from your public profile. Profile-details visibility and call permissions are enforced by the new database layer. Legacy public avatar URLs, presence/read receipts, group invitations and status audiences still require their own enforcement rollout before every privacy preference can be certified end-to-end.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal visible={previewVisible} transparent animationType="fade" onRequestClose={() => setPreviewVisible(false)}>
        <View style={styles.previewBackdrop}>
          <View style={[styles.previewCard, { backgroundColor: colors.surface, borderRadius: radii.xl }]}>
            <TouchableOpacity onPress={() => setPreviewVisible(false)} style={{ alignSelf: 'flex-end', padding: 8 }} accessibilityRole="button" accessibilityLabel="Close profile preview">
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            {details.cover_image_url ? <Image source={{ uri: details.cover_image_url }} style={styles.previewCover} resizeMode="cover" /> : null}
            <View style={{ alignItems: 'center', padding: spacing.lg }}>
              <Avatar name={name || 'You'} imageUrl={avatarUrl} size={84} />
              <Text style={[typography.title, { color: colors.text, marginTop: spacing.md }]}>{name || 'Your name'}</Text>
              {username ? <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>@{username.replace(/^@/, '')}</Text> : null}
              <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md }]}>{details.about || status || 'Your about information will appear here.'}</Text>
              {[details.occupation && details.show_occupation ? details.occupation : null, details.location && details.show_location ? details.location : null, details.website && details.show_website ? details.website : null, details.pronouns && details.show_pronouns ? details.pronouns : null].filter(Boolean).map((item, index) => <Text key={`${index}-${item}`} style={[typography.caption, { color: colors.textSecondary, marginTop: 8 }]}>{item}</Text>)}
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.md }]}>Preview of fields selected for sharing</Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  section: { padding: 16, borderWidth: StyleSheet.hairlineWidth, marginBottom: 14 },
  avatarWrap: { width: 96, height: 96 },
  cameraBadge: { position: 'absolute', right: -2, bottom: -2, width: 30, height: 30, borderRadius: 15, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  cover: { minHeight: 88, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, overflow: 'hidden' },
  toggleRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  choiceRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.64)', justifyContent: 'center', padding: 24 },
  previewCard: { overflow: 'hidden', maxHeight: '85%' },
  previewCover: { width: '100%', height: 110 },
});
