import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('../screens/StatusUpdatesScreen.js', import.meta.url), 'utf8');
const service = readFileSync(new URL('../services/statusUpdates.js', import.meta.url), 'utf8');

test('status composer exposes a selected-contact audience and picker', () => {
  assert.match(screen, /value: 'selected_contacts', label: 'Selected'/);
  assert.match(screen, /Choose contacts or group members/);
  assert.match(screen, /selectedAudienceIds\.length === 0/);
});

test('text, photo and video publishing persist the selected audience recipients', () => {
  assert.match(screen, /publishPhotoStatus\(photo, normalized, audience, audienceRecipientIds, expiryHours\)/);
  assert.match(screen, /publishVideoStatus\(video, normalized, audience, audienceRecipientIds, expiryHours\)/);
  assert.match(screen, /publishTextStatus\(normalized, audience, audienceRecipientIds, expiryHours\)/);
  assert.match(service, /status_audience_recipients/);
  assert.match(service, /normalizeStatusAudience/);
});


test('selected Status audience picker supports bulk select and clear for filtered contacts', () => {
  assert.match(screen, /Select matching/);
  assert.match(screen, /Clear matching/);
  assert.match(screen, /updateSelectedAudienceIds\(old, filterEligibleStatusAudienceContacts\(filterStatusContacts\(privacyContacts, privacySearch\), excludedUsers\)\.map\(\(contact\) => contact\.id\), true\)/);
  assert.match(screen, /updateSelectedAudienceIds\(old, filterStatusContacts\(privacyContacts, privacySearch\)\.map\(\(contact\) => contact\.id\), false\)/);
});

test('selected audience picker excludes contacts blocked by Story privacy and cleans stale selections', () => {
  assert.match(screen, /filterEligibleStatusAudienceContacts/);
  assert.match(screen, /removeExcludedStatusAudienceIds/);
  assert.match(screen, /excluded by Story privacy/);
  assert.match(screen, /disabled=\{disabled\}/);
  assert.match(screen, /if \(shouldExclude\) setSelectedAudienceIds\(\(old\) => removeExcludedStatusAudienceIds\(old, latest\)\)/);
  assert.match(screen, /Promise\.all\(\[listStatusContacts\(\), listStatusExclusions\(\)\]\)/);
});

test('publishing selected-audience statuses rechecks latest contacts and exclusions before sending', () => {
  assert.match(screen, /resolveStatusPublishAudience/);
  assert.match(screen, /Promise\.all\(\[listStatusContacts\(\), listStatusExclusions\(\)\]\)/);
  assert.match(screen, /audienceRecipientIds = resolveStatusPublishAudience\(audience, selectedAudienceIds, latestContacts, latestExclusions\)/);
});
