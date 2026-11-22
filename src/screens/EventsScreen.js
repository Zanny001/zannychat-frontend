import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../theme/ThemeContext';
import { createConversationEvent, getCurrentEventUserId, listConversationEventPage, respondToConversationEvent } from '../services/events';
import { normalizeEvent } from '../utils/eventRules';

export default function EventsScreen({ navigation, route }) {
  const conversation = route.params?.conversation;
  const conversationId = conversation?.id || route.params?.conversationId;
  const { colors, spacing, radii, typography, layout } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [location, setLocation] = useState('');
  const [events, setEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!conversationId) {
      setError('Open events from a conversation.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [page, userId] = await Promise.all([
        listConversationEventPage(conversationId),
        getCurrentEventUserId(),
      ]);
      setEvents(page.events);
      setHasMore(page.hasMore);
      setNextCursor(page.nextCursor);
      setCurrentUserId(userId);
    } catch (e) {
      setError(e?.message || 'Could not load events. Apply database migration 0018 and try again.');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const loadMore = async () => {
    if (!conversationId || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const page = await listConversationEventPage(conversationId, { cursor: nextCursor });
      setEvents((current) => {
        const seen = new Set(current.map((event) => event.id));
        return [...current, ...page.events.filter((event) => !seen.has(event.id))];
      });
      setHasMore(page.hasMore);
      setNextCursor(page.nextCursor);
    } catch (e) {
      Alert.alert('Could not load more events', e?.message || 'Please try again.');
    } finally {
      setLoadingMore(false);
    }
  };

  const publish = async () => {
    setSaving(true);
    try {
      // Datetime-local input is interpreted in the device's local timezone.
      const normalized = normalizeEvent({ title, description, location, startsAt: new Date(startsAt).toISOString() });
      await createConversationEvent(conversationId, normalized);
      setTitle('');
      setDescription('');
      setStartsAt('');
      setLocation('');
      await refresh();
      Alert.alert('Event created', 'Conversation members can now RSVP.');
    } catch (e) {
      Alert.alert('Could not create event', e?.message || 'Enter a valid future date and time.');
    } finally {
      setSaving(false);
    }
  };

  const respond = async (event, response) => {
    try {
      await respondToConversationEvent(event.id, response);
      await refresh();
    } catch (e) {
      Alert.alert('Could not save RSVP', e?.message || 'Please try again.');
    }
  };

  const visibleEvents = events.filter((event) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return [event.title, event.location, event.description].filter(Boolean).join(' ').toLowerCase().includes(query);
  });

  const fieldStyle = [typography.body, {
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    minHeight: 48, width: '100%', minWidth: 0,
  }];

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <Header eyebrow="MAKE IT A MOMENT" title="Events" subtitle="Bring your conversations into real life" onBack={() => navigation.goBack()} />
      <FlatList
        style={{ flex: 1 }}
        data={visibleEvents}
        keyExtractor={(event) => String(event.id)}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl || spacing.xl, flexGrow: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}
        ListHeaderComponent={
          <View>
            <View style={{ minHeight: 50, flexDirection: 'row', alignItems: 'center', borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.md, marginBottom: spacing.md }}>
              <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
              <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search loaded events" placeholderTextColor={colors.textSecondary} accessibilityLabel="Search loaded events by title, location or details" returnKeyType="search" style={[typography.body, { color: colors.textPrimary, flex: 1, minWidth: 0, paddingVertical: spacing.sm, paddingLeft: spacing.sm }]} />
              {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityRole="button" accessibilityLabel="Clear event search" style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="close-circle" size={18} color={colors.textSecondary} /></TouchableOpacity> : null}
            </View>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>{visibleEvents.length} of {events.length} loaded events · Search updates as you load more</Text>
            <GlassCard glow style={{ marginBottom: spacing.md }} contentStyle={{ padding: spacing.md, gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{ width: 42, height: 42, borderRadius: 15, backgroundColor: `${colors.primary}18`, borderWidth: 1, borderColor: `${colors.primary}35`, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="sparkles-outline" size={21} color={colors.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Create a shared moment</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>Give your people something to look forward to.</Text>
                </View>
              </View>
              <View style={{ gap: spacing.xs }}>
                <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '800' }]}>EVENT NAME · {title.length}/160</Text>
                <TextInput value={title} onChangeText={setTitle} maxLength={160} placeholder="What are we getting together for?" placeholderTextColor={colors.textSecondary} accessibilityLabel="Event title" style={[fieldStyle, { backgroundColor: colors.surface }]} />
              </View>
              <View style={{ gap: spacing.xs }}>
                <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '800' }]}>DATE & TIME · YOUR LOCAL TIME</Text>
                <TextInput value={startsAt} onChangeText={setStartsAt} placeholder="YYYY-MM-DDTHH:mm" placeholderTextColor={colors.textSecondary} accessibilityLabel="Event date and time" style={[fieldStyle, { backgroundColor: colors.surface }]} autoCapitalize="none" />
              </View>
              <View style={{ gap: spacing.xs }}>
                <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '800' }]}>WHERE · OPTIONAL</Text>
                <TextInput value={location} onChangeText={setLocation} maxLength={240} placeholder="Add a place or meeting point" placeholderTextColor={colors.textSecondary} accessibilityLabel="Event location" style={[fieldStyle, { backgroundColor: colors.surface }]} />
              </View>
              <View style={{ gap: spacing.xs }}>
                <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '800' }]}>THE DETAILS · {description.length}/1,000</Text>
                <TextInput value={description} onChangeText={setDescription} maxLength={1000} multiline placeholder="Share a little more about the plan…" placeholderTextColor={colors.textSecondary} accessibilityLabel="Event details" style={[fieldStyle, { minHeight: 92, textAlignVertical: 'top', backgroundColor: colors.surface, lineHeight: 22 }]} />
              </View>
              <TouchableOpacity onPress={publish} disabled={saving || !title.trim() || !startsAt.trim()} accessibilityRole="button" accessibilityLabel="Publish event" accessibilityState={{ disabled: saving || !title.trim() || !startsAt.trim(), busy: saving }} style={{ minHeight: 48, borderRadius: radii.md, backgroundColor: saving || !title.trim() || !startsAt.trim() ? colors.border : colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
                {saving ? <ActivityIndicator color={colors.onPrimary} /> : <Ionicons name="calendar-outline" size={17} color={colors.onPrimary} />}
                <Text style={[typography.bodyStrong, { color: colors.background }]}>{saving ? 'Creating…' : 'Create event'}</Text>
              </TouchableOpacity>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Choose a future date and time in your device's local timezone. Database migration 0018 is required.</Text>
            </GlassCard>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Coming together</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>{events.length} upcoming {events.length === 1 ? 'event' : 'events'}</Text>
              </View>
            </View>
            {loading && events.length ? <ActivityIndicator color={colors.primary} style={{ padding: spacing.md }} /> : null}
            {error && events.length ? <View style={{ padding: spacing.md, marginBottom: spacing.sm }}><Text style={[typography.body, { color: colors.textSecondary }]}>{error}</Text><TouchableOpacity onPress={refresh} accessibilityRole="button" accessibilityLabel="Retry loading events" style={{ minHeight: 48, justifyContent: 'center' }}><Text style={[typography.bodyStrong, { color: colors.primary }]}>Try again</Text></TouchableOpacity></View> : null}
          </View>
        }
        renderItem={({ item: event }) => {
          const rsvps = event.conversation_event_rsvps || [];
          const mine = rsvps.find((r) => r.user_id === currentUserId)?.response;
          const going = rsvps.filter((r) => r.response === 'going').length;
          const maybe = rsvps.filter((r) => r.response === 'maybe').length;
          const notGoing = rsvps.filter((r) => r.response === 'not_going').length;
          const eventDate = new Date(event.starts_at);
          const validEventDate = !Number.isNaN(eventDate.getTime());
          const eventDay = validEventDate ? eventDate.toLocaleDateString(undefined, { day: '2-digit' }) : '—';
          const eventMonth = validEventDate ? eventDate.toLocaleDateString(undefined, { month: 'short' }).toUpperCase() : 'DATE';
          const options = [
            { value: 'going', label: 'Going' },
            { value: 'maybe', label: 'Maybe' },
            { value: 'not_going', label: 'Can’t go' },
          ];
          return (
            <GlassCard style={{ marginBottom: spacing.sm }} contentStyle={{ padding: spacing.md, gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{ width: 56, minHeight: 60, borderRadius: radii.md, borderWidth: 1, borderColor: `${colors.primary}35`, backgroundColor: `${colors.primary}12`, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={[typography.heading, { color: colors.primary, lineHeight: 27 }]}>{eventDay}</Text>
                  <Text style={[typography.caption, { color: colors.primary, fontWeight: '800' }]}>{eventMonth}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <Text style={[typography.bodyStrong, { color: colors.textPrimary }]} numberOfLines={2}>{event.title}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>{validEventDate ? eventDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Time unavailable'}</Text>
                  {event.location ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Ionicons name="location-outline" size={13} color={colors.textSecondary} /><Text numberOfLines={1} style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>{event.location}</Text></View> : null}
                </View>
              </View>
              {event.description ? <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]}>{event.description}</Text> : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, minHeight: 30, borderRadius: radii.pill, backgroundColor: colors.surface }}>
                  <Ionicons name="people-outline" size={13} color={colors.textSecondary} />
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>{going} going</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, minHeight: 30, borderRadius: radii.pill, backgroundColor: colors.surface }}>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>{maybe} maybe · {notGoing} can’t go</Text>
                </View>
              </View>
              <View style={{ height: 1, backgroundColor: colors.border }} />
              <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '800' }]}>YOUR RESPONSE</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                {options.map((option) => (
                  <TouchableOpacity key={option.value} onPress={() => respond(event, option.value)} accessibilityRole="button" accessibilityLabel={'RSVP ' + option.label} accessibilityState={{ selected: mine === option.value }} style={{ borderWidth: 1, borderColor: mine === option.value ? colors.primary : colors.border, backgroundColor: mine === option.value ? colors.primary : colors.surface, borderRadius: radii.md, minHeight: 48, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, justifyContent: 'center' }}>
                    <Text style={[typography.caption, { color: mine === option.value ? colors.onPrimary : colors.textSecondary, fontWeight: mine === option.value ? '800' : '600' }]}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </GlassCard>
          );
        }}
        ListEmptyComponent={
          loading ? <ActivityIndicator color={colors.primary} style={{ padding: spacing.xl }} />
            : error ? <View style={{ padding: spacing.md }}><Text style={[typography.body, { color: colors.textSecondary }]}>{error}</Text><TouchableOpacity onPress={refresh} accessibilityRole="button" accessibilityLabel="Retry loading events" style={{ minHeight: 48, justifyContent: 'center' }}><Text style={[typography.bodyStrong, { color: colors.primary }]}>Try again</Text></TouchableOpacity></View>
            : <View style={{ alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.xs }}><Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>{searchQuery.trim() ? 'No matching loaded events' : 'No upcoming events in this conversation.'}</Text>{searchQuery.trim() ? <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityRole="button" accessibilityLabel="Clear event search" style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md }}><Text style={[typography.bodyStrong, { color: colors.primary }]}>Clear search</Text></TouchableOpacity> : null}</View>
        }
        ListFooterComponent={hasMore ? (
          <TouchableOpacity onPress={loadMore} disabled={loadingMore} accessibilityRole="button" accessibilityLabel="Load more upcoming events" accessibilityState={{ disabled: loadingMore, busy: loadingMore }} style={{ minHeight: 48, marginVertical: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
            {loadingMore ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="chevron-down" size={18} color={colors.primary} />}
            <Text style={[typography.bodyStrong, { color: colors.primary }]}>{loadingMore ? 'Loading more events…' : 'Load more upcoming events'}</Text>
          </TouchableOpacity>
        ) : loadingMore ? <ActivityIndicator color={colors.primary} style={{ padding: spacing.md }} /> : null}
      />
    </SafeAreaView>
  );
}
