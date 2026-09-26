import { Redirect, Stack } from "expo-router";
import { isPartnerMobileRole } from "@reservations/shared";

import { Loader } from "@/components";
import { useAuth } from "@/graphql";

export default function AuthLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loader fullScreen />;
  }

  if (user && isPartnerMobileRole(user.role)) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
