import { Tabs } from "expo-router";
import { useUnistyles } from "react-native-unistyles";

import { CalendarCheckIcon, HomeIcon, UserIcon } from "@/assets";

export default function TabsLayout() {
  const { theme } = useUnistyles();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
        },
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.textPrimary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerShown: false,
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <HomeIcon color={String(color)} size={size} filled={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="reservations"
        options={{
          title: "Reservations",
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <CalendarCheckIcon
              color={String(color)}
              size={size}
              filled={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <UserIcon color={String(color)} size={size} filled={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
