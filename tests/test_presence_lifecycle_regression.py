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


if __name__ == "__main__":
    unittest.main()
