import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../theme/ThemeContext';
import { acceptGroupInvite } from '../services/api';

export default function JoinGroupScreen({ navigation, route }) {
  const { colors, spacing, typography, radii } = useTheme();
  const [token, setToken] = useState(route?.params?.token || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (typeof route?.params?.token === 'string' && route.params.token) setToken(route.params.token); }, [route?.params?.token]);
  const submit = async () => {
    const value = token.trim();
    if (value.length < 30) { setError('Paste the invite token shared by a group admin.'); return; }
    setBusy(true); setError('');
    try {
      await acceptGroupInvite(value);
      Alert.alert('Group joined', 'You are now a member. Open Chats to find the group.', [{ text: 'Open chats', onPress: () => navigation.navigate('Main', { screen: 'Chats' }) }]);
    } catch (err) { setError(err?.message || 'This invite could not be accepted.'); }
    finally { setBusy(false); }
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <Header title="Join a group" subtitle="Use an invite from a group admin" onBack={() => navigation.goBack()} />
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
      <GlassCard contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
        <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Group invite token</Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>If you received a ZannyChat invite link but it did not open automatically, copy the token from the message and paste it here. Invites can expire or be revoked.</Text>
        <TextInput value={token} onChangeText={(value) => { setToken(value); setError(''); }} autoCapitalize="none" autoCorrect={false} multiline placeholder="Paste invite token" placeholderTextColor={colors.textSecondary} accessibilityLabel="Group invite token" style={{ minHeight: 92, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, color: colors.textPrimary, textAlignVertical: 'top' }} />
        {error ? <Text style={[typography.caption, { color: colors.danger || '#E05B5B' }]}>{error}</Text> : null}
        <TouchableOpacity disabled={busy} onPress={submit} accessibilityRole="button" style={{ minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.primary, opacity: busy ? 0.65 : 1 }}>
          {busy ? <ActivityIndicator color={colors.onPrimary || '#FFFFFF'} /> : <Text style={[typography.bodyStrong, { color: colors.onPrimary || '#FFFFFF' }]}>Join group</Text>}
        </TouchableOpacity>
      </GlassCard>
    </ScrollView>
  </SafeAreaView>;
}
