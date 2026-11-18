import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getLiveCategoryTheme } from '../utils/liveExperience';

export default function LiveCategoryBackdrop({ category = 'social', title = '', mode = 'video_chat' }) {
  const theme = getLiveCategoryTheme(category);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', backgroundColor: theme.background }}>
      <View style={{ position: 'absolute', width: 330, height: 330, borderRadius: 180, top: '13%', right: '-22%', backgroundColor: theme.glow, opacity: 0.34 }} />
      <View style={{ position: 'absolute', width: 230, height: 230, borderRadius: 130, bottom: '-12%', left: '-16%', backgroundColor: theme.glow, opacity: 0.22 }} />
      <View style={{ position: 'absolute', top: '20%', right: '8%', opacity: 0.24, transform: [{ rotate: '-12deg' }] }}>
        <Ionicons name={theme.icon} size={190} color={theme.accent} />
      </View>
      <View style={{ position: 'absolute', top: 112, left: 22, right: 100 }}>
        <Text style={{ color: theme.accent, fontSize: 10, fontWeight: '900', letterSpacing: 2.2 }}>{mode === 'audio_room' ? 'AUDIO LIVE ROOM' : 'VIDEO LIVE CHAT'} · {theme.label.toUpperCase()}</Text>
        {!!title && <Text numberOfLines={2} style={{ color: '#FFFFFF', fontSize: 23, lineHeight: 29, fontWeight: '900', marginTop: 9 }}>{title}</Text>}
        <Text style={{ color: 'rgba(255,255,255,0.64)', fontSize: 11, marginTop: 8 }}>A ZannyChat community conversation</Text>
      </View>
      <View style={{ position: 'absolute', left: 22, bottom: 286, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.24)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }}>
        <Text style={{ color: theme.accent, fontSize: 9, fontWeight: '900', letterSpacing: 1.8 }}>ZANNYCHAT LIVE</Text>
      </View>
    </View>
  );
}
