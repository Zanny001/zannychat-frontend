import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { NavigationContainer, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../utils/color';

import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import PasswordRecoveryScreen from '../screens/PasswordRecoveryScreen';
import PasswordResetScreen from '../screens/PasswordResetScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';
import NewChatScreen from '../screens/NewChatScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PrivacySecurityScreen from '../screens/PrivacySecurityScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import HelpScreen from '../screens/HelpScreen';
import QRContactScreen from '../screens/QRContactScreen';
import ForwardMessageScreen from '../screens/ForwardMessageScreen';
import DataStorageScreen from '../screens/DataStorageScreen';
import DataExportScreen from '../screens/DataExportScreen';
import SessionsScreen from '../screens/SessionsScreen';
import ChatAppearanceScreen from '../screens/ChatAppearanceScreen';
import SharedMediaScreen from '../screens/SharedMediaScreen';
import SavedMessagesScreen from '../screens/SavedMessagesScreen';
import DraftsScreen from '../screens/DraftsScreen';
import PinnedMessagesScreen from '../screens/PinnedMessagesScreen';

// Lets code outside the component tree (the push-notification tap
// handler in App.js) trigger navigation — the standard React
// Navigation pattern for exactly that case.
export const navigationRef = createNavigationContainerRef();

const RootStack = createNativeStackNavigator();
const MainTabs = createBottomTabNavigator();

// The bottom tab bar's background — real blur of whatever's scrolling
// underneath, tinted toward the mood's background color.
function GlassTabBackground() {
  const { colors } = useTheme();
  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView
        intensity={32}
        tint="dark"
        style={StyleSheet.absoluteFill}
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: hexToRgba(colors.background, 0.72) }]} />
    </View>
  );
}

function MainTabNavigator() {
  const { colors } = useTheme();

  return (
    <MainTabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarAccessibilityLabel: route.name === 'Chats' ? 'Chats tab' : 'Profile tab',
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopColor: hexToRgba(colors.textPrimary, 0.08),
          position: 'absolute',
        },
        tabBarBackground: () => <GlassTabBackground />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIcon: ({ color, size }) => {
          const icons = { Chats: 'chatbubbles', Profile: 'person-circle' };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <MainTabs.Screen name="Chats" component={ChatListScreen} />
      <MainTabs.Screen name="Profile" component={ProfileScreen} />
    </MainTabs.Navigator>
  );
}

// initialRouteName is resolved once in App.js from whether a Supabase
// session already exists, so a returning, signed-in user lands
// straight in Main instead of seeing Onboarding again every launch.
export default function AppNavigator({ initialRouteName = 'Onboarding' }) {
  const { colors } = useTheme();

  const navTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: colors.background,
      card: colors.background,
      text: colors.textPrimary,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme} linking={{ prefixes: ['zannychat://'], config: { screens: { PasswordReset: 'reset-password' } } }}>
      <RootStack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRouteName}>
        <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
        <RootStack.Screen name="Login" component={LoginScreen} />
        <RootStack.Screen name="Signup" component={SignupScreen} />
        <RootStack.Screen name="PasswordRecovery" component={PasswordRecoveryScreen} />
        <RootStack.Screen name="PasswordReset" component={PasswordResetScreen} />
        <RootStack.Screen name="Main" component={MainTabNavigator} />
        <RootStack.Screen name="Chat" component={ChatScreen} />
        <RootStack.Screen name="NewChat" component={NewChatScreen} options={{ presentation: 'modal' }} />
        <RootStack.Screen name="QRContact" component={QRContactScreen} options={{ presentation: 'modal' }} />
        <RootStack.Screen name="ForwardMessage" component={ForwardMessageScreen} options={{ presentation: 'modal' }} />
        <RootStack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ presentation: 'modal' }} />
        <RootStack.Screen name="Settings" component={SettingsScreen} />
        <RootStack.Screen name="ChatAppearance" component={ChatAppearanceScreen} />
        <RootStack.Screen name="SharedMedia" component={SharedMediaScreen} />
        <RootStack.Screen name="SavedMessages" component={SavedMessagesScreen} />
        <RootStack.Screen name="Drafts" component={DraftsScreen} />
        <RootStack.Screen name="PinnedMessages" component={PinnedMessagesScreen} />
        <RootStack.Screen name="EditProfile" component={EditProfileScreen} />
        <RootStack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
        <RootStack.Screen name="Notifications" component={NotificationsScreen} />
        <RootStack.Screen name="DataStorage" component={DataStorageScreen} />
        <RootStack.Screen name="DataExport" component={DataExportScreen} />
        <RootStack.Screen name="Sessions" component={SessionsScreen} />
        <RootStack.Screen name="Help" component={HelpScreen} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
