import React, { useEffect } from 'react';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { supabase, SUPABASE_ENABLED } from '../services/supabaseClient';
import { registerCallVoipToken } from '../services/calls';

function NativeVoIPRegistrar() {
  const { registerVoIPPush, useVoIPPushToken } = require('expo-callkit-telecom');
  const token = useVoIPPushToken();

  useEffect(() => {
    try { registerVoIPPush(); }
    catch (error) { console.warn('[calls] native VoIP registration unavailable:', error?.message || error); }
  }, []);

  useEffect(() => {
    if (!SUPABASE_ENABLED || !supabase || !token?.token) return undefined;
    let active = true;
    const syncToken = async (session) => {
      if (!active || !session?.user?.id) return;
      try {
        await registerCallVoipToken(token.token, token.type);
      } catch (error) {
        console.warn('[calls] VoIP token registration pending:', error?.message || error);
      }
    };
    supabase.auth.getSession().then(({ data }) => syncToken(data?.session)).catch(() => {});
    const { data } = supabase.auth.onAuthStateChange((_event, session) => syncToken(session));
    return () => {
      active = false;
      data?.subscription?.unsubscribe();
    };
  }, [token?.token, token?.type]);

  return null;
}

export default function VoIPPushRegistrar() {
  if (!requireOptionalNativeModule('ExpoCallKitTelecom')) return null;
  return <NativeVoIPRegistrar />;
}
