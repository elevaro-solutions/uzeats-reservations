import { Redirect, Stack, useLocalSearchParams } from "expo-router";

import { Loader } from "@/components";
import { resolveAuthNextPath } from "@/features";
import { useAuth } from "@/graphql";

export default function AuthLayout() {
  const { user, loading } = useAuth();
  const { next } = useLocalSearchParams<{ next?: string }>();

  if (loading) {
    return <Loader fullScreen />;
  }

  if (user) {
    return <Redirect href={resolveAuthNextPath(next)} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
