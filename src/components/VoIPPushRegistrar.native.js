import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { supabase, SUPABASE_ENABLED } from '../services/supabaseClient';
import { registerCallVoipToken } from '../services/calls';
import { setActiveVoipPushToken } from '../services/voipPushTokenState';

function NativeVoIPRegistrar() {
  const { registerVoIPPush, useVoIPPushToken } = require('expo-callkit-telecom');
  const token = useVoIPPushToken();

  useEffect(() => {
    setActiveVoipPushToken(token?.token || null);
    return () => setActiveVoipPushToken(null);
  }, [token?.token]);

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

  // Standard APNs alert token is separate from the PushKit VoIP token.
  // It provides a visible fallback call-ended notification when iOS has
  // terminated the app; it does not claim to dismiss an existing CallKit UI.
  useEffect(() => {
    if (Platform.OS !== 'ios' || !SUPABASE_ENABLED || !supabase) return undefined;
    let active = true;
    const syncAlertToken = async (session) => {
      if (!active || !session?.user?.id) return;
      try {
        const deviceToken = await Notifications.getDevicePushTokenAsync();
        if (active && deviceToken?.data) {
          await registerCallVoipToken(String(deviceToken.data), 'APNS_ALERT');
        }
      } catch (error) {
        console.warn('[calls] standard APNs alert registration pending:', error?.message || error);
      }
    };
    supabase.auth.getSession().then(({ data }) => syncAlertToken(data?.session)).catch(() => {});
    const { data } = supabase.auth.onAuthStateChange((_event, session) => syncAlertToken(session));
    return () => {
      active = false;
      data?.subscription?.unsubscribe();
    };
  }, []);

  return null;
}

export default function VoIPPushRegistrar() {
  if (!requireOptionalNativeModule('ExpoCallKitTelecom')) return null;
  return <NativeVoIPRegistrar />;
}
