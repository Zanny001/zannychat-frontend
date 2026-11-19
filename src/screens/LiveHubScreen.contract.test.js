import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./LiveHubScreen.js', import.meta.url), 'utf8');
const preflight = fs.readFileSync(new URL('./LivePreflightScreen.js', import.meta.url), 'utf8');

test('LIVE hub supports public, follower-only and private broadcasts', () => {
  assert.ok(screen.includes("{ value: 'public', label: 'Public' }"));
  assert.ok(screen.includes("{ value: 'followers', label: 'Followers' }"));
  assert.ok(screen.includes("{ value: 'private', label: 'Private' }"));
  assert.ok(screen.includes("navigation.navigate('LivePreflight'"));
  assert.ok(screen.includes('visibility,'));
  assert.ok(screen.includes('allowGuests,'));
});

test('LIVE hub creates private invitations and displays pending invitations', () => {
  assert.ok(screen.includes("backendFetch('/live/invitations')"));
  assert.ok(screen.includes('Private LIVE invitations'));
  assert.ok(screen.includes('acceptInvitation(item)'));
  assert.ok(screen.includes("backendFetch('/live/invite-candidates')"));
  assert.ok(screen.includes('selectedInvitees.includes(person.id)'));
  assert.ok(screen.includes('toggleInvitee(person.id)'));
  assert.ok(screen.includes("inviteeIds: visibility === 'private' ? invitees : []"));
  assert.equal(screen.includes('`/live/${connection.stream.id}/invites`'), false);
});

test('LIVE hub follows creators and loads follower-only broadcasts', () => {
  assert.ok(screen.includes("`/live/creators/${creatorId}/follow`"));
  assert.ok(screen.includes("backendFetch('/live/following/streams')"));
  assert.ok(screen.includes("backendFetch('/live/following')"));
  assert.ok(screen.includes('Creators you follow'));
  assert.ok(screen.includes('followingCreators.map'));
  assert.ok(screen.includes("item.visibility === 'followers'"));
});


test('LIVE composer keeps classic broadcasts separate from themed video chat and audio rooms', () => {
  assert.ok(screen.includes("value: 'broadcast', label: 'Classic Broadcast'"));
  assert.ok(screen.includes("value: 'video_chat', label: 'Video Chat'"));
  assert.ok(screen.includes("value: 'audio_room', label: 'Audio Room'"));
  assert.ok(screen.includes('experienceMode,'));
  assert.ok(screen.includes('category,'));
  assert.ok(screen.includes('LIVE_CATEGORIES'));
  assert.ok(preflight.includes("const needsCamera = experienceMode !== 'audio_room'"));
  assert.ok(preflight.includes("const cameraGranted = !needsCamera || Boolean(activeCameraPermission?.granted)"));
  assert.ok(preflight.includes("const microphoneGranted = Boolean(activeMicrophonePermission?.granted)"));
});

test('LIVE hub uses the shared premium theme and supports focused discovery filters', () => {
  assert.ok(screen.includes("import { useTheme } from '../theme/ThemeContext'"));
  assert.ok(screen.includes("import GlassCard from '../components/GlassCard'"));
  assert.ok(screen.includes("const STREAM_FILTERS"));
  assert.ok(screen.includes("import { filterLiveStreams } from '../utils/liveDiscovery'"));
  assert.ok(screen.includes('const visibleStreams = filterLiveStreams(streams'));
  assert.ok(screen.includes('filter: activeFilter'));
  assert.ok(screen.includes('followingIds'));
  assert.ok(screen.includes('Your stage.'));
  assert.ok(screen.includes('Your people.'));
});

