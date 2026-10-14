import React, { useEffect, useRef, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { createConversation, fetchContactById, getCurrentUser } from '../services/api';
import { BACKEND_ENABLED } from '../services/backendClient';
import { SUPABASE_ENABLED } from '../services/supabaseClient';
import { buildContactQr, parseContactQr } from '../utils/contactQr';

export default function QRContactScreen({ navigation }) {
  const { colors, spacing, typography, radii } = useTheme();
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const handledRef = useRef(false);
  const liveReady = SUPABASE_ENABLED && BACKEND_ENABLED;

  useEffect(() => {
    let mounted = true;
    getCurrentUser().then((value) => { if (mounted) setUser(value); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoadingUser(false); });
    return () => { mounted = false; };
  }, []);

  async function beginScan() {
    if (!liveReady) {
      Alert.alert('Live account required', 'QR contact discovery needs a connected Supabase account and ZannyChat backend.');
      return;
    }
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Camera access needed', 'Allow camera access to scan a ZannyChat contact QR code.');
        return;
      }
    }
    handledRef.current = false;
    setScanning(true);
  }

  async function handleBarcode({ data }) {
    if (handledRef.current || processing) return;
    handledRef.current = true;
    setProcessing(true);
    setScanning(false);
    try {
      const userId = parseContactQr(data);
      if (!userId) throw new Error('This QR code is not a ZannyChat contact code.');
      const contact = await fetchContactById(userId);
      const conversation = await createConversation(contact.id, contact);
      navigation.replace('Chat', { conversation });
    } catch (error) {
      Alert.alert('Could not add contact', error.message || 'Try scanning a ZannyChat contact QR code.');
      setProcessing(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Connect by QR" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, alignItems: 'center' }}>
        <Text style={[typography.heading, { color: colors.textPrimary, alignSelf: 'flex-start', marginBottom: spacing.xs }]}>Your contact QR</Text>
        <Text style={[typography.caption, { color: colors.textSecondary, alignSelf: 'flex-start', marginBottom: spacing.md, lineHeight: 20 }]}>Let someone scan this code to start a chat. Only your public profile ID is encoded; never share a recovery link or session token.</Text>
        <GlassCard style={{ width: '100%', alignItems: 'center', marginBottom: spacing.lg }}>
          {liveReady && user?.id ? (
            <View style={styles.qrWrap}><QRCode value={buildContactQr(user.id)} size={208} backgroundColor="#FFFFFF" color="#15111C" /></View>
          ) : (
            <View style={[styles.unavailable, { borderColor: colors.border }]}>
              <Ionicons name="qr-code-outline" size={32} color={colors.textSecondary} />
              <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }]}>{loadingUser ? 'Loading account…' : 'Connect a live account and backend to create your QR code.'}</Text>
            </View>
          )}
          <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginTop: spacing.md }]}>{user?.name || 'Your ZannyChat profile'}</Text>
        </GlassCard>

        <GlassCard style={{ width: '100%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
            <Ionicons name="scan-outline" size={20} color={colors.accent} />
            <Text style={[typography.heading, { color: colors.textPrimary, marginLeft: spacing.sm }]}>Scan a contact</Text>
          </View>
          {scanning ? (
            <View style={styles.cameraFrame}>
              <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={handleBarcode} />
              <View pointerEvents="none" style={styles.scanGuide} />
            </View>
          ) : (
            <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.md }]}>{liveReady ? 'Scan a QR code generated from another ZannyChat profile.' : 'Scanning is available when a live account and backend are configured.'}</Text>
          )}
          <TouchableOpacity
            onPress={() => { if (scanning) setScanning(false); else beginScan(); }}
            disabled={processing || loadingUser}
            accessibilityRole="button"
            accessibilityLabel={scanning ? 'Stop scanning' : 'Scan a contact QR code'}
            accessibilityState={{ disabled: processing || loadingUser, busy: processing }}
            style={[styles.actionButton, { backgroundColor: colors.primary, borderRadius: radii.pill, opacity: processing || loadingUser ? 0.55 : 1 }]}
          >
            <Text style={[typography.bodyStrong, { color: '#FFFFFF' }]}>{processing ? 'Connecting…' : scanning ? 'Stop scanning' : 'Open camera scanner'}</Text>
          </TouchableOpacity>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  qrWrap: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 16 },
  unavailable: { minHeight: 232, width: '100%', borderWidth: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center', padding: 24 },
  cameraFrame: { width: '100%', height: 300, borderRadius: 14, overflow: 'hidden', marginBottom: 14 },
  scanGuide: { position: 'absolute', width: 190, height: 190, borderWidth: 3, borderColor: '#FFFFFF', borderRadius: 20, alignSelf: 'center', top: 55 },
  actionButton: { paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
});
