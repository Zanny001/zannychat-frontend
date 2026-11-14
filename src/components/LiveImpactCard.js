import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from './GlassCard';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../utils/color';

function Stat({ label, value, color }) {
  const { colors, typography } = useTheme();
  return (
    <View style={{ flex: 1, minWidth: 0, padding: 11, borderRadius: 15, backgroundColor: hexToRgba(color, 0.1), borderWidth: 1, borderColor: hexToRgba(color, 0.22) }}>
      <Text style={[typography.title, { color: colors.textPrimary, fontSize: 21 }]}>{Number(value || 0).toLocaleString()}</Text>
      <Text numberOfLines={1} style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>{label}</Text>
    </View>
  );
}

export default function LiveImpactCard({ impact, showEmpty = false }) {
  const { colors, spacing, typography, mood } = useTheme();
  if (!impact) return null;
  const impactScore = Number(impact.impactScore || 0);
  const totalReactions = Number(impact.totalReactions || 0);
  const uniqueSupporters = Number(impact.uniqueSupporters || 0);
  if (!showEmpty && impactScore === 0 && totalReactions === 0 && uniqueSupporters === 0) return null;
  const badges = Array.isArray(impact.badges) ? impact.badges : [];

  return (
    <GlassCard style={{ marginBottom: spacing.lg, borderRadius: 24 }} contentStyle={{ padding: 16 }} intensity={34} tintAlpha={0.48}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: hexToRgba(mood.signal, 0.14), borderWidth: 1, borderColor: hexToRgba(mood.signal, 0.26) }}>
          <Ionicons name="sparkles" size={20} color={mood.signal} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[typography.small, { color: mood.thread, letterSpacing: 1.1, fontWeight: '800' }]}>LIVE IMPACT</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>Community appreciation, earned over time</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.md }}>
        <Stat label="Impact points" value={impactScore} color={mood.signal} />
        <Stat label="Reactions" value={totalReactions} color={mood.thread} />
        <Stat label="Supporters" value={uniqueSupporters} color={colors.accent} />
      </View>
      <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 18, marginTop: spacing.sm }]}>
        One point per unique supporter each UTC day. Every emoji is counted separately; rapid repeat taps do not inflate your score.
      </Text>
      {badges.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: spacing.md }}>
          {badges.map((badge) => (
            <View key={badge.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: hexToRgba(mood.signal, 0.12), borderWidth: 1, borderColor: hexToRgba(mood.signal, 0.25) }}>
              <Ionicons name="ribbon-outline" size={14} color={mood.signal} />
              <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '700' }]}>{badge.label}</Text>
            </View>
          ))}
        </View>
      ) : showEmpty ? (
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.md }]}>Go LIVE, welcome your community, and start earning your first Impact badge.</Text>
      ) : null}
    </GlassCard>
  );
}
