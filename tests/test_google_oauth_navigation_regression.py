from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]

class GoogleOAuthNavigationRegressionTests(unittest.TestCase):
    def test_login_and_signup_use_runtime_redirect_helper(self):
        for name in ('src/screens/LoginScreen.js', 'src/screens/SignupScreen.js'):
            source = (ROOT / name).read_text()
            self.assertIn("startGoogleOAuth", source, name)
            self.assertIn("startGoogleOAuth(supabase)", source, name)
            self.assertNotIn('https://zannychat.netlify.app', source, name)

        helper = (ROOT / 'src/services/googleAuth.js').read_text()
        self.assertIn("options: { redirectTo: getWebRedirect() }", helper)
        self.assertIn("Linking.createURL('auth/callback')", helper)

    def test_web_redirect_uses_current_origin_and_native_scheme(self):
        source = (ROOT / 'src/utils/oauthRedirect.js').read_text()
        self.assertIn('window.location.origin', source)
        self.assertIn('zannychat://auth/callback', source)

    def test_auth_state_changes_reset_navigation(self):
        source = (ROOT / 'App.js').read_text()
        navigator = (ROOT / 'src/navigation/AppNavigator.js').read_text()
        self.assertIn("event === 'SIGNED_IN'", source)
        self.assertIn("routes: [{ name: targetRoute }]", navigator)
        self.assertIn("event === 'SIGNED_OUT'", source)
        self.assertIn('authSubscription?.unsubscribe?.()', source)


    def test_private_routes_are_not_registered_for_unauthenticated_live_users(self):
        source = (ROOT / 'src/navigation/AppNavigator.js').read_text()
        self.assertIn('const canAccessApp = !SUPABASE_ENABLED || isAuthenticated', source)
        self.assertIn('{canAccessApp && <RootStack.Group', source)
        self.assertIn('navigationKey="guest"', source)
        app = (ROOT / 'App.js').read_text()
        self.assertIn("isAuthenticated={initialRoute === 'Main'}", app)
        self.assertIn('if (!SUPABASE_ENABLED || !navigationRef.isReady()) return', source)
        self.assertIn('}, [isAuthenticated]);', source)

    def test_login_and_signup_do_not_navigate_to_protected_routes_before_auth_state(self):
        login = (ROOT / 'src/screens/LoginScreen.js').read_text()
        signup = (ROOT / 'src/screens/SignupScreen.js').read_text()
        self.assertIn('if (!SUPABASE_ENABLED) navigation.reset', login)
        self.assertIn('if (!SUPABASE_ENABLED) navigation.reset', signup)

    def test_web_auth_storage_falls_back_when_browser_storage_is_restricted(self):
        source = (ROOT / 'src/services/supabaseClient.js').read_text()
        self.assertIn('const memoryWebStorage = new Map()', source)
        self.assertIn('catch (_) { return memoryWebStorage.has(key)', source)
        self.assertIn('window.localStorage.setItem(key, value)', source)


    def test_password_recovery_has_web_and_native_redirects(self):
        helper = (ROOT / 'src/utils/oauthRedirect.js').read_text()
        api = (ROOT / 'src/services/api.js').read_text()
        app = (ROOT / 'App.js').read_text()
        screen = (ROOT / 'src/screens/PasswordResetScreen.js').read_text()
        self.assertIn('getPasswordRecoveryRedirectUrl', helper)
        self.assertIn('/?reset-password=1', helper)
        self.assertIn("return 'zannychat://reset-password'", helper)
        self.assertIn('redirectTo: getPasswordRecoveryRedirectUrl()', api)
        self.assertIn('isWebRecoveryCallback', app)
        self.assertIn('isSameOriginRecovery', api)
        self.assertIn('window.location.href', screen)

    def test_signout_error_does_not_fake_successful_navigation(self):
        source = (ROOT / 'src/screens/SettingsScreen.js').read_text()
        self.assertIn("if (!SUPABASE_ENABLED) navigation.reset", source)
        self.assertIn("Could not sign out securely", source)

    def test_token_refresh_does_not_reset_navigation_and_push_is_deduplicated(self):
        source = (ROOT / 'App.js').read_text()
        self.assertIn("if (event === 'SIGNED_IN')", source)
        self.assertIn('registerPushOnce()', source)
        self.assertIn('let pushRegistrationStarted = false', source)
        self.assertIn('!authStateObserved', source)
        self.assertIn('if (mounted && !authStateObserved)', source)
        self.assertNotIn("event === 'TOKEN_REFRESHED'))", source)

if __name__ == '__main__':
    unittest.main()
