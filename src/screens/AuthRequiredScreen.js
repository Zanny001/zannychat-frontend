import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
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
  const { colors, radii } = useTheme();
  const copy = COPY[route?.name] || {
    title: 'Sign in to continue',
    body: 'Authenticate to continue to the ZannyChat link you opened.',
  };
  const returnRoute = { name: route?.name, params: route?.params || {} };
  const validLink = Boolean(normalizePendingAuthRoute(returnRoute));

  const continueTo = (screen) => {
    if (!setPendingAuthRoute(returnRoute)) return;
    navigation.navigate(screen);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <Text style={[styles.brand, { color: colors.primary }]}>ZANNYCHAT</Text>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{validLink ? copy.title : 'This link is incomplete'}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          {validLink ? copy.body : 'Ask the sender to share a fresh link, then open it again.'}
        </Text>
        {validLink ? (
          <>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => continueTo('Login')}
              style={[styles.primaryButton, { backgroundColor: colors.primary, borderRadius: radii?.lg || 18 }]}
            >
              <Text style={[styles.primaryText, { color: colors.onPrimary }]}>Sign in</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => continueTo('Signup')}
              style={[styles.secondaryButton, { borderColor: colors.border, borderRadius: radii?.lg || 18 }]}
            >
              <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>Create account</Text>
            </TouchableOpacity>
          </>
        ) : null}
        <Text style={[styles.footer, { color: colors.textSecondary }]}>Your link is only used to resume the requested action after authentication.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 36 },
  brand: { fontSize: 12, fontWeight: '900', letterSpacing: 2.4, marginBottom: 20 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800', marginBottom: 12 },
  body: { fontSize: 15, lineHeight: 23, marginBottom: 28 },
  primaryButton: { minHeight: 54, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, marginBottom: 12 },
  primaryText: { fontSize: 15, fontWeight: '800' },
  secondaryButton: { minHeight: 54, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, borderWidth: 1 },
  secondaryText: { fontSize: 15, fontWeight: '700' },
  footer: { fontSize: 12, lineHeight: 18, marginTop: 22 },
});