test('creator pre-flight requests media permissions before creating a LIVE stream', () => {
  assert.ok(preflight.includes('useCameraPermissions'));
  assert.ok(preflight.includes('useMicrophonePermissions'));
  assert.ok(preflight.includes('requestCameraPermission()'));
  assert.ok(preflight.includes('requestMicrophonePermission()'));
  assert.ok(preflight.includes('<CameraView'));
  assert.ok(preflight.includes('if (!mediaPermissionsGranted)'));
  assert.ok(preflight.indexOf('if (!mediaPermissionsGranted)') < preflight.indexOf("await backendFetch('/live'"));
});


test('creator pre-flight exposes startup failures in an accessible page alert', () => {
  assert.ok(preflight.includes("setError(startError?.message || 'Could not start LIVE."));
  assert.ok(preflight.includes('accessibilityRole="alert"'));
  assert.ok(preflight.includes('Alert.alert('), 'critical stream-link recovery must alert when the creator is redirected into an active broadcast');
});

test('creator pre-flight validates the server connection before opening the broadcast studio', () => {
  assert.ok(preflight.includes("!connection?.stream?.id || !connection?.livekitUrl || !connection?.token"));
  assert.ok(preflight.includes("navigation.replace('LiveStream', {"));
  assert.ok(preflight.includes('streamId: connection.stream.id'));
});

test('LIVE hub receives direct guest-stage invitations and opens the stage for invitees', () => {
  assert.ok(screen.includes("'live_guest_invitation'"));
  assert.ok(screen.includes("item.invitation_type === 'guest' ? 'Invited to join the LIVE stage'"));
  assert.ok(screen.includes("item.invitation_type === 'guest' ? 'Join stage' : 'Join'"));
  assert.ok(screen.includes("item.invitation_type === 'guest' ? 'mic' : 'lock-closed'"));
});

test('LIVE hub discovers replay cards and polls pending processing with a bounded window', () => {
  assert.ok(screen.includes("backendFetch('/live/replays')"));
  assert.ok(screen.includes('LIVE replays'));
  assert.ok(screen.includes("item.status === 'ready'"));
  assert.ok(screen.includes('Watch replay'));
  assert.ok(screen.includes('Preparing replay…'));
  assert.ok(screen.includes('hasPendingReplays'));
  assert.ok(screen.includes('refreshPendingReplays'));
  assert.ok(screen.includes('5 * 60 * 1000'));
  assert.ok(screen.includes('15000'));
  assert.ok(screen.includes("navigation.navigate('LiveReplay'"));
});

test('replay-ready notifications open the private in-app player', () => {
  assert.ok(screen.includes("type === 'live_replay_ready'"));
  assert.ok(screen.includes('notification.replayId'));
  assert.ok(screen.includes("navigation.navigate('LiveReplay'"));
});

test('Go LIVE primary button uses its semantic foreground color for all palette themes', () => {
  assert.ok(screen.includes('<ActivityIndicator color={colors.onPrimary} />'));
  assert.ok(screen.includes('name="radio" size={20} color={colors.onPrimary}'));
  assert.ok(screen.includes("{ color: colors.onPrimary }]}>{busy ? 'Connecting…' : 'Go LIVE'}"));
});


test('LIVE hub prioritizes discovery and keeps broadcast setup available in a collapsed panel', () => {
  assert.ok(screen.includes('const [showComposer, setShowComposer] = useState(false)'));
  assert.ok(screen.includes('setShowComposer((value) => !value)'));
  assert.ok(screen.includes('{showComposer && <>'));
  assert.ok(screen.includes('Search LIVE titles or creators'));
  assert.ok(screen.includes('Clear LIVE search'));
});


test('LIVE Hub replay polling pauses when the screen is unfocused or the app is backgrounded', () => {
  assert.ok(screen.includes('useFocusEffect(useCallback(() => {'));
  assert.ok(screen.includes('AppState.currentState && AppState.currentState !== \'active\''));
  assert.ok(screen.includes('pendingReplayPollStartedAt.current'));
  assert.ok(screen.includes('return () => clearInterval(interval)'));
});


