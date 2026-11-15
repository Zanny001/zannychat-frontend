# ZannyChat Premium UI/UX Audit — 15 November 2026

## Audit execution status

- Repository: `Zanny001/zannychat-frontend`
- Baseline: `main` (branch created: `audit/premium-ui-ux-2026-11-15`)
- Product version at baseline: `1.2.243`
- Stack: Expo SDK 57, React Native 0.86.3, React 19
- Scope priority: visual interfaces, moderate container proportions, typography, density, accessibility, responsive behavior and premium consistency.
- This is an in-progress source audit across 49 screen implementation files / approximately 45 navigation experiences. It is not a claim that all screens have received visual/device sign-off.
- The audit is being delivered in isolated, draft pull requests (#76–#83) so changes remain reviewable and no unverified UI work is merged or deployed.
- Current CI status: the premium UI/unit workflow has passed for PRs #76–#82 after correcting stale 44-point assertions; the separate native calling client workflow is still running. PR #83 validation is in progress.

## Confirmed product foundation

The repository already contains a substantial ZannyChat design system:
- Royal Neon and eight additional mood palettes, with custom Signal, Thread and Highlight colours.
- System, Light and Dark appearance, text scaling and high-contrast preferences.
- Manrope and Space Grotesk typography.
- Shared glass surfaces, theme-aware message bubbles, navigation and composer.
- Reduced-motion handling and Android 10/11 blur fallbacks.
- Existing screen-level contract tests for theme usage, header layout, chat bubble sizing, accessibility and selected touch-target behavior.

The inbox conversation row already uses a compact, accessible `Pressable` rather than a separate blurred/elevated card per conversation. This is the correct density direction and should be preserved.

## Verified findings from the first source pass

| Area | Finding | Severity | Disposition |
|---|---|---:|---|
| Message composer | The text-entry surface used a very faint border (4.5% primary text opacity) and a low-opacity surface tint, making the field visually disappear into the composer background in some themes. | Medium | Improved on this branch with a clearer theme-derived surface and border. |
| Composer controls | Send control was 38×38 while the input field had no matching 48-point minimum. The controls looked visually underweighted relative to the composer. | Medium | Balanced to a 48×48 send control and 48-point input surface; existing hit-slop retained. |
| Composer text | The multiline field used a 120-point parent maximum but no explicit text vertical alignment and could grow too tall relative to the row. | Low | Text field now caps at 96 points and vertically centers on Android. |
| Inbox density | Conversation rows are already compact and avoid nested glass cards. | Positive | Preserve; do not reintroduce card-per-row styling. |
| Shared header | Header title already has flexible width and one-line truncation; back control is at least 44 points. | Positive | Preserve existing responsive title behavior. |
| Theme foundation | Semantic theme tokens and dynamic typography exist, but theme-hook presence alone does not prove correct visual contrast, spacing or state design on each screen. | Medium | Expand screen-by-screen visual and interaction validation; do not replace the theme system. |
| Shared components | Some high-traffic screens still use legacy `TouchableOpacity` controls and screen-specific styling. A mass rewrite would risk behavior regressions. | Medium | Migrate only where a verified interaction/accessibility or visual issue exists. |
| Device validation | Source-level contracts cannot prove Android 10 rendering performance, keyboard behavior, actual safe-area spacing, tablet layouts or browser responsive appearance. | High | Keep physical-device and browser viewport QA open; do not claim release-ready based on source inspection. |

## Changes made on this branch

1. `src/components/InputBar.js`
   - Raised the composer input field to a 44-point minimum.
   - Replaced the low-contrast fill with a more legible elevated theme surface.
   - Added a restrained primary-colour outline so the typing area is visually distinct in both themes.
   - Balanced the send button to 42×42 while retaining its circular silhouette.
   - Capped multiline text growth at 96 points and set Android vertical alignment.
   - Kept all theme values dynamic; no hard-coded theme colour was introduced.

2. `src/screens/ChatScreen.contract.test.js`
   - Added a regression contract for the composer surface, dimensions and text alignment.

## Next audit sequence

1. Chats/Main: header, search, filters, story tray, list density, empty/error/loading states and bottom-tab safe area.
2. Chat: header actions, message timeline, bubble/media proportions, reply/edit states, attachment sheet, composer, keyboard and deletion states.
3. NewChat and contact discovery: search field, result rows, avatar sizing, action alignment, empty/error/loading states.
4. Forward, Saved, Drafts, Pinned, Folders and Shared Media: consistent row/card density and media preview dimensions.
5. Calls and LIVE: video stage proportions, participant tiles, floating controls, comments/reactions, moderation sheets and small-screen layout.
6. Social/community, profiles/groups, settings/security, support and authentication: continue in route order.
7. Re-run unit and release checks, then validate web and native layouts on representative viewports/devices.

## Guardrails

- Preserve route names, feature behavior, API contracts, privacy rules and existing data.
- Do not introduce new Supabase schema changes for visual-only work.
- Do not claim end-to-end encryption unless a real audited E2E protocol is implemented.
- Do not add expensive always-on blur, glow or animation to compensate for weak hierarchy.
- Use 48 dp minimum targets for Android interactive controls and 44 pt for iOS where feasible; preserve accessible labels/states and 8 dp spacing where layouts permit. WCAG 2.2 AA web pointer minimum is 24×24 CSS px; the 44×44 enhanced target remains the stricter design goal.
- Do not deploy or merge this branch until tests and review are complete.
- Track every screen as incomplete until its layout, interactions, accessibility and regression behavior are verified.

## Additional verified issue and remediation — New Chat

- The contact directory previously wrapped the entire row in one `TouchableOpacity` and placed the favorite `TouchableOpacity` inside it. Nested pressables can produce ambiguous/propagating presses, so tapping the star could also trigger the row's open-chat/share action.
- Replaced the per-contact elevated glass card with a compact 76-point row and subtle divider. The main contact action and favorite action are now sibling controls, with the favorite control retaining a 48-point target and its own accessible selected/disabled state.
- Added `src/screens/NewChatScreen.contract.test.js` to protect the row density, sibling interaction structure and favorite target size.

## Additional verified issue and remediation — Chats filters

- The Chats screen's All / Unread / Favorites / Groups / Archived chips had no explicit minimum height. Their content plus vertical padding could leave the interactive target below the 44-point baseline.
- Raised the shared filter-pill container to a 44-point minimum and centered its label without increasing horizontal density.
- Added `src/screens/ChatListScreen.contract.test.js` to protect touch height and selected-state accessibility.

## Additional verified issues and remediation — Chats header and search

- The camera, drafts and new-chat header controls were 40×40, 40×40 and 34×34 respectively. These are visually compact but undersized as standalone touch targets.
- Standardized the three controls to 44×44, increased the search surface to a balanced 48-point minimum, and gave the Moments “See all” action a 48-point interaction height.
- Extended the Chats layout contract to protect these dimensions.

## Additional responsive finding and remediation — New Chat quick actions

- The Find friends, Scan QR and New group shortcuts shared a fixed, non-wrapping horizontal row. Their combined intrinsic widths could exceed the available content width on smaller phones.
- Enabled wrapping and gave each action a consistent flexible basis, with a 44-point minimum content height. This preserves the quick-action hierarchy while allowing the third action to move to a second row when necessary.
- Added a narrow-screen layout contract.

## Expanded screen audit — messaging collections and shared media

- Saved Messages and Pinned Messages had clear-search, remove/unpin and open-message actions with inconsistent or implicit hit regions. These are now normalized to 48-point targets; excessive empty-state vertical padding is reduced from 72 to 48 points without removing explanatory content.
- Draft deletion and continuation actions now have explicit minimum dimensions. Forward-recipient rows have a consistent moderate 64-point card height. Chat Folder choices, inputs, save/cancel and edit/delete actions use 48-point baselines.
- Shared Media tabs and retry actions now use 48-point targets. The photo grid remains two-column and aspect-ratio constrained rather than stretching into oversized media cards.
- Regression contracts are included in PR #77.

## Expanded screen audit — calls and LIVE

- LIVE Hub controls previously mixed 38, 42 and 44-point dimensions. Primary profile/refresh, invite, replay and filter actions now use 48-point targets.
- Native LIVE top-bar, camera/microphone and reaction controls and web LIVE action/moderation controls now have consistent 48-point hit areas.
- The main LIVE stage remains capped at 560×315 (16:9); group-call tiles remain bounded, including the web 9:16 participant tile cap of 330 points. The audit intentionally avoids making the video stage wider/taller merely to enlarge controls.
- Call-screen add-participant controls are now 48×48. Audio/video call controls and participant tile sizing remain unchanged.
- Regression contracts are included in PR #78.

## Expanded screen audit — community, Stories, events and polls

- Channels/community feed buttons, reaction chips, moderation actions, post actions and directory filters now use 48-point minimums. Quick-emoji controls have larger hit regions while retaining compact visual icons.
- Status/Stories publishing, audience selection, status navigation, reaction, privacy and reply actions now use 48-point targets. Icon-only delete/mute actions now have explicit hit areas.
- Event and poll fields, RSVP/vote actions, retries, multi-select controls and pagination actions now use 48-point minimums.
- Shared touch-target regression logic now counts controls at 44 points or larger, so increasing a control to 48 no longer causes a false test failure.
- Regression contracts are included in PRs #79 and #80.

## Expanded screen audit — profiles, utility flows and shared components

- Own-profile actions, profile save/preview controls and peer full-size-photo close control now use 48-point targets (PR #81).
- Call History previously used 34×34 audio redial, video redial and delete buttons plus a 42×42 refresh button. These are now 48×48 while preserving all three actions; retry and other utility/group controls are normalized to 48 points (PR #82).
- Shared Header back, chat media save/play, Action Sheet reaction and Call Invite Picker close/search/invite controls are now 48-point targets. Action Sheet reactions wrap on narrow screens instead of forcing a horizontal overflow (PR #83).
- The design system itself is retained: theme palettes, dynamic typography, glass surfaces, reduced-motion and platform blur fallbacks are not being replaced with hard-coded one-off styling.

## Remaining audit and release gates

1. Complete CI on all draft branches, including Android compile-only, iOS prebuild/CallKit patch verification, web/Android exports, unit, call-recovery, release, contract and integrity checks.
2. Reconcile/merge the isolated PRs only after their required checks are green and there are no overlapping/conflicting changes.
3. Run representative visual QA at 320, 360, 390, 430 and tablet widths, plus web desktop/mobile widths. Validate keyboard/safe-area behavior, long names, large text, RTL where supported, and reduced motion.
4. Test on a real Android device (including Android 10/11 blur fallback) and a supported iOS device; verify camera/mic permissions, audio route, call invite, media save, LIVE guest controls, status reactions, and profile image upload.
5. Verify production deployment/preview domains and backend connectivity only after merge approval. No production deployment has been performed as part of this source audit.

