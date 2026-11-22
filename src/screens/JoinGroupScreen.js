import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../theme/ThemeContext';
import { acceptGroupInvite } from '../services/api';

export default function JoinGroupScreen({ navigation, route }) {
  const { colors, spacing, typography, radii, layout } = useTheme();
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
  return <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
    <Header title="Join a group" subtitle="Use an invite from a group admin" onBack={() => navigation.goBack()} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, width: '100%', maxWidth: layout.formMaxWidth, alignSelf: 'center' }}>
      <GlassCard glow style={{ borderRadius: 26, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }} contentStyle={{ padding: spacing.md, gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <Ionicons name="people-circle-outline" size={32} color={colors.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '900', letterSpacing: 1.3 }]}>YOUR NEXT CIRCLE</Text>
            <Text style={[typography.heading, { color: colors.textPrimary, fontSize: 21 }]}>Good things happen together.</Text>
          </View>
        </View>
        <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]}>Join a community on ZannyChat with an invite from someone you trust. Your membership is confirmed securely before the group is added to your Chats.</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surface }}>
          <View style={{ width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }}>
            <Text style={{ color: colors.onPrimary, fontWeight: '900' }}>1</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '800' }]}>Paste your private invite</Text>
            <Text style={[typography.small, { color: colors.textSecondary }]}>Only the token is needed to continue.</Text>
          </View>
        </View>
        <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Group invite token</Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>If you received a ZannyChat invite link but it did not open automatically, copy the token from the message and paste it here. Invites can expire or be revoked.</Text>
        <TextInput value={token} onChangeText={(value) => { setToken(value); setError(''); }} autoCapitalize="none" autoCorrect={false} multiline placeholder="Paste invite token" placeholderTextColor={colors.textSecondary} accessibilityLabel="Group invite token" style={{ minHeight: 104, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.md, color: colors.textPrimary, textAlignVertical: 'top', minWidth: 0, width: '100%', backgroundColor: colors.surface }} />
        {error ? <Text accessibilityRole="alert" style={[typography.caption, { color: colors.danger }]}>{error}</Text> : null}
        <TouchableOpacity disabled={busy} onPress={submit} accessibilityRole="button" accessibilityLabel="Join group with invite token" accessibilityState={{ disabled: busy, busy }} style={{ minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: radii.lg, backgroundColor: colors.primary, opacity: busy ? 0.65 : 1 }}>
          {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={[typography.bodyStrong, { color: colors.onPrimary }]}>Join group</Text>}
        </TouchableOpacity>
      </GlassCard>
    </ScrollView>
  </SafeAreaView>;
}
