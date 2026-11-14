import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from './GlassCard';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../utils/color';

const REACTION_COLLECTION = [
  { key: 'heart', emoji: '❤️', label: 'Love' },
  { key: 'clap', emoji: '👏', label: 'Applause' },
  { key: 'laugh', emoji: '😂', label: 'Laughter' },
  { key: 'wow', emoji: '😮', label: 'Surprise' },
  { key: 'fire', emoji: '🔥', label: 'Fire' },
  { key: 'idea', emoji: '💡', label: 'Ideas' },
  { key: 'support', emoji: '🙌', label: 'Support' },
];

const IMPACT_MILESTONES = [
  { threshold: 10, label: 'First Spark' },
  { threshold: 50, label: 'Community Favorite' },
  { threshold: 250, label: 'Stage Star' },
  { threshold: 1000, label: 'Iconic Voice' },
  { threshold: 5000, label: 'Legendary Presence' },
  { threshold: 10000, label: 'Hall of Fame' },
];

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
  const reactionBreakdown = Array.isArray(impact.reactionBreakdown) ? impact.reactionBreakdown : [];
  const reactionCounts = new Map(reactionBreakdown.map((item) => [item.reaction, Number(item.count || 0)]));
  const nextMilestone = impact.nextMilestone || IMPACT_MILESTONES.find((milestone) => impactScore < milestone.threshold) || null;
  const previousThreshold = [...IMPACT_MILESTONES].reverse().find((milestone) => impactScore >= milestone.threshold)?.threshold || 0;
  const milestoneProgress = nextMilestone
    ? Math.max(0, Math.min(1, (impactScore - previousThreshold) / Math.max(1, nextMilestone.threshold - previousThreshold)))
    : 1;

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
      <View style={{ marginTop: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={[typography.caption, { color: mood.thread, fontWeight: '900', letterSpacing: 1 }]}>REACTION COLLECTION</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>{totalReactions.toLocaleString()} collected</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
          {REACTION_COLLECTION.map((item) => {
            const count = reactionCounts.get(item.key) || 0;
            return (
              <View key={item.key} accessible accessibilityLabel={`${item.label}: ${count.toLocaleString()} reactions`} style={{ width: '23%', minWidth: 62, flexGrow: 1, paddingVertical: 9, paddingHorizontal: 5, borderRadius: 14, alignItems: 'center', backgroundColor: hexToRgba(mood.thread, 0.08), borderWidth: 1, borderColor: hexToRgba(mood.thread, 0.18) }}>
                <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
                <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginTop: 3 }]}>{count.toLocaleString()}</Text>
                <Text numberOfLines={1} style={[typography.caption, { color: colors.textSecondary, fontSize: 10 }]}>{item.label}</Text>
              </View>
            );
          })}
        </View>
      </View>
      <View style={{ marginTop: spacing.md, padding: 12, borderRadius: 16, backgroundColor: hexToRgba(mood.signal, 0.08), borderWidth: 1, borderColor: hexToRgba(mood.signal, 0.18) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '800' }]}>NEXT IMPACT MILESTONE</Text>
          <Text style={[typography.caption, { color: mood.signal, fontWeight: '900' }]}>{nextMilestone ? `${impactScore.toLocaleString()} / ${Number(nextMilestone.threshold).toLocaleString()}` : 'Complete'}</Text>
        </View>
        <View style={{ height: 7, borderRadius: 99, backgroundColor: colors.border, overflow: 'hidden', marginTop: 9 }}>
          <View style={{ width: `${milestoneProgress * 100}%`, height: '100%', borderRadius: 99, backgroundColor: mood.signal }} />
        </View>
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 7 }]}>
          {nextMilestone ? `${Math.max(0, Number(nextMilestone.threshold) - impactScore).toLocaleString()} points to ${nextMilestone.label}` : 'You have earned every current LIVE Impact milestone.'}
        </Text>
      </View>
      <View style={{ marginTop: spacing.md }}>
        <Text style={[typography.caption, { color: mood.thread, fontWeight: '900', letterSpacing: 1, marginBottom: 8 }]}>BADGE COLLECTION · {badges.length}</Text>
      {badges.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
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
      </View>
    </GlassCard>
  );
}
