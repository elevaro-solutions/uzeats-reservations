import "react-native-gesture-handler";

import { useFonts } from "@expo-google-fonts/dm-sans/useFonts";
import { DMSans_400Regular } from "@expo-google-fonts/dm-sans/400Regular";
import { DMSans_500Medium } from "@expo-google-fonts/dm-sans/500Medium";
import { DMSans_600SemiBold } from "@expo-google-fonts/dm-sans/600SemiBold";
import { DMSans_700Bold } from "@expo-google-fonts/dm-sans/700Bold";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native-unistyles";
import { Toaster } from "sonner-native";

import { PushBootstrap } from "@/features";
import { Providers } from "@/graphql";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded, fontsError] = useFonts({
    DMSans: DMSans_400Regular,
    "DMSans Medium": DMSans_500Medium,
    "DMSans Semibold": DMSans_600SemiBold,
    "DMSans Bold": DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontsError) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, fontsError]);

  if (!fontsLoaded && !fontsError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <Providers>
        <PushBootstrap />
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="(auth)"
            options={{
              presentation: "card",
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen name="waitlist" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
          <Stack.Screen
            name="reservations/[id]"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="reservations/create"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="messages/[reservationId]"
            options={{ headerShown: false }}
          />
        </Stack>
        <Toaster position="top-center" theme="light" />
      </Providers>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create(({ colors }) => ({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
}));
