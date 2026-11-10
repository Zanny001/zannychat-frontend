import React from 'react';
import { SafeAreaView, Text, TouchableOpacity, View } from 'react-native';

export default function LiveStreamScreen({ navigation }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#100F18', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
      <View style={{ width: 78, height: 78, borderRadius: 26, backgroundColor: '#D83A59', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 30 }}>●</Text>
      </View>
      <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800', textAlign: 'center' }}>LIVE needs the native media engine</Text>
      <Text style={{ color: '#AAA7BD', textAlign: 'center', lineHeight: 22, marginTop: 10 }}>The web preview can show LIVE discovery, but publishing and watching video require a native build and a configured LiveKit server.</Text>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 24, backgroundColor: '#6557D9', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14 }}><Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Go back</Text></TouchableOpacity>
    </SafeAreaView>
  );
}
