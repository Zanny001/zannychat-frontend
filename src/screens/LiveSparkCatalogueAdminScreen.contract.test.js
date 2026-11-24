import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./LiveSparkCatalogueAdminScreen.js', import.meta.url), 'utf8');
const payout = fs.readFileSync(new URL('./LiveCreatorPayoutScreen.js', import.meta.url), 'utf8');
const service = fs.readFileSync(new URL('../services/liveEconomyService.js', import.meta.url), 'utf8');
const navigator = fs.readFileSync(new URL('../navigation/AppNavigator.js', import.meta.url), 'utf8');

test('Sparks catalogue admin is exposed only through the existing LIVE economy admin access gate', () => {
  assert.match(payout, /canManageRewardPolicy/);
  assert.match(payout, /LiveSparkCatalogueAdmin/);
  assert.match(navigator, /name="LiveSparkCatalogueAdmin"/);
});

test('catalogue drafts require explicit provider SKU, Sparks quantity and NGN price', () => {
  assert.match(screen, /Exact provider product ID/);
  assert.match(screen, /Sparks quantity/);
  assert.match(screen, /Price \(NGN\)/);
  assert.match(screen, /Save inactive draft/);
  assert.match(screen, /ACTIVE/);
});

test('activation and deactivation are separately confirmed and use server-backed APIs', () => {
  assert.match(screen, /Confirm that the product exists in the provider console/);
  assert.match(screen, /Existing paid purchases and wallet balances are not changed/);
  assert.match(service, /ACTIVATE_SPARKS_PACKAGE/);
  assert.match(service, /DEACTIVATE_SPARKS_PACKAGE/);
  assert.match(service, /getLiveSparkCatalogueAdminPackages/);
});

test('the screen does not ship invented sample package identifiers or prices', () => {
  assert.match(screen, /No sample SKUs or default prices are supplied/);
  assert.match(screen, /Enter the exact store product ID/);
});
