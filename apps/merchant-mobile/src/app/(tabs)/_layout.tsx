import { Redirect, Tabs } from "expo-router";
import { useUnistyles } from "react-native-unistyles";

import {
  ArmchairIcon,
  CalendarCheckIcon,
  HomeIcon,
  MailIcon,
  MoreHorizontalIcon,
} from "@/assets";
import { Loader } from "@/components";
import { useAuth } from "@/graphql";

export default function TabsLayout() {
  const { theme } = useUnistyles();
  const { user, loading } = useAuth();

  if (loading) {
    return <Loader fullScreen />;
  }

  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Overview",
          tabBarLabel: "Overview",
          tabBarIcon: ({ color, size, focused }) => (
            <HomeIcon color={String(color)} size={size} filled={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="reservations"
        options={{
          title: "Reservations",
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
        name="floor"
        options={{
          title: "Floor",
          tabBarIcon: ({ color, size }) => (
            <ArmchairIcon color={String(color)} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, size }) => (
            <MailIcon color={String(color)} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => (
            <MoreHorizontalIcon color={String(color)} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
