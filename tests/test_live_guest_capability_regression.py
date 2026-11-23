from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class LiveGuestCapabilityRegressionTests(unittest.TestCase):
    def test_guest_management_capability_requires_server_creator_role(self):
        source = (ROOT / "src/screens/LiveStreamScreen.js").read_text(encoding="utf-8")
        self.assertIn("const creatorMode = connection?.role === 'creator';", source)
        self.assertIn("const canManageGuests = Boolean(creatorMode && stream?.allow_guests);", source)
        self.assertIn("if (!canManageGuests || !stream?.id) return undefined;", source)
        self.assertIn("showGuestRequests && canManageGuests && (", source)
        self.assertIn("canManageGuests={canManageGuests}", source)
        self.assertNotIn("route.params?.creatorMode", source)

    def test_guest_publishing_still_requires_server_issued_guest_permission(self):
        source = (ROOT / "src/screens/LiveStreamScreen.js").read_text(encoding="utf-8")
        self.assertIn("connection?.role === 'guest' && connection?.canPublish === true", source)
        self.assertIn("audio={publisherMode} video={mediaVideoEnabled}", source)
        self.assertIn("const mediaVideoEnabled = Boolean(publisherMode && stream?.experience_mode !== 'audio_room' && connection?.mediaMode !== 'audio');", source)
        self.assertIn("mediaMode={connection?.mediaMode || 'video'}", source)


if __name__ == "__main__":
    unittest.main()
