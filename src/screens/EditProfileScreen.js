import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import GlassInput from '../components/GlassInput';
import { getCurrentUser, updateProfile, uploadAvatar } from '../services/api';

export default function EditProfileScreen({ navigation }) {
  const { colors, spacing, typography, radii } = useTheme();
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCurrentUser().then((u) => {
      setUser(u);
      setName(u?.name || '');
      setStatus(u?.status || '');
      setAvatarUrl(u?.avatarUrl || u?.avatar_url || null);
    });
  }, []);

  async function handleChangePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo library access in Settings to change your avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset) return;

    setUploadingPhoto(true);
    try {
      const newUrl = await uploadAvatar(asset.uri, asset.mimeType || 'image/jpeg');
      setAvatarUrl(newUrl);
    } catch (err) {
      Alert.alert("Couldn't update photo", err.message || 'Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), status: status.trim() });
      navigation.goBack();
    } catch (err) {
      Alert.alert("Couldn't save", err.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header
        title="Edit profile"
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[typography.bodyStrong, { color: colors.primary }]}>Save</Text>
            )}
          </TouchableOpacity>
        }
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ padding: spacing.lg }}>
          <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
            <TouchableOpacity onPress={handleChangePhoto} disabled={uploadingPhoto} style={styles.avatarWrap}>
              <Avatar name={name || 'You'} color={user?.avatarColor || colors.primary} size={96} imageUrl={avatarUrl} />
              <View style={[styles.cameraBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="camera" size={16} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm }]}>
              Tap to change photo
            </Text>
          </View>

          <Text style={[typography.small, { color: colors.textSecondary, marginBottom: 6 }]}>NAME</Text>
          <GlassInput value={name} onChangeText={setName} placeholder="Your name" style={{ marginBottom: spacing.md }} />

          <Text style={[typography.small, { color: colors.textSecondary, marginBottom: 6 }]}>STATUS</Text>
          <GlassInput value={status} onChangeText={setStatus} placeholder="Hey there, I'm using ZannyChat" />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  avatarWrap: { width: 96, height: 96 },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
