import { Redirect } from "expo-router";

import { Loader } from "@/components";
import { useAuth } from "@/graphql";

export default function IndexScreen() {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loader fullScreen />;
  }

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}
