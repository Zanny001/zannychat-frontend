import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const panel = fs.readFileSync(new URL('./LiveEconomyPanel.js', import.meta.url), 'utf8');
const native = fs.readFileSync(new URL('../screens/LiveStreamScreen.js', import.meta.url), 'utf8');
const web = fs.readFileSync(new URL('../screens/LiveStreamScreen.web.js', import.meta.url), 'utf8');
const service = fs.readFileSync(new URL('../services/liveEconomyService.js', import.meta.url), 'utf8');

test('LIVE gift UI reads server catalogue and wallet and never creates client-side Sparks', () => {
  assert.ok(panel.includes('getLiveGiftCatalog()'));
  assert.ok(panel.includes('getLiveGiftWallet()'));
  assert.ok(panel.includes('Number(wallet?.balanceSparks || 0)'));
  assert.ok(panel.includes('authorised server-side promotions'));
  assert.ok(panel.includes('no purchase, cash value, or cash-out'));
  assert.equal(panel.includes('setWallet({ balanceSparks: Number(wallet'), false);
  assert.ok(service.includes("backendFetch('/live/gifts/send'"));
  assert.ok(service.includes('idempotencyKey = createLiveGiftIdempotencyKey()'));\n  assert.ok(panel.includes('giftRequestKeysRef.current.get(requestIdentity)'));\n  assert.ok(panel.includes('giftRequestKeysRef.current.delete(requestIdentity)'));
});

test('LIVE gifts send without client-controlled battle attribution; the server decides PK scoring', () => {
  assert.ok(panel.includes("item?.joined && item?.role === 'guest'"));
  assert.ok(panel.includes('quantity: 1'));
  assert.ok(service.includes("backendFetch('/live/gifts/history?limit='"));
});

test('PK interface uses server-owned battle lifecycle and displays real server scores', () => {
  assert.ok(service.includes("'/live/battles/stream/'"));
  assert.ok(service.includes("'/live/battles/'"));
  assert.ok(service.includes("'/start'"));
  assert.ok(service.includes("'/finish'"));
  assert.ok(service.includes("'/accept'"));
  assert.ok(service.includes("'/decline'"));
  assert.ok(panel.includes('battle.score_a'));
  assert.ok(panel.includes('battle.score_b'));
  assert.ok(panel.includes('battle.canAccept'));
  assert.ok(panel.includes('battle.canStart'));
  assert.ok(panel.includes('Accept challenge'));
  assert.ok(panel.includes('Decline'));
  assert.ok(panel.includes('gift transactions'));
  assert.ok(panel.includes('Reactions do not count'));
  assert.ok(panel.includes('finishLiveBattle(battle.id)'));
});

test('translation is opt-in provider-backed text only and never fabricates microphone captions', () => {
  assert.ok(service.includes("backendFetch('/live/captions/status')"));
  assert.ok(service.includes("backendFetch('/live/captions/translate'"));
  assert.ok(panel.includes('translationStatus?.enabled'));
  assert.ok(panel.includes('Live microphone transcription is not enabled'));
  assert.ok(panel.includes('result?.translated'));
  assert.ok(panel.includes('No fake captions are shown'));
  assert.ok(panel.includes('Submitted text is sent to the configured AI provider'));
});

test('native and web LIVE rooms both expose the same gifts, PK and translation panel', () => {
  assert.ok(native.includes("import LiveEconomyPanel from '../components/LiveEconomyPanel'"));
  assert.ok(web.includes("import LiveEconomyPanel from '../components/LiveEconomyPanel'"));
  assert.ok(native.includes('onOpenEconomy={() => setEconomyOpen(true)}'));
  assert.ok(native.includes('economyOpen && <LiveEconomyPanel'));
  assert.ok(web.includes('Gifts · PK · Translate'));
  assert.ok(web.includes('economyOpen && <LiveEconomyPanel'));
});
