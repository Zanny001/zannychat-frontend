from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class AccountDeletionReauthBindingTests(unittest.TestCase):
    def test_google_reauth_proof_is_bound_to_user_identity(self):
        source = (ROOT / "src/screens/PrivacySecurityScreen.js").read_text(encoding="utf-8")
        self.assertIn("const [googleReauthVerifiedUserId, setGoogleReauthVerifiedUserId] = useState(null);", source)
        self.assertIn("const authUserIdRef = useRef(null);", source)
        self.assertIn("if (authUserIdRef.current !== data.user.id)", source)
        self.assertIn("setGoogleReauthVerifiedUserId(data.user.id);", source)
        self.assertNotIn("const [googleReauthVerified, setGoogleReauthVerified]", source)

    def test_delete_checks_current_supabase_user_before_accepting_reauth(self):
        source = (ROOT / "src/screens/PrivacySecurityScreen.js").read_text(encoding="utf-8")
        self.assertIn("const { data: currentAuthData, error: currentAuthError } = await supabase.auth.getUser();", source)
        self.assertIn("googleReauthVerifiedUserId !== currentUserId", source)
        self.assertIn("authUserIdRef.current !== currentUserId", source)
        self.assertIn("await refreshAuthProviders();", source)
        self.assertIn("googleReauthVerifiedUserId === authUserIdRef.current", source)

    def test_pending_reauth_remains_user_bound_and_time_limited(self):
        source = (ROOT / "src/screens/PrivacySecurityScreen.js").read_text(encoding="utf-8")
        self.assertIn("userId: data.user.id,", source)
        self.assertIn("const ACCOUNT_DELETE_REAUTH_TTL_MS = 4 * 60 * 1000 + 30 * 1000;", source)
        self.assertIn("confirm deletion within five minutes.", source)
        self.assertIn("expiresAt: Date.now() + ACCOUNT_DELETE_REAUTH_TTL_MS", source)
        self.assertIn("pending.userId === data.user.id", source)


if __name__ == "__main__":
    unittest.main()
