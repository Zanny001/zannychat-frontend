import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
  const { colors, spacing, radii, typography } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [location, setLocation] = useState('');
  const [events, setEvents] = useState([]);
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

  const fieldStyle = [typography.body, {
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    minWidth: 0,
    minHeight: 48,
    width: '100%',
  }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Events" subtitle="Plan something together" onBack={() => navigation.goBack()} />
      <FlatList
        style={{ flex: 1 }}
        data={events}
        keyExtractor={(event) => String(event.id)}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl || spacing.xl, flexGrow: 1 }}
        ListHeaderComponent={
          <View>
            <GlassCard style={{ marginBottom: spacing.md }} contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Create an event</Text>
              <TextInput value={title} onChangeText={setTitle} maxLength={160} placeholder="Event title" placeholderTextColor={colors.textSecondary} accessibilityLabel="Event title" style={fieldStyle} />
              <TextInput value={startsAt} onChangeText={setStartsAt} placeholder="Date and time (e.g. 2030-05-01T18:30)" placeholderTextColor={colors.textSecondary} accessibilityLabel="Event date and time" style={fieldStyle} autoCapitalize="none" />
              <TextInput value={location} onChangeText={setLocation} maxLength={240} placeholder="Location (optional)" placeholderTextColor={colors.textSecondary} accessibilityLabel="Event location" style={fieldStyle} />
              <TextInput value={description} onChangeText={setDescription} maxLength={1000} multiline placeholder="Details (optional)" placeholderTextColor={colors.textSecondary} accessibilityLabel="Event details" style={[fieldStyle, { minHeight: 80, textAlignVertical: 'top' }]} />
              <TouchableOpacity onPress={publish} disabled={saving || !title.trim() || !startsAt.trim()} accessibilityRole="button" accessibilityLabel="Publish event" accessibilityState={{ disabled: saving || !title.trim() || !startsAt.trim(), busy: saving }} style={{ minHeight: 48, borderRadius: radii.md, backgroundColor: saving || !title.trim() || !startsAt.trim() ? colors.border : colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
                {saving ? <ActivityIndicator color={colors.onPrimary} /> : <Ionicons name="calendar-outline" size={17} color={colors.onPrimary} />}
                <Text style={[typography.bodyStrong, { color: colors.background }]}>{saving ? 'Creating…' : 'Create event'}</Text>
              </TouchableOpacity>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Choose a future date and time in your device's local timezone. Database migration 0018 is required.</Text>
            </GlassCard>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginBottom: spacing.sm }]}>Upcoming events</Text>
            {loading && events.length ? <ActivityIndicator color={colors.primary} style={{ padding: spacing.md }} /> : null}
            {error && events.length ? <View style={{ padding: spacing.md, marginBottom: spacing.sm }}><Text style={[typography.body, { color: colors.textSecondary }]}>{error}</Text><TouchableOpacity onPress={refresh} accessibilityRole="button" accessibilityLabel="Retry loading events" style={{ minHeight: 48, justifyContent: 'center' }}><Text style={[typography.bodyStrong, { color: colors.primary }]}>Try again</Text></TouchableOpacity></View> : null}
          </View>
        }
        renderItem={({ item: event }) => {
          const rsvps = event.conversation_event_rsvps || [];
          const mine = rsvps.find((r) => r.user_id === currentUserId)?.response;
          return (
            <GlassCard style={{ marginBottom: spacing.sm }} contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary, flexShrink: 1 }]}>{event.title}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>{new Date(event.starts_at).toLocaleString()}</Text>
              {event.location ? <Text style={[typography.body, { color: colors.textPrimary, flexShrink: 1 }]}>{event.location}</Text> : null}
              {event.description ? <Text style={[typography.body, { color: colors.textSecondary, flexShrink: 1, lineHeight: 21 }]}>{event.description}</Text> : null}
              <Text style={[typography.caption, { color: colors.textSecondary }]}>{rsvps.filter((r) => r.response === 'going').length} going · {rsvps.filter((r) => r.response === 'maybe').length} maybe · {rsvps.filter((r) => r.response === 'not_going').length} not going</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                {[['going', 'Going'], ['maybe', 'Maybe'], ['not_going', 'Can’t go']].map(([value, label]) => <TouchableOpacity key={value} onPress={() => respond(event, value)} accessibilityRole="button" accessibilityLabel={'RSVP ' + label} style={{ borderWidth: 1, borderColor: colors.primary, backgroundColor: mine === value ? colors.primary : 'transparent', borderRadius: radii.md, minHeight: 48, paddingVertical: spacing.sm, paddingHorizontal: spacing.md }}><Text style={[typography.caption, { color: mine === value ? colors.onPrimary : colors.primary }]}>{label}</Text></TouchableOpacity>)}
              </View>
            </GlassCard>
          );
        }}
        ListEmptyComponent={
          loading ? <ActivityIndicator color={colors.primary} style={{ padding: spacing.xl }} />
            : error ? <View style={{ padding: spacing.md }}><Text style={[typography.body, { color: colors.textSecondary }]}>{error}</Text><TouchableOpacity onPress={refresh} accessibilityRole="button" accessibilityLabel="Retry loading events" style={{ minHeight: 48, justifyContent: 'center' }}><Text style={[typography.bodyStrong, { color: colors.primary }]}>Try again</Text></TouchableOpacity></View>
            : <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.lg }]}>No upcoming events in this conversation.</Text>
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
