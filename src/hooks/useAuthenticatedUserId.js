import { useEffect, useRef, useState } from 'react';
import { getCurrentUser } from '../services/api';
import { supabase, SUPABASE_ENABLED } from '../services/supabaseClient';

// Shared owner lifecycle for account-scoped local collections. INITIAL_SESSION
// establishes the first owner; subsequent auth events synchronously invalidate
// the previous account before screen-level requests can publish stale data.
export function useAuthenticatedUserId(onChange) {
  const [userId, setUserId] = useState(null);
  const userIdRef = useRef(undefined);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let active = true;
    const applyUserId = (nextUserId) => {
      const previousUserId = userIdRef.current;
      if (previousUserId === undefined) {
        userIdRef.current = nextUserId;
        setUserId(nextUserId);
        return;
      }
      if (previousUserId === nextUserId) return;
      userIdRef.current = nextUserId;
      setUserId(nextUserId);
      onChangeRef.current?.(nextUserId, previousUserId);
    };

    if (SUPABASE_ENABLED && supabase?.auth?.onAuthStateChange) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        applyUserId(session?.user?.id || null);
      });
      return () => data?.subscription?.unsubscribe?.();
    }

    getCurrentUser().then((user) => {
      if (active) applyUserId(user?.id || 'me');
    }).catch(() => {
      if (active) applyUserId('me');
    });
    return () => { active = false; };
  }, []);

  return { userId, userIdRef };
}
