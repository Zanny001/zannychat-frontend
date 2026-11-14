import React from 'react';
import { SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function GroupCallScreen({ navigation }) {
  const { colors, typography } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
      <View style={{ width: 78, height: 78, borderRadius: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
        <Text style={[typography.display, { color: colors.onPrimary }]}>☎</Text>
      </View>
      <Text style={[typography.title, { color: colors.textPrimary, textAlign: 'center' }]}>Group calling needs the native app</Text>
      <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 10 }]}>Install a native ZannyChat build to use the LiveKit media engine. The web client does not start group media calls.</Text>
      <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back" style={{ minHeight: 44, minWidth: 112, marginTop: 24, backgroundColor: colors.primary, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14, alignItems: "center", justifyContent: "center" }}><Text style={[typography.small, { color: colors.onPrimary }]}>Go back</Text></TouchableOpacity>
    </SafeAreaView>
  );
}
