import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import {
  acceptLiveBattle,
  createLiveBattle,
  createLiveGiftIdempotencyKey,
  declineLiveBattle,
  finishLiveBattle,
  getCurrentLiveBattle,
  getLiveBattle,
  getLiveGiftCatalog,
  getLiveGiftHistory,
  getLiveGiftWallet,
  getLiveTranslationStatus,
  sendLiveGift,
  startLiveBattle,
  translateLiveTextSegment,
} from '../services/liveEconomyService';
import { backendFetch } from '../services/backendClient';

function PanelAction({ label, onPress, disabled = false, selected = false, colors, tone = 'primary' }) {
  const backgroundColor = tone === 'danger'
    ? 'rgba(255,90,120,0.14)'
    : selected ? 'rgba(157,120,255,0.28)' : 'rgba(255,255,255,0.07)';
  const borderColor = tone === 'danger' ? 'rgba(255,120,145,0.48)' : selected ? '#A88AFF' : 'rgba(255,255,255,0.16)';
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled, selected }}
      style={{ minHeight: 42, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor, backgroundColor, opacity: disabled ? 0.45 : 1 }}>
      <Text style={{ color: tone === 'danger' ? '#FFB3C2' : colors.textPrimary, fontSize: 11, fontWeight: '800', textAlign: 'center' }}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function LiveEconomyPanel({ streamId, creatorId, creatorMode, onClose }) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [giftBusy, setGiftBusy] = useState(false);
  const [battleBusy, setBattleBusy] = useState(false);
  const [translationBusy, setTranslationBusy] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [history, setHistory] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [battle, setBattle] = useState(null);
  const [translationStatus, setTranslationStatus] = useState(null);
  const [recipientId, setRecipientId] = useState(creatorMode ? '' : (creatorId || ''));
  const [opponentId, setOpponentId] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(300);
  const [sourceText, setSourceText] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [translatedText, setTranslatedText] = useState('');
  const [notice, setNotice] = useState('');
  const giftRequestKeysRef = useRef(new Map());
  const [battleClock, setBattleClock] = useState(Date.now());

  const refreshBattle = useCallback(async () => {
    try {
      const result = await getCurrentLiveBattle(streamId);
      setBattle(result?.battle || null);
    } catch (error) {
      setNotice((current) => current || (error?.message || 'PK battle status is unavailable.'));
    }
  }, [streamId]);

  const loadPanel = useCallback(async () => {
    setLoading(true);
    const [gifts, balance, ledger, translation, currentBattle, stage] = await Promise.allSettled([
      getLiveGiftCatalog(),
      getLiveGiftWallet(),
      getLiveGiftHistory(12),
      getLiveTranslationStatus(),
      getCurrentLiveBattle(streamId),
      creatorMode ? backendFetch('/live/' + encodeURIComponent(streamId) + '/participants') : Promise.resolve({ participants: [] }),
    ]);
    if (gifts.status === 'fulfilled') setCatalog(Array.isArray(gifts.value?.gifts) ? gifts.value.gifts : []);
    if (balance.status === 'fulfilled') setWallet(balance.value);
    if (ledger.status === 'fulfilled') setHistory(Array.isArray(ledger.value?.entries) ? ledger.value.entries : []);
    if (translation.status === 'fulfilled') setTranslationStatus(translation.value);
    if (currentBattle.status === 'fulfilled') setBattle(currentBattle.value?.battle || null);
    if (stage.status === 'fulfilled') setParticipants(Array.isArray(stage.value?.participants) ? stage.value.participants : []);
    const failed = [gifts, balance, ledger, translation, currentBattle].find((result) => result.status === 'rejected');
    if (failed) setNotice(failed.reason?.message || 'Some LIVE tools could not be loaded. Retry when the server is available.');
    setLoading(false);
  }, [streamId, creatorMode]);

  useEffect(() => {
    loadPanel();
    const timer = setInterval(refreshBattle, 5000);
    return () => clearInterval(timer);
  }, [loadPanel, refreshBattle]);

  useEffect(() => {
    const clock = setInterval(() => setBattleClock(Date.now()), 1000);
    return () => clearInterval(clock);
  }, []);

  const guestRecipients = useMemo(() => participants
    .filter((item) => item?.joined && item?.role === 'guest' && typeof item?.userId === 'string')
    .map((item) => ({ id: item.userId, name: item.name || 'LIVE guest' })), [participants]);
  const recipients = creatorMode ? guestRecipients : (creatorId ? [{ id: creatorId, name: 'LIVE creator' }] : []);
  const selectedRecipientId = recipients.some((item) => item.id === recipientId) ? recipientId : (recipients[0]?.id || '');
  const opponents = guestRecipients;
  const selectedBattleOpponentId = opponents.some((item) => item.id === opponentId) ? opponentId : (opponents[0]?.id || '');

  const handleSendGift = async (gift) => {
    if (!selectedRecipientId || giftBusy) return;
    setGiftBusy(true);
    setNotice('');
    const requestIdentity = streamId + ':' + selectedRecipientId + ':' + gift.gift_id;
    if (!giftRequestKeysRef.current.has(requestIdentity)) {
      giftRequestKeysRef.current.set(requestIdentity, createLiveGiftIdempotencyKey());
    }
    try {
      const result = await sendLiveGift({
        streamId,
        recipientId: selectedRecipientId,
        giftId: gift.gift_id,
        quantity: 1,
        idempotencyKey: giftRequestKeysRef.current.get(requestIdentity),
      });
      giftRequestKeysRef.current.delete(requestIdentity);
      setWallet((current) => ({ ...(current || {}), balanceSparks: result.balanceSparks }));
      setNotice('Sent ' + gift.display_name + ' · +' + gift.scorePoints + ' PK points when a battle is active.');
      try {
        const [nextWallet, nextHistory] = await Promise.all([getLiveGiftWallet(), getLiveGiftHistory(12)]);
        setWallet(nextWallet);
        setHistory(Array.isArray(nextHistory?.entries) ? nextHistory.entries : []);
      } catch (refreshError) {
        setNotice('Gift sent successfully. Your updated balance and history will refresh when the service responds.');
      }
      if (battle?.status === 'live') await refreshBattle();
    } catch (error) {
      setNotice(error?.message || 'The gift could not be sent. Your balance was not changed.');
    } finally {
      setGiftBusy(false);
    }
  };

  const handleCreateBattle = async () => {
    if (!selectedBattleOpponentId || battleBusy) return;
    setBattleBusy(true);
    setNotice('');
    try {
      const created = await createLiveBattle({ streamId, opponentId: selectedBattleOpponentId, durationSeconds });
      const battleId = created?.battleId;
      if (!battleId) throw new Error('The server did not return a PK battle id.');
      setNotice('PK challenge sent. The stage guest must accept before the host can start.');
      const latest = await getLiveBattle(battleId);
      setBattle(latest?.battle || { id: battleId, status: 'pending' });
    } catch (error) {
      setNotice(error?.message || 'Could not create the PK battle.');
    } finally {
      setBattleBusy(false);
    }
  };

  const handleAcceptBattle = async () => {
    if (!battle?.id || battleBusy) return;
    setBattleBusy(true);
    try {
      const result = await acceptLiveBattle(battle.id);
      setBattle(result?.battle || battle);
      setNotice(result?.battle?.status === 'cancelled' ? 'This PK challenge expired or the LIVE ended.' : 'PK challenge accepted. The host can now start the match.');
    } catch (error) {
      setNotice(error?.message || 'Could not accept the PK challenge.');
    } finally {
      setBattleBusy(false);
    }
  };

  const handleDeclineBattle = async () => {
    if (!battle?.id || battleBusy) return;
    setBattleBusy(true);
    try {
      const result = await declineLiveBattle(battle.id);
      setBattle(result?.battle || battle);
      setNotice('PK challenge declined.');
    } catch (error) {
      setNotice(error?.message || 'Could not decline the PK challenge.');
    } finally {
      setBattleBusy(false);
    }
  };

  const handleStartBattle = async () => {
    if (!battle?.id || battleBusy) return;
    setBattleBusy(true);
    try {
      const result = await startLiveBattle(battle.id);
      setBattle(result?.battle || battle);
    } catch (error) {
      setNotice(error?.message || 'Could not start the PK battle.');
    } finally {
      setBattleBusy(false);
    }
  };

  const handleFinishBattle = async () => {
    if (!battle?.id || battleBusy) return;
    setBattleBusy(true);
    try {
      const result = await finishLiveBattle(battle.id);
      setBattle(result?.battle || battle);
    } catch (error) {
      setNotice(error?.message || 'Could not finish the PK battle.');
    } finally {
      setBattleBusy(false);
    }
  };

  const handleTranslate = async () => {
    if (!sourceText.trim() || !targetLanguage.trim() || translationBusy) return;
    setTranslationBusy(true);
    setTranslatedText('');
    setNotice('');
    try {
      const result = await translateLiveTextSegment({ streamId, text: sourceText.trim(), targetLanguage: targetLanguage.trim() });
      setTranslatedText(result?.translated || '');
      if (!result?.translated) setNotice('The translation provider returned no text for this segment.');
    } catch (error) {
      setNotice(error?.message || 'Translation is unavailable right now.');
    } finally {
      setTranslationBusy(false);
    }
  };

  const opponentName = guestRecipients.find((item) => item.id === battle?.creator_b_id)?.name || 'Stage guest';
  const winnerLabel = !battle?.winner_id ? 'Tie · no winner' : battle.winner_id === battle.creator_a_id ? 'Host wins' : opponentName + ' wins';
  const battleSecondsRemaining = battle?.ends_at ? Math.max(0, Math.ceil((Date.parse(battle.ends_at) - battleClock) / 1000)) : null;
  const battleCountdown = battleSecondsRemaining === null ? '' : String(Math.floor(battleSecondsRemaining / 60)).padStart(2, '0') + ':' + String(battleSecondsRemaining % 60).padStart(2, '0');

  return (
    <View style={{ position: 'absolute', zIndex: 50, top: 82, left: 14, right: 14, bottom: 88, maxWidth: 430, alignSelf: 'flex-end', padding: 14, borderRadius: 22, backgroundColor: 'rgba(10,10,24,0.98)', borderWidth: 1, borderColor: 'rgba(168,138,255,0.48)' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#F5F0FF', fontSize: 16, fontWeight: '900' }}>Crown Aurora · LIVE tools</Text>
          <Text style={{ color: '#BEB4D7', fontSize: 10, marginTop: 3 }}>Gifts · PK arena · translation</Text>
        </View>
        <PanelAction label="Close" onPress={onClose} colors={colors} />
      </View>
      {loading ? <View style={{ padding: 24, alignItems: 'center' }}><ActivityIndicator color="#B89BFF" /><Text style={{ color: '#D7CFF0', marginTop: 8, fontSize: 11 }}>Connecting to LIVE services…</Text></View> : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12, paddingBottom: 12 }}>
          <View style={{ padding: 12, borderRadius: 16, backgroundColor: 'rgba(150,120,255,0.12)', borderWidth: 1, borderColor: 'rgba(180,155,255,0.24)' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: '#F6F1FF', fontSize: 13, fontWeight: '900' }}>Gift studio</Text>
              <Text style={{ color: '#DCCBFF', fontSize: 12, fontWeight: '900' }}>{Number(wallet?.balanceSparks || 0).toLocaleString()} Sparks</Text>
            </View>
            <Text style={{ color: '#BEB4D7', fontSize: 10, marginTop: 4 }}>Promotional credits only · no purchase, cash value, or cash-out</Text>
            {recipients.length > 1 ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 }}>
              {recipients.map((item) => <PanelAction key={item.id} label={'To ' + item.name} selected={selectedRecipientId === item.id} onPress={() => setRecipientId(item.id)} colors={colors} />)}
            </View> : <Text style={{ color: '#D8D0EA', fontSize: 10, marginTop: 8 }}>{recipients[0] ? 'Recipient: ' + recipients[0].name : creatorMode ? 'Invite and admit a guest before sending stage gifts.' : 'Creator recipient is unavailable.'}</Text>}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
              {catalog.map((gift) => <TouchableOpacity key={gift.gift_id} onPress={() => handleSendGift(gift)} disabled={giftBusy || !selectedRecipientId || Number(wallet?.balanceSparks || 0) < Number(gift.spark_cost)}
                accessibilityRole="button" accessibilityLabel={'Send ' + gift.display_name + ' for ' + gift.spark_cost + ' Sparks'}
                style={{ minWidth: 84, flexGrow: 1, padding: 10, borderRadius: 13, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)', opacity: giftBusy || !selectedRecipientId || Number(wallet?.balanceSparks || 0) < Number(gift.spark_cost) ? 0.42 : 1 }}>
                <Text style={{ fontSize: 22 }}>{gift.emoji}</Text>
                <Text style={{ color: '#F4F0FF', fontSize: 10, fontWeight: '800', marginTop: 3 }}>{gift.display_name}</Text>
                <Text style={{ color: '#CBB9FF', fontSize: 10 }}>{gift.spark_cost} Sparks</Text>
              </TouchableOpacity>)}
              {!catalog.length ? <Text style={{ color: '#D8D0EA', fontSize: 11 }}>Gift catalogue unavailable until the LIVE economy service is deployed.</Text> : null}
            </View>
            {wallet?.balanceSparks === 0 ? <Text style={{ color: '#E4D8FF', fontSize: 10, marginTop: 8 }}>Your balance is zero. Sparks are only added through authorised server-side promotions; there is no purchase or top-up screen.</Text> : null}
          </View>

          <View style={{ padding: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.045)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
            <Text style={{ color: '#F6F1FF', fontSize: 13, fontWeight: '900' }}>PK arena</Text>
            <Text style={{ color: '#BEB4D7', fontSize: 10, marginTop: 4 }}>Scores come only from committed gifts sent to either battle participant. Reactions do not count.</Text>
            {battle ? <View style={{ marginTop: 9, padding: 10, borderRadius: 12, backgroundColor: 'rgba(135,100,255,0.12)' }}>
              <Text style={{ color: '#F4EEFF', fontWeight: '900', fontSize: 11 }}>{battle.status === 'live' ? 'LIVE BATTLE' : battle.status === 'ended' ? 'BATTLE RESULT' : battle.status === 'accepted' ? 'CHALLENGE ACCEPTED' : battle.status === 'cancelled' ? 'CHALLENGE CLOSED' : 'CHALLENGE PENDING'}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 }}>
                <View style={{ flex: 1 }}><Text style={{ color: '#C9B9FF', fontSize: 10 }}>HOST</Text><Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '900' }}>{Number(battle.score_a || 0).toLocaleString()}</Text></View>
                <Text style={{ color: '#C9B9FF', fontSize: 15, fontWeight: '900', alignSelf: 'center' }}>VS</Text>
                <View style={{ flex: 1, alignItems: 'flex-end' }}><Text style={{ color: '#C9B9FF', fontSize: 10 }}>{opponentName.toUpperCase()}</Text><Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '900' }}>{Number(battle.score_b || 0).toLocaleString()}</Text></View>
              </View>
              {battle.status === 'ended' ? <Text style={{ color: '#E5D9FF', fontSize: 11, fontWeight: '800', marginTop: 6 }}>{winnerLabel}</Text> : null}
              {battle.status === 'live' && battle.ends_at ? <Text accessibilityRole="timer" style={{ color: battleSecondsRemaining === 0 ? '#FFB3C2' : '#CBB9FF', fontSize: 11, fontWeight: '900', marginTop: 5 }}>TIME LEFT · {battleCountdown}</Text> : null}
              {battle.status === 'pending' && battle.canAccept ? <View style={{ flexDirection: 'row', gap: 7, marginTop: 8 }}><PanelAction label={battleBusy ? 'Please wait…' : 'Accept challenge'} onPress={handleAcceptBattle} disabled={battleBusy} colors={colors} /><PanelAction label="Decline" tone="danger" onPress={handleDeclineBattle} disabled={battleBusy} colors={colors} /></View> : null}
              {battle.status === 'pending' && !battle.canAccept ? <Text style={{ color: '#D8D0EA', fontSize: 10, marginTop: 7 }}>Waiting for the invited stage guest to accept or decline.</Text> : null}
              {battle.status === 'accepted' && battle.canStart ? <PanelAction label={battleBusy ? 'Starting…' : 'Start battle'} onPress={handleStartBattle} disabled={battleBusy} colors={colors} /> : null}
              {battle.status === 'accepted' && !battle.canStart ? <Text style={{ color: '#D8D0EA', fontSize: 10, marginTop: 7 }}>Challenge accepted. Waiting for the host to start.</Text> : null}
              {battle.status === 'live' && creatorMode ? <PanelAction label="End battle" tone="danger" onPress={handleFinishBattle} disabled={battleBusy} colors={colors} /> : null}
              {['ended', 'cancelled'].includes(battle.status) && creatorMode ? <PanelAction label="Start another PK battle" onPress={() => setBattle(null)} colors={colors} /> : null}
            </View> : creatorMode ? <>
              <Text style={{ color: '#D8D0EA', fontSize: 10, marginTop: 8 }}>{opponents.length ? 'Choose an approved guest already on your stage.' : 'PK requires an approved guest publisher on the same LIVE stage.'}</Text>
              {opponents.map((item) => <PanelAction key={item.id} label={'Challenge ' + item.name} selected={selectedBattleOpponentId === item.id} onPress={() => setOpponentId(item.id)} colors={colors} />)}
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 7 }}>
                {[60, 300, 600, 900].map((seconds) => <PanelAction key={seconds} label={seconds / 60 + ' min'} selected={durationSeconds === seconds} onPress={() => setDurationSeconds(seconds)} colors={colors} />)}
              </View>
              <PanelAction label={battleBusy ? 'Sending…' : 'Send PK challenge'} onPress={handleCreateBattle} disabled={battleBusy || !selectedBattleOpponentId || !opponents.length} colors={colors} />
            </> : <Text style={{ color: '#D8D0EA', fontSize: 10, marginTop: 8 }}>The creator can start a PK battle with an approved guest on this stage.</Text>}
          </View>

          <View style={{ padding: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.045)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
            <Text style={{ color: '#F6F1FF', fontSize: 13, fontWeight: '900' }}>Translation</Text>
            <Text style={{ color: '#BEB4D7', fontSize: 10, marginTop: 4 }}>On-demand translation of text you provide. Submitted text is sent to the configured AI provider; avoid sensitive details. Live microphone transcription is not enabled.</Text>
            <TextInput value={targetLanguage} onChangeText={setTargetLanguage} placeholder="Target language" placeholderTextColor="#948AA8" accessibilityLabel="Translation target language"
              style={{ color: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 10, paddingVertical: 9, marginTop: 8 }} />
            <TextInput value={sourceText} onChangeText={setSourceText} multiline maxLength={1800} placeholder="Paste or type a transcript segment to translate…" placeholderTextColor="#948AA8" accessibilityLabel="Transcript text segment to translate"
              style={{ minHeight: 76, textAlignVertical: 'top', color: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 10, paddingVertical: 9, marginTop: 8 }} />
            <PanelAction label={translationBusy ? 'Translating…' : translationStatus?.enabled ? 'Translate text segment' : 'Translation unavailable'} onPress={handleTranslate} disabled={!translationStatus?.enabled || translationBusy || !sourceText.trim() || !targetLanguage.trim()} colors={colors} />
            {!translationStatus?.enabled ? <Text style={{ color: '#E4D8FF', fontSize: 10, marginTop: 7 }}>Provider-backed translation is disabled until the operator enables it and configures a provider. No fake captions are shown.</Text> : null}
            {translatedText ? <View style={{ padding: 10, borderRadius: 11, backgroundColor: 'rgba(110,225,205,0.08)', marginTop: 8 }}><Text style={{ color: '#B5F1E4', fontSize: 9, fontWeight: '900' }}>PROVIDER TRANSLATION · {targetLanguage.toUpperCase()}</Text><Text style={{ color: '#FFFFFF', fontSize: 12, marginTop: 5 }}>{translatedText}</Text></View> : null}
          </View>

          {history.length ? <View style={{ padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.035)' }}>
            <Text style={{ color: '#F6F1FF', fontSize: 12, fontWeight: '900' }}>Recent Sparks activity</Text>
            {history.slice(0, 6).map((entry) => <View key={entry.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
              <Text style={{ color: '#BEB4D7', fontSize: 10 }}>{entry.entry_type} · {entry.note || entry.reference_type || 'LIVE'}</Text>
              <Text style={{ color: '#E9E0FF', fontSize: 10, fontWeight: '800' }}>{entry.entry_type === 'spend' ? '−' : '+'}{entry.amount_sparks} Sparks</Text>
            </View>)}
          </View> : null}
          {notice ? <Text accessibilityRole="status" style={{ color: '#E6D8FF', fontSize: 11, padding: 8, borderRadius: 10, backgroundColor: 'rgba(150,120,255,0.12)' }}>{notice}</Text> : null}
        </ScrollView>
      )}
    </View>
  );
}
