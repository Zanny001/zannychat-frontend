from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class StatusAccountStorageRegressionTests(unittest.TestCase):
    def test_seen_status_markers_are_account_scoped(self):
        source = (ROOT / "src/utils/statusSeen.js").read_text(encoding="utf-8")
        screen = (ROOT / "src/screens/StatusUpdatesScreen.js").read_text(encoding="utf-8")
        self.assertIn("STATUS_SEEN_STORAGE_PREFIX = 'zannychat.status-seen.v1.'", source)
        self.assertIn("getSeenStatusStorageKey(userId)", source)
        self.assertIn("readSeenStatusIds(AsyncStorage, userId)", screen)
        self.assertIn("writeSeenStatusIds(AsyncStorage, myProfile.id", screen)
        self.assertNotIn("AsyncStorage.setItem('zannychat.status-seen.v1'", screen)

    def test_status_duration_preferences_are_account_scoped_and_normalized(self):
        source = (ROOT / "src/utils/statusDurationStorage.js").read_text(encoding="utf-8")
        screen = (ROOT / "src/screens/StatusUpdatesScreen.js").read_text(encoding="utf-8")
        self.assertIn("STATUS_DURATION_STORAGE_PREFIX = 'zannychat.status-duration-preferences.v1.'", source)
        self.assertIn("normalizeStatusDurationPreferences(value)", source)
        self.assertIn("readStatusDurationPreferences(AsyncStorage, userId)", screen)
        self.assertIn("writeStatusDurationPreferences(AsyncStorage, myProfile.id, next)", screen)
        self.assertNotIn("AsyncStorage.setItem('zannychat.status-duration-preferences.v1'", screen)

    def test_account_change_clears_previous_feed_and_read_state(self):
        screen = (ROOT / "src/screens/StatusUpdatesScreen.js").read_text(encoding="utf-8")
        self.assertIn("const userId = myProfile?.id;", screen)
        self.assertIn("seenStatusIdsRef.current = [];", screen)
        self.assertIn("setStatuses([]);", screen)
        self.assertIn("setViewing(null);", screen)
        self.assertIn("}, [myProfile?.id]);", screen)


if __name__ == "__main__":
    unittest.main()
