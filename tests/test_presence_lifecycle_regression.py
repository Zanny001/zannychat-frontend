from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class PresenceLifecycleRegressionTests(unittest.TestCase):
    def read(self, path):
        return (ROOT / path).read_text(encoding="utf-8")

    def test_presence_starts_with_first_subscriber_and_stops_after_last(self):
        source = self.read("src/services/presence.js")
        self.assertIn("listeners.add(cb);", source)
        self.assertIn("startPresence();", source)
        self.assertIn("if (listeners.size === 0) stopPresence();", source)
        self.assertIn("lifecycleVersion += 1;", source)
        self.assertIn("version !== lifecycleVersion", source)
        self.assertIn("if (version === lifecycleVersion) inFlight = false;", source)
        self.assertIn("const OFFLINE_HEARTBEAT_FLUSH_MS = 1500;", source)
        self.assertIn("timer = setTimeout(finish, OFFLINE_HEARTBEAT_FLUSH_MS);", source)

    def test_chat_list_uses_subscription_owned_presence_lifecycle(self):
        source = self.read("src/screens/ChatListScreen.js")
        self.assertIn("import { subscribePresence } from '../services/presence';", source)
        self.assertIn("useEffect(() => subscribePresence(setOnlineIds), []);", source)
        self.assertNotIn("startPresence", source)

    def test_every_explicit_signout_path_stops_presence_before_auth_signout(self):
        source = self.read("src/services/api.js")
        self.assertEqual(source.count("await stopPresence();"), 4)
        self.assertIn("await stopPresence();\n  try {\n    const signOutResult = await supabase.auth.signOut", source)
        self.assertIn("await stopPresence();\n  const { error } = await supabase.auth.signOut({ scope: 'local' });", source)
        self.assertIn("await stopPresence();\n  const { error } = await supabase.auth.signOut({ scope: 'global' });", source)

    def test_auth_event_is_a_fallback_for_remote_or_external_signout(self):
        source = self.read("App.js")
        self.assertIn("} else if (event === 'SIGNED_OUT') {\n          stopPresence();", source)

    def test_presence_cache_resets_when_authenticated_account_changes(self):
        service = self.read("src/services/presence.js")
        app = self.read("App.js")
        self.assertIn("let presenceOwnerId = null;", service)
        self.assertIn("export function setPresenceOwner(userId)", service)
        self.assertIn("if (presenceOwnerId === nextOwnerId) {", service)
        self.assertIn("if (nextOwnerId && listeners.size > 0 && !started) startPresence();", service)
        self.assertIn("if (!SUPABASE_ENABLED || !presenceOwnerId || started) return;", service)
        self.assertIn("setPresenceOwner(session.user?.id);", app)
        self.assertIn("setPresenceOwner(null);", app)


if __name__ == "__main__":
    unittest.main()
