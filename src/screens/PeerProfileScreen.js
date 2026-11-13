import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View, StyleSheet, Modal, Image, Pressable, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../utils/color';
import { getSafeProfilePhotoUrl } from '../utils/profilePhoto';
import { getProfilePresence } from '../utils/profilePresence';
import { getProfileDetails } from '../utils/profileDetails';
import { getPublicProfileDetails, getPrivateProfileCoverUrl } from '../services/api';

function DetailRow({ icon, label, value, last = false }) {
  const { colors, spacing, typography, radii } = useTheme();
  if (value === null || value === undefined || String(value).trim() === '') return null;
  return <View style={[styles.detailRow, { paddingVertical: spacing.md, borderBottomColor: colors.border, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth }]}>
    <View style={[styles.detailIcon, { backgroundColor: hexToRgba(colors.primary, 0.12), borderRadius: radii.md }]}><Ionicons name={icon} size={18} color={colors.primary} /></View>
    <View style={{ flex: 1, minWidth: 0, marginLeft: spacing.md }}>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
      <Text selectable style={[typography.body, { color: colors.textPrimary, marginTop: 4 }]}>{value}</Text>
    </View>
  </View>;
}

function SectionHeading({ title, detail }) {
  const { colors, spacing, typography } = useTheme();
  return <View style={{ marginTop: spacing.xl, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
    <Text style={[typography.small, { color: colors.textSecondary, letterSpacing: 1.25, fontWeight: '700' }]}>{title.toUpperCase()}</Text>
    {detail ? <Text style={[typography.caption, { color: colors.textSecondary }]}>{detail}</Text> : null}
  </View>;
}

function QuickAction({ icon, label, onPress, primary = false }) {
  const { colors, spacing, radii, typography, mood } = useTheme();
  return <TouchableOpacity onPress={onPress} activeOpacity={0.78} accessibilityRole="button" accessibilityLabel={label} style={[styles.quickAction, { borderRadius: radii.lg, backgroundColor: primary ? colors.primary : hexToRgba(mood.signal, 0.11), borderColor: primary ? colors.primary : hexToRgba(mood.signal, 0.23), marginHorizontal: spacing.xs }]}>
    <Ionicons name={icon} size={21} color={primary ? colors.onPrimary : colors.textPrimary} />
    <Text style={[typography.caption, { color: primary ? colors.onPrimary : colors.textPrimary, fontWeight: '700', marginTop: 7 }]}>{label}</Text>
  </TouchableOpacity>;
}

export default function PeerProfileScreen({ route, navigation }) {
  const { colors, spacing, radii, typography, mood } = useTheme();
  const participant = route.params?.participant || {};
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [sharedDetails, setSharedDetails] = useState({});
  const [coverUrl, setCoverUrl] = useState(null);
  useEffect(() => {
    const userId = participant.id || participant.user_id;
    if (!userId) return undefined;
    let active = true;
    setSharedDetails({});
    setCoverUrl(null);
    getPublicProfileDetails(userId).then(async (details) => {
      if (!active) return;
      const visibleDetails = details || {};
      setSharedDetails(visibleDetails);
      if (Object.keys(visibleDetails).length > 0) {
        try {
          const signedCover = await getPrivateProfileCoverUrl(userId);
          if (active) setCoverUrl(signedCover || null);
        } catch (_) {
          if (active) setCoverUrl(null);
        }
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [participant.id, participant.user_id]);
  const conversation = route.params?.conversation;
  const name = participant.name || 'ZannyChat user';
  const resolvedPresence = getProfilePresence({ ...participant, ...sharedDetails });
  const online = resolvedPresence.online;
  const about = sharedDetails.about || participant.status || participant.about || participant.bio || 'Hey there, I’m using ZannyChat';
  const joined = participant.createdAt || participant.created_at;
  const joinedDate = joined ? new Date(joined) : null;
  const joinedLabel = joinedDate && !Number.isNaN(joinedDate.getTime()) ? joinedDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : null;
  const presence = resolvedPresence.presence;
  const username = participant.username ? `@${String(participant.username).replace(/^@/, '')}` : null;
  const avatarUrl = getSafeProfilePhotoUrl(participant.avatarUrl || participant.avatar_url);
  const extraDetails = getProfileDetails({ ...participant, ...sharedDetails });

  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <Header title="Profile" onBack={() => navigation.goBack()} right={<View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: spacing.xs }}><View style={[styles.livePill, { backgroundColor: hexToRgba(online ? colors.online : colors.textSecondary, 0.12), borderColor: hexToRgba(online ? colors.online : colors.textSecondary, 0.26) }]}><View style={[styles.liveDot, { backgroundColor: online ? colors.online : colors.textSecondary }]} /><Text style={[typography.caption, { color: online ? colors.online : colors.textSecondary, fontWeight: '700' }]}>{online ? 'ONLINE' : 'CONTACT'}</Text></View></View>} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xl }}>
      <GlassCard style={{ borderRadius: 30, overflow: 'hidden' }} contentStyle={{ padding: 0 }} intensity={48} tintAlpha={0.56}>
        <View style={[styles.heroBackdrop, { backgroundColor: hexToRgba(mood.signal, 0.13) }]}>
          {coverUrl ? <Image source={{ uri: coverUrl }} style={styles.coverBackdrop} resizeMode="cover" /> : null}
          <View style={[styles.orb, styles.orbOne, { backgroundColor: hexToRgba(mood.signal, 0.15) }]} />
          <View style={[styles.orb, styles.orbTwo, { backgroundColor: hexToRgba(colors.primary, 0.12) }]} />
          <TouchableOpacity
            onPress={() => { if (avatarUrl) setPhotoViewerVisible(true); }}
            disabled={!avatarUrl}
            activeOpacity={0.82}
            accessibilityRole={avatarUrl ? 'button' : 'image'}
            accessibilityLabel={avatarUrl ? `View ${name}'s full-size profile photo` : `${name}'s profile photo is unavailable`}
            accessibilityHint={avatarUrl ? 'Opens the profile photo viewer' : undefined}
            style={[styles.avatarHalo, { borderColor: hexToRgba(mood.signal, 0.54), backgroundColor: hexToRgba(colors.surface, 0.7) }]}
          >
            <Avatar name={name} color={participant.avatarColor} imageUrl={avatarUrl} size={104} />
            <View style={[styles.presenceDot, { backgroundColor: online ? colors.online : colors.textSecondary, borderColor: colors.surface }]} />
          </TouchableOpacity>
          <Text numberOfLines={2} style={[typography.title, { color: colors.textPrimary, marginTop: spacing.md, textAlign: 'center', fontSize: 25, paddingHorizontal: spacing.md }]}>{name}</Text>
          {username ? <Text style={[typography.body, { color: colors.textSecondary, marginTop: 4 }]}>{username}</Text> : null}
          <View style={[styles.presenceLine, { backgroundColor: hexToRgba(online ? colors.online : colors.textSecondary, 0.11), borderColor: hexToRgba(online ? colors.online : colors.textSecondary, 0.22) }]}>
            <View style={[styles.liveDot, { backgroundColor: online ? colors.online : colors.textSecondary }]} />
            <Text style={[typography.caption, { color: online ? colors.online : colors.textSecondary }]}>{presence}</Text>
          </View>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md, lineHeight: 23, paddingHorizontal: spacing.sm }]}>{about}</Text>
        </View>
        <View style={[styles.actionRow, { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.lg }]}>
          <QuickAction icon="chatbubble-ellipses" label="Message" primary onPress={() => navigation.goBack()} />
          {conversation ? <QuickAction icon="images-outline" label="Shared media" onPress={() => navigation.navigate('SharedMedia', { conversation })} /> : null}
        </View>
      </GlassCard>

      <SectionHeading title="CONTACT DETAILS" detail="Visible to you" />
      <GlassCard contentStyle={{ paddingHorizontal: spacing.md, paddingVertical: 0 }} intensity={32}>
        <DetailRow icon="person-outline" label="Display name" value={name} />
        <DetailRow icon="at-outline" label="Username" value={username} />
        <DetailRow icon="call-outline" label="Phone number" value={participant.phone || participant.phoneNumber || participant.phone_number} />
        <DetailRow icon="mail-outline" label="Email address" value={participant.email} />
        <DetailRow icon="calendar-outline" label="Member since" value={joinedLabel} />
        <DetailRow icon="information-circle-outline" label="About" value={about} last />
      </GlassCard>

      {extraDetails.length > 0 ? <>
        <SectionHeading title="MORE ABOUT" detail="Shared by this contact" />
        <GlassCard contentStyle={{ paddingHorizontal: spacing.md, paddingVertical: 0 }} intensity={30}>
          {extraDetails.map((item, index) => <DetailRow key={item.key} icon={item.icon} label={item.label} value={item.value} last={index === extraDetails.length - 1} />)}
        </GlassCard>
      </> : null}

      {conversation ? <>
        <SectionHeading title="Your conversation" detail="A little more context" />
        <GlassCard contentStyle={{ padding: spacing.md }} intensity={30}>
          <TouchableOpacity onPress={() => navigation.navigate('SharedMedia', { conversation })} activeOpacity={0.75} style={styles.mediaRow} accessibilityRole="button" accessibilityLabel="Open shared photos and videos">
            <View style={[styles.featureIcon, { backgroundColor: hexToRgba(mood.signal, 0.14), borderRadius: radii.lg }]}><Ionicons name="images-outline" size={22} color={colors.primary} /></View>
            <View style={{ flex: 1, minWidth: 0, marginLeft: spacing.md }}>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Photos, videos & files</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>Browse media shared in this chat</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </GlassCard>
      </> : null}

      <View style={[styles.privacyNote, { borderColor: hexToRgba(mood.signal, 0.2), backgroundColor: hexToRgba(mood.signal, 0.06), borderRadius: radii.lg, marginTop: spacing.lg }]}>
        <Ionicons name="shield-checkmark-outline" size={19} color={colors.primary} />
        <Text style={[typography.caption, { color: colors.textSecondary, flex: 1, minWidth: 0, marginLeft: spacing.sm, lineHeight: 19 }]}>Only details available to your account are shown. Private information is never invented or exposed by this screen.</Text>
      </View>
    </ScrollView>
    <Modal
      visible={photoViewerVisible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => setPhotoViewerVisible(false)}
    >
      <View style={styles.photoViewerBackdrop}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.photoViewerHeader}>
          <Text numberOfLines={1} style={styles.photoViewerName}>{name}</Text>
          <Pressable
            onPress={() => setPhotoViewerVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Close full-size profile photo"
            hitSlop={12}
            style={styles.photoViewerClose}
          >
            <Ionicons name="close" size={27} color="#FFFFFF" />
          </Pressable>
        </View>
        {avatarUrl ? <Image source={{ uri: avatarUrl }} resizeMode="contain" style={styles.photoViewerImage} accessibilityLabel={`${name}'s full-size profile photo`} onError={() => setPhotoViewerVisible(false)} /> : null}
      </View>
    </Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  coverBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, height: 190, width: '100%', opacity: 0.24 },
  heroBackdrop: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 2, alignItems: 'center', overflow: 'hidden' },
  orb: { position: 'absolute', borderRadius: 999 },
  orbOne: { width: 220, height: 220, top: -135, left: -80 },
  orbTwo: { width: 190, height: 190, top: -110, right: -75 },
  avatarHalo: { width: 122, height: 122, borderRadius: 61, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  presenceDot: { position: 'absolute', right: 3, bottom: 5, width: 17, height: 17, borderRadius: 9, borderWidth: 3 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  presenceLine: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 18, paddingHorizontal: 11, paddingVertical: 6, marginTop: 11 },
  actionRow: { flexDirection: 'row', justifyContent: 'center', marginHorizontal: -4 },
  quickAction: { flex: 1, minHeight: 76, alignItems: 'center', justifyContent: 'center', borderWidth: 1, paddingHorizontal: 6, paddingVertical: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'center' },
  detailIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  mediaRow: { flexDirection: 'row', alignItems: 'center', minHeight: 62 },
  featureIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  privacyNote: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, padding: 13 },
  photoViewerBackdrop: { flex: 1, backgroundColor: '#000000', justifyContent: 'center' },
  photoViewerHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2, minHeight: 76, paddingTop: 18, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  photoViewerName: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', flex: 1, marginRight: 16 },
  photoViewerClose: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  photoViewerImage: { width: '100%', height: '100%' },
});