test('LIVE hub invalidates account-scoped responses and clears private data on account changes', () => {
  assert.ok(screen.includes('const refreshRequestRef = useRef(0)'));
  assert.ok(screen.includes('const activeUserIdRef = useRef(null)'));
  assert.ok(screen.includes('const startingUser = await getCurrentUser().catch(() => null)'));
  assert.ok(screen.includes('const expectedUserId = startingUser?.id || null'));
  assert.ok(screen.includes('if (activeUserIdRef.current !== expectedUserId)'));
  assert.ok(screen.includes('setInvitations([])'));
  assert.ok(screen.includes('setReplays([])'));
  assert.ok(screen.includes('setFollowingIds([])'));
  assert.ok(screen.includes('setSelectedInvitees([])'));
  assert.ok(screen.includes('const latestUser = await getCurrentUser().catch(() => null)'));
  assert.ok(screen.includes('latestUser?.id !== expectedUserId'));
  assert.ok(screen.includes('requestId !== refreshRequestRef.current'));
  assert.ok(screen.includes('if (requestId === refreshRequestRef.current) setLoading(false)'));
});

test('pending LIVE replay polling refuses to apply results after an account switch', () => {
  assert.ok(screen.includes('const expectedUserId = currentUserId'));
  assert.ok(screen.includes('if (!expectedUserId || !pending.length) return'));
  assert.ok(screen.includes('if (latestUser?.id !== expectedUserId) return'));
});


test('LIVE hub clears private state immediately when Supabase auth owner changes', () => {
  assert.ok(screen.includes("import { supabase, SUPABASE_ENABLED } from '../services/supabaseClient'"));
  assert.ok(screen.includes('supabase.auth.onAuthStateChange'));
  assert.ok(screen.includes('const nextUserId = session?.user?.id || null'));
  assert.ok(screen.includes('if (activeUserIdRef.current === nextUserId) return'));
  assert.ok(screen.includes('refreshRequestRef.current += 1'));
  assert.ok(screen.includes('setCurrentUserId(nextUserId)'));
  assert.ok(screen.includes('setInvitations([])'));
  assert.ok(screen.includes('setReplays([])'));
  assert.ok(screen.includes('setSelectedInvitees([])'));
  assert.ok(screen.includes('setTitle(\'\')'));
  assert.ok(screen.includes("setVisibility('public')"));
  assert.ok(screen.includes('setShowComposer(false)'));
  assert.ok(screen.includes('if (nextUserId) Promise.resolve().then(() => refresh())'));
  assert.ok(screen.includes('data?.subscription?.unsubscribe?.()'));
});


test('LIVE Hub does not let an identity lookup overwrite a newer auth event', () => {
  assert.ok(screen.includes('if (requestId !== refreshRequestRef.current) return;'));
  assert.ok(screen.includes('An auth event may have invalidated this refresh'));
});

test('LIVE hub separates the owner Creator Studio from public creator profiles', () => {
  assert.ok(screen.includes("navigation.navigate('LiveCreatorStudio')"));
  assert.ok(screen.includes('accessibilityLabel="Open LIVE Creator Studio"'));
  assert.ok(screen.includes("navigation.navigate('LiveCreatorProfile'"));
  assert.ok(screen.includes('openCreatorProfile(creator)'));
  assert.ok(screen.includes('openCreatorProfile(item, item.id, item.is_creator)'));
  assert.ok(screen.includes('currentLiveStreamId,'));
  assert.ok(screen.includes('isFollowing: followingIds.includes(creatorId)'));
  assert.ok(screen.includes('View profile'));
});

test('LIVE room navigation passes only stable IDs and safe creator display hints', () => {
  assert.ok(screen.includes("navigation.navigate('LiveStream', {"));
  assert.ok(screen.includes('streamId: stream.id'));
  assert.ok(screen.includes('creatorName: stream.creator_name || stream.name || null'));
  assert.ok(screen.includes('creatorAvatarColor: stream.avatarColor || stream.avatar_color || null'));
});
