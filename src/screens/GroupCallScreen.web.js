import React from 'react';
import { SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function GroupCallScreen({ navigation }) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
      <View style={{ width: 78, height: 78, borderRadius: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
        <Text style={{ color: colors.onPrimary, fontSize: 30 }}>☎</Text>
      </View>
      <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '800', textAlign: 'center' }}>Group calling needs the native app</Text>
      <Text style={{ color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginTop: 10 }}>Install a native ZannyChat build to use the LiveKit media engine. The web client does not start group media calls.</Text>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 24, backgroundColor: '#6557D9', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14 }}><Text style={{ color: colors.onPrimary, fontWeight: '800' }}>Go back</Text></TouchableOpacity>
    </SafeAreaView>
  );
}
