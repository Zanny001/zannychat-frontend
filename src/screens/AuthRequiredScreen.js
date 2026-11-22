import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { normalizePendingAuthRoute, setPendingAuthRoute } from '../navigation/pendingAuthRoute';
import GlassCard from '../components/GlassCard';

const COPY = {
  QRContact: {
    title: 'Connect with this contact',
    body: 'Sign in or create an account to open this contact and start a conversation.',
  },
  JoinGroup: {
    title: 'Join this group',
    body: 'Sign in or create an account to accept this invitation. Your invite will be kept while you authenticate.',
  },
  LiveStream: {
    title: 'Join this LIVE',
    body: 'Sign in or create an account to watch the stream and participate in the conversation.',
  },
  LiveReplay: {
    title: 'Watch this replay',
    body: 'Sign in or create an account to access this private LIVE replay.',
  },
};

export default function AuthRequiredScreen({ navigation, route }) {
  const { colors, typography, spacing, radii, layout } = useTheme();
  const copy = COPY[route?.name] || {
    title: 'Sign in to continue',
    body: 'Authenticate to continue to the ZannyChat link you opened.',
  };
  const returnRoute = { name: route?.name, params: route?.params || {} };
  const validLink = Boolean(normalizePendingAuthRoute(returnRoute));
  const linkIcon = ({ QRContact: 'qr-code-outline', JoinGroup: 'people-outline', LiveStream: 'radio-outline', LiveReplay: 'play-circle-outline' })[route?.name] || 'link-outline';

  const continueTo = (screen) => {
    if (!setPendingAuthRoute(returnRoute)) return;
    navigation.navigate(screen);
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { paddingHorizontal: spacing.lg, paddingVertical: spacing.xl || spacing.lg, maxWidth: layout.formMaxWidth } ]}>
        <GlassCard glow intensity={22} contentStyle={{ padding: spacing.lg, gap: spacing.md }}>
          <View style={{ width: 58, height: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <Ionicons name={validLink ? linkIcon : 'link-outline'} size={27} color={colors.primary} />
          </View>
          <Text style={[typography.caption, styles.brand, { color: colors.primary }]}>ZANNYCHAT · SECURE LINK</Text>
          <Text style={[typography.title, styles.title, { color: colors.textPrimary }]}>{validLink ? copy.title : 'This link is incomplete'}</Text>
          <Text style={[typography.body, styles.body, { color: colors.textSecondary }]}>{validLink ? copy.body : 'Ask the sender to share a fresh link, then open it again.'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
            <Ionicons name="shield-checkmark-outline" size={19} color={colors.accent} />
            <Text style={[typography.caption, { color: colors.textSecondary, flex: 1, minWidth: 0, lineHeight: 19 }]}>Your link is only used to resume the requested action after authentication.</Text>
          </View>
        </GlassCard>
        {validLink ? (
          <>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Sign in to continue to this link"
              onPress={() => continueTo('Login')}
              style={[styles.primaryButton, { backgroundColor: colors.primary, borderRadius: radii?.lg || 18 }]}
            >
              <Text style={[typography.body, styles.primaryText, { color: colors.onPrimary }]}>Sign in</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Create an account to continue to this link"
              onPress={() => continueTo('Signup')}
              style={[styles.secondaryButton, { borderColor: colors.border, borderRadius: radii?.lg || 18 }]}
            >
              <Text style={[typography.body, styles.secondaryText, { color: colors.textPrimary }]}>Create account</Text>
            </TouchableOpacity>
          </>
        ) : null}
        <Text style={[typography.caption, styles.footer, { color: colors.textSecondary }]}>Your link is only used to resume the requested action after authentication.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', justifyContent: 'center' },
  brand: { letterSpacing: 2.4, marginBottom: 20 },
  title: { marginBottom: 12 },
  body: { marginBottom: 28 },
  primaryButton: { minHeight: 54, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, marginBottom: 12 },
  primaryText: { fontSize: 15, fontWeight: '800' },
  secondaryButton: { minHeight: 54, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, borderWidth: 1 },
  secondaryText: { fontSize: 15, fontWeight: '700' },
  footer: { marginTop: 22 },
});
