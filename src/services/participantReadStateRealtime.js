/**
 * Subscribe to read-cursor changes for one conversation. Realtime publication
 * and RLS decide which participant rows the authenticated user may receive.
 */
export function subscribeToParticipantReadState({
  supabase,
  enabled = true,
  conversationId,
  onUpdate,
  onSubscribed,
}) {
  if (!enabled || !supabase || typeof supabase.channel !== 'function' ||
      typeof conversationId !== 'string' || !conversationId ||
      typeof onUpdate !== 'function') {
    return () => {};
  }

  let active = true;
  const channel = supabase
    .channel(`participant-read-state:${conversationId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'conversation_participants',
      filter: `conversation_id=eq.${conversationId}`,
    }, (payload) => {
      if (!active) return;
      const row = payload?.new;
      if (!row?.user_id) return;
      onUpdate({ user_id: row.user_id, last_read_at: row.last_read_at ?? null });
    })
    .subscribe((status) => {
      if (active && status === 'SUBSCRIBED') onSubscribed?.();
    });

  return () => {
    active = false;
    if (typeof supabase.removeChannel === 'function') supabase.removeChannel(channel);
  };
}
