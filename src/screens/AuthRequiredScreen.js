import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import GlassCard from '../components/GlassCard';
import { normalizePendingAuthRoute, setPendingAuthRoute } from '../navigation/pendingAuthRoute';

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
  const iconName = ({ QRContact: 'qr-code-outline', JoinGroup: 'people-outline', LiveStream: 'radio-outline', LiveReplay: 'play-circle-outline' })[route?.name] || 'lock-closed-outline';
  const eyebrow = validLink ? 'YOUR LINK, READY WHEN YOU ARE' : 'LINK CHECK';

  const continueTo = (screen) => {
    if (!setPendingAuthRoute(returnRoute)) return;
    navigation.navigate(screen);
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { paddingHorizontal: spacing.lg, paddingVertical: spacing.xl || spacing.lg, maxWidth: layout.formMaxWidth } ]}>
        <View style={styles.hero}>
          <View style={[styles.iconTile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name={iconName} size={30} color={colors.accent || colors.primary} />
          </View>
          <Text style={[typography.caption, styles.brand, { color: colors.accent || colors.primary }]}>{eyebrow}</Text>
          <Text style={[typography.title, styles.title, { color: colors.textPrimary }]}>{validLink ? copy.title : 'This link needs a refresh.'}</Text>
          <Text style={[typography.body, styles.body, { color: colors.textSecondary }]}>
            {validLink ? copy.body : 'Ask the sender to share a fresh link, then open it again.'}
          </Text>
        </View>
        <GlassCard intensity={22} style={{ padding: spacing.md, marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Ionicons name={validLink ? 'shield-checkmark-outline' : 'information-circle-outline'} size={20} color={validLink ? colors.success || colors.accent : colors.textSecondary} />
            <View style={{ flex: 1, minWidth: 0, marginLeft: spacing.sm }}>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{validLink ? 'Your destination is protected' : 'Nothing has been opened yet'}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 20, marginTop: 4 }]}>
                {validLink ? 'Sign in or create an account. We’ll return you to this exact link after authentication.' : 'For your safety, an incomplete link cannot be resumed. Request a fresh invitation or share link.'}
              </Text>
            </View>
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
  hero: { marginBottom: 4 },
  iconTile: { width: 68, height: 68, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  brand: { letterSpacing: 1.6, marginBottom: 12 },
  title: { marginBottom: 12 },
  body: { marginBottom: 24 },
  primaryButton: { minHeight: 54, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, marginBottom: 12 },
  primaryText: { fontSize: 15, fontWeight: '800' },
  secondaryButton: { minHeight: 54, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, borderWidth: 1 },
  secondaryText: { fontSize: 15, fontWeight: '700' },
  footer: { marginTop: 22 },
});
