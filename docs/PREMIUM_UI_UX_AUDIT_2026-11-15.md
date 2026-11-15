# ZannyChat Premium UI/UX Audit — 15 November 2026

## Audit execution status

- Repository: `Zanny001/zannychat-frontend`
- Baseline: `main` (branch created: `audit/premium-ui-ux-2026-11-15`)
- Product version at baseline: `1.2.243`
- Stack: Expo SDK 57, React Native 0.86.3, React 19
- Scope priority: visual interfaces, moderate container proportions, typography, density, accessibility, responsive behavior and premium consistency.
- This is an in-progress source audit. It is not a claim that all 45 navigation experiences have received visual/device sign-off.

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
| Composer controls | Send control was 38×38 while the input field had no matching 44-point minimum. The controls looked visually underweighted relative to the composer. | Medium | Balanced to a 42×42 visual control with a 44-point input surface; existing hit-slop retained. |
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
- Keep 44-point minimum interactive targets where feasible and provide accessible labels/states.
- Do not deploy or merge this branch until tests and review are complete.
- Track every screen as incomplete until its layout, interactions, accessibility and regression behavior are verified.
