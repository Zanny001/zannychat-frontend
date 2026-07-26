import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';
import NewChatScreen from '../screens/NewChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import WalletScreen from '../screens/WalletScreen';

const RootStack = createNativeStackNavigator();
const MainTabs = createBottomTabNavigator();

function MainTabNavigator() {
  const { colors } = useTheme();

  return (
    <MainTabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIcon: ({ color, size }) => {
          const icons = { Chats: 'chatbubbles', Wallet: 'wallet', Profile: 'person-circle' };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <MainTabs.Screen name="Chats" component={ChatListScreen} />
      <MainTabs.Screen name="Wallet" component={WalletScreen} />
      <MainTabs.Screen name="Profile" component={ProfileScreen} />
    </MainTabs.Navigator>
  );
}

export default function AppNavigator() {
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
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
        <RootStack.Screen name="Login" component={LoginScreen} />
        <RootStack.Screen name="Signup" component={SignupScreen} />
        <RootStack.Screen name="Main" component={MainTabNavigator} />
        <RootStack.Screen name="Chat" component={ChatScreen} />
        <RootStack.Screen name="NewChat" component={NewChatScreen} options={{ presentation: 'modal' }} />
        <RootStack.Screen name="Settings" component={SettingsScreen} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
