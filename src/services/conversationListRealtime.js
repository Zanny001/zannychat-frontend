/**
 * Subscribe to changes that can alter the inbox preview, unread counts, or
 * conversation ordering. Supabase Realtime applies the table's SELECT RLS
 * policies to delivered postgres_changes events.
 */
export function subscribeToConversationListEvents({ supabase, enabled = true, onChange }) {
  if (!enabled || !supabase || typeof supabase.channel !== 'function' || typeof onChange !== 'function') {
    return () => {};
  }

  const channel = supabase
    .channel('conversation-list')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'messages',
    }, onChange)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'conversation_participants',
    }, onChange)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'conversations',
    }, onChange)
    .subscribe((status) => {
      // Reconcile once the channel is live to close the fetch/subscribe race
      // on screen focus; callers can treat this like any other invalidation.
      if (status === 'SUBSCRIBED') onChange({ eventType: 'SUBSCRIBED' });
    });

  return () => {
    if (typeof supabase.removeChannel === 'function') {
      supabase.removeChannel(channel);
    }
  };
}
