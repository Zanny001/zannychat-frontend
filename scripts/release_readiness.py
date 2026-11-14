#!/usr/bin/env python3
"""Offline release gate for ZannyChat. Fails closed on missing release prerequisites."""
import json, sys
from refresh_registry_integrity import valid_sri
from pathlib import Path
root = Path(__file__).resolve().parents[1]
repo = root.parent
backend = repo / "zannychat-back-github"
checks = []
def check(name, ok, detail=""):
    checks.append((name, bool(ok), detail))
try:
    pkg = json.loads((root / "package.json").read_text())
    app = json.loads((root / "app.json").read_text()).get("expo", {})
    lock = json.loads((root / "package-lock.json").read_text())
    backend_pkg = json.loads((backend / "package.json").read_text())
    locked = lock.get("packages", {}).get("", {}).get("dependencies", {})
    declared = pkg.get("dependencies", {})
    missing = sorted(k for k, v in declared.items() if locked.get(k) != v)
    unresolved = sorted(k for k in declared if not lock.get("packages", {}).get("node_modules/" + k))
    expo_core = lock.get("packages", {}).get("node_modules/expo", {}).get("version", "")
    expo_major = expo_core.split(".", 1)[0] if expo_core else ""
    floating_sdk = sorted(k for k, v in declared.items() if v == "latest")
    registry_entries = {key: value for key, value in lock.get("packages", {}).items() if key and value.get("resolved", "").startswith("https://registry.npmjs.org/")}
    missing_integrity = sorted(key.removeprefix("node_modules/") for key, value in registry_entries.items() if not value.get("integrity"))
    invalid_integrity = sorted(key.removeprefix("node_modules/") for key, value in registry_entries.items() if not valid_sri(value.get("integrity", "")))
    check("Frontend package and Expo versions match", pkg.get("version") == app.get("version"), f"package={pkg.get('version')} app={app.get('version')}")
    check("All release version metadata is aligned", pkg.get("version") == app.get("version") == lock.get("version") == lock.get("packages", {}).get("", {}).get("version"), "package.json, app.json top-level/expo version and package-lock versions must agree")
    check("All frontend dependency declarations match lockfile root", not missing, ", ".join(missing) or "root declarations synchronized")
    check("Every direct dependency has a lockfile resolution", not unresolved, ", ".join(unresolved) or "all direct dependencies have package resolution records")
    check("Registry package integrity hashes are present and well-formed", not missing_integrity and not invalid_integrity, ", ".join(sorted(set(missing_integrity + invalid_integrity))) or "all registry package tarballs have SRI integrity pins")
    check("Expo core and React Native SDK line is explicit", expo_major == "57" and declared.get("expo", "").lstrip("~^") == expo_core, f"expo locked={expo_core or 'missing'}, declared={declared.get('expo')}")
    check("Direct dependencies are not floating on latest", not floating_sdk, ", ".join(floating_sdk) or "all direct dependency versions are explicit")
    check("Backend package version is explicit", bool(backend_pkg.get("version")), str(backend_pkg.get("version")))
    netlify_config = root / "netlify.toml"
    netlify_config_text = netlify_config.read_text() if netlify_config.is_file() else ""
    check("Netlify SPA history fallback serves client-side deep links", netlify_config.is_file() and 'from = "/*"' in netlify_config_text and 'to = "/index.html"' in netlify_config_text and "status = 200" in netlify_config_text, "Netlify must rewrite app routes to the Expo index.html shell")
    backend_entry = (backend / "src" / "index.js").read_text()
    security_test = backend / "tests" / "securityHeaders.test.cjs"
    check("Backend disables fingerprinting and defines baseline response security headers", "app.disable('x-powered-by')" in backend_entry and "X-Content-Type-Options" in backend_entry and "X-Frame-Options" in backend_entry and "Referrer-Policy" in backend_entry and "Cache-Control" in backend_entry and "Strict-Transport-Security" in backend_entry and security_test.is_file(), "API security headers must be present and regression-tested")
    migration = backend / "supabase" / "migrations" / "0057_private_phone_discovery.sql"
    check("Private phone discovery migration exists", migration.is_file(), str(migration.relative_to(repo)) if migration.exists() else "required migration missing")
    hardening_migration = backend / "supabase" / "migrations" / "0058_phone_discovery_opt_in_hardening.sql"
    check("Phone discovery opt-in hardening migration exists", hardening_migration.is_file(), str(hardening_migration.relative_to(repo)) if hardening_migration.exists() else "required follow-up migration missing")
    check("Native contact package is declared for SDK 57", declared.get("expo-contacts") == "57.0.8", f"declared={declared.get('expo-contacts')}")
    check("Media library package is declared for SDK 57", declared.get("expo-media-library", "").lstrip("~^") == "57.0.6", f"declared={declared.get('expo-media-library')}")
    app_plugins_text = json.dumps(app.get("plugins", []))
    check("WebRTC native dependencies are declared and pinned", declared.get("@livekit/react-native-webrtc") == "150.1.1" and declared.get("@config-plugins/react-native-webrtc") == "15.0.2" and "@config-plugins/react-native-webrtc" in app_plugins_text, f"LiveKit WebRTC fork={declared.get('@livekit/react-native-webrtc')}; config plugin={declared.get('@config-plugins/react-native-webrtc')}")
    check("Call screen uses the pinned LiveKit WebRTC native module", "from '@livekit/react-native-webrtc'" in (root / "src" / "screens" / "CallScreen.js").read_text(), "call screen must import the declared native implementation")
    call_screen = (root / "src" / "screens" / "CallScreen.js").read_text()
    call_service = (root / "src" / "services" / "calls.js").read_text()
    call_migration = backend / "supabase" / "migrations" / "0059_realtime_audio_video_calls.sql"
    turn_route = backend / "src" / "routes" / "calls.js"
    turn_helper = backend / "src" / "utils" / "turnCredentials.cjs"
    check("Audio/video call UI and signaling are present", "RTCPeerConnection" in call_screen and "subscribeToCallSignals" in call_screen and "startCall" in call_service, "WebRTC call UI and signaling service required")
    check("Call migration enforces RLS and participant-bound signaling", call_migration.is_file() and "enable row level security" in call_migration.read_text().lower() and "validate_call_signal_insert" in call_migration.read_text(), str(call_migration.relative_to(repo)) if call_migration.exists() else "call migration missing")
    lease_migration = backend / "supabase" / "migrations" / "0060_call_session_heartbeat_lease.sql"
    check("Accepted-call heartbeat lease migration exists", lease_migration.is_file() and "heartbeat_call_session" in lease_migration.read_text() and "3 minutes" in lease_migration.read_text(), str(lease_migration.relative_to(repo)) if lease_migration.exists() else "call lease migration missing")
    cleanup_hardening = backend / "supabase" / "migrations" / "0061_harden_terminal_call_cleanup.sql"
    check("Terminal-call cleanup security hardening migration exists", cleanup_hardening.is_file() and "set search_path = ''" in cleanup_hardening.read_text() and "public.call_signals" in cleanup_hardening.read_text(), str(cleanup_hardening.relative_to(repo)) if cleanup_hardening.exists() else "cleanup hardening migration missing")
    public_schema_hardening = backend / "supabase" / "migrations" / "0062_revoke_client_public_schema_create.sql"
    check("Client roles cannot create objects in exposed public schema", public_schema_hardening.is_file() and "revoke create on schema public from public, anon, authenticated" in public_schema_hardening.read_text().lower(), str(public_schema_hardening.relative_to(repo)) if public_schema_hardening.exists() else "schema privilege hardening migration missing")
    definer_hardening = backend / "supabase" / "migrations" / "0063_harden_qualified_definer_search_paths.sql"
    definer_hardening_text = definer_hardening.read_text().lower() if definer_hardening.is_file() else ""
    reviewed_definer_signatures = [
        "public.get_channel_post_stats(uuid[], uuid)",
        "public.get_own_status_view_counts(uuid[])",
        "public.get_conversation_poll_vote_counts(uuid)",
        "public.get_poll_vote_counts_for_ids(uuid, uuid[])",
        "public.cast_poll_vote(uuid, uuid[])",
        "public.cast_poll_vote(uuid, uuid)",
        "public.create_conversation_poll(uuid, text, text[], timestamptz, boolean)",
        "public.create_conversation_poll(uuid, text, text[], timestamptz)",
        "public.set_pinned_message_snapshot()",
        "public.deliver_due_scheduled_messages(integer)",
    ]
    normalized_definer_migration = " ".join(definer_hardening_text.split())
    definer_signatures_present = all(signature in normalized_definer_migration for signature in reviewed_definer_signatures)
    definer_sets_empty_path = "to_regprocedure(v_signature)" in normalized_definer_migration and "set search_path = %l" in normalized_definer_migration and "if v_function is not null then" in normalized_definer_migration and "alter function" in normalized_definer_migration
    check("Reviewed SECURITY DEFINER routines use empty search_path", definer_hardening.is_file() and len(reviewed_definer_signatures) == 10 and definer_signatures_present and definer_sets_empty_path, "migration must conditionally ALTER all ten reviewed signatures to an empty search_path")
    cleanup_migrations = sorted((backend / "supabase" / "migrations").glob("*bind_attachment_cleanup_to_conversation_0068.sql"))
    cleanup_binding_text = cleanup_migrations[-1].read_text().lower() if cleanup_migrations else ""
    cleanup_worker = backend / "src" / "jobs" / "messageAttachmentCleanup.js"
    cleanup_tests = backend / "tests" / "messageAttachmentCleanup.test.cjs"
    cleanup_worker_text = cleanup_worker.read_text().lower() if cleanup_worker.is_file() else ""
    cleanup_test_text = cleanup_tests.read_text().lower() if cleanup_tests.is_file() else ""
    check("Attachment cleanup is bound to its source conversation", len(cleanup_migrations) == 1 and "add column if not exists conversation_id uuid" in cleanup_binding_text and "old.conversation_id" in cleanup_binding_text and "insert into public.message_attachment_cleanup(message_id, conversation_id, media_url)" in cleanup_binding_text and "set search_path = ''" in cleanup_binding_text and "conversation_id" in cleanup_worker_text and "startswith(`${conversationid}/`)" in cleanup_worker_text and "does not belong to the queued message conversation" in cleanup_worker_text and "worker refuses to delete an object outside the message conversation" in cleanup_test_text, "timestamped 0068 migration must bind OLD.conversation_id and worker tests must reject cross-conversation objects")
    migrations_dir = backend / "supabase" / "migrations"
    cleanup_claim_migrations = sorted(migrations_dir.glob("*_attachment_cleanup_claim_conversation_binding_0072.sql"))
    cleanup_claim_migration_text = cleanup_claim_migrations[0].read_text().lower() if len(cleanup_claim_migrations) == 1 else ""
    check("Attachment cleanup claim returns the source conversation binding", len(cleanup_claim_migrations) == 1 and "conversation_id uuid" in cleanup_claim_migration_text and "q.conversation_id" in cleanup_claim_migration_text and "from public.message_attachment_cleanup q" in cleanup_claim_migration_text and "conversation-prefix collisions" in cleanup_test_text and "conversation_id" in cleanup_worker_text, "claim RPC must return conversation_id; worker regression must cover legacy unbound jobs and prefix collisions")
    group_privacy = backend / "src" / "routes" / "conversations.js"
    group_privacy_helper = backend / "src" / "utils" / "groupInvitePrivacy.cjs"
    check("Group invitation preferences and blocks are enforced before membership writes", group_privacy.is_file() and group_privacy_helper.is_file() and "evaluateGroupInvitePrivacy" in group_privacy.read_text() and "group_invite_permission" in group_privacy.read_text() and "blocked_users" in group_privacy.read_text(), "trusted group creation must enforce recipient privacy and block state")
    security_inventory = backend / "supabase" / "audits" / "security_definer_inventory.sql"
    security_inventory_text = security_inventory.read_text().lower() if security_inventory.is_file() else ""
    check("Read-only SECURITY DEFINER staging inventory exists", security_inventory.is_file() and "p.prosecdef" in security_inventory_text and "has_function_privilege('authenticated'" in security_inventory_text and "search_path_not_pinned" in security_inventory_text and "aclexplode(" in security_inventory_text and "critical review" in security_inventory_text, "inventory must triage unpinned search paths and PUBLIC/role EXECUTE access without mutating database state")
    native_validation = root / "WEBRTC_SDK57_NATIVE_VALIDATION.md"
    native_validation_text = native_validation.read_text() if native_validation.is_file() else ""
    check("WebRTC native build compatibility is validated for SDK 57", "**VALIDATED: YES**" in native_validation_text.splitlines(), "requires clean Android and iOS builds plus real-device call smoke tests; source/static tests are insufficient")
    check("TURN credentials are generated server-side", turn_route.is_file() and turn_helper.is_file() and "createHmac('sha1'" in turn_helper.read_text() and "TURN_SHARED_SECRET" in turn_route.read_text(), "never embed the TURN shared secret in the app")
    call_docs = repo / f"AUDIO_VIDEO_CALLS_{pkg.get('version', 'unknown')}.md"
    check("Native build and background-call limitations are documented", call_docs.is_file() and "Expo Go" in call_docs.read_text() and "background" in call_docs.read_text().lower(), "deployment requirements and known gaps must be explicit")
    contact_screen = (root / "src" / "screens" / "ContactDiscoveryScreen.js").read_text()
    media_screens = "\n".join((root / p).read_text() for p in ("src/screens/ChatScreen.js", "src/screens/StatusUpdatesScreen.js"))
    check("Legacy contacts API uses explicit compatibility entrypoint", "from 'expo-contacts/legacy'" in contact_screen, "SDK 57 root API deprecates old getContactsAsync/requestPermissionsAsync calls")
    check("Legacy media-save APIs use explicit compatibility entrypoint", "from 'expo-media-library/legacy'" in media_screens, "SDK 57 root API deprecates old requestPermissionsAsync/saveToLibraryAsync calls")
    release_version = pkg.get("version", "")
    canonical_text = (repo / "CANONICAL_RELEASE.md").read_text()
    check("Canonical release documentation matches package version", f"Canonical source package: {release_version}" in canonical_text, f"root canonical release document must name {release_version}")
    check("Release validation notes exist", (repo / f"RELEASE_VALIDATION_{release_version}.md").is_file(), "validation record required for current frontend version")
except Exception as exc:
    check("Release manifests parse", False, str(exc))
for name, ok, detail in checks:
    print(("PASS" if ok else "BLOCK") + ": " + name + (" — " + detail if detail else ""))
print(f"\n{sum(ok for _, ok, _ in checks)}/{len(checks)} release gates passed")
print("A BLOCK result is intentional: do not deploy until every gate passes.")
sys.exit(0 if all(ok for _, ok, _ in checks) else 1)
