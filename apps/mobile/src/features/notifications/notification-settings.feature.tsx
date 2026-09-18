import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Linking, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { toast } from "sonner-native";

import { ChevronLeftIcon } from "@/assets";
import { Button, Empty, Flex, IconButton, Typography } from "@/components";
import { useAuth } from "@/graphql";

import { getPushPermissionStatus } from "./helpers/push-token.helpers";
import { useRegisterPush } from "./hooks/use-register-push.hook";

export function NotificationSettingsFeature() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const { user, sessionOffline, refreshMe } = useAuth();
  const { registered, registering, register } = useRegisterPush({
    auto: false,
  });
  const [permission, setPermission] = useState<
    "undetermined" | "granted" | "denied" | "loading"
  >("loading");
  const [retryingSession, setRetryingSession] = useState(false);

  const refreshPermission = useCallback(async () => {
    const status = await getPushPermissionStatus();
    setPermission(status);
  }, []);

  useEffect(() => {
    void refreshPermission();
  }, [refreshPermission]);

  const statusLabel = (() => {
    if (sessionOffline && !user) return "Reconnect to manage push alerts";
    if (!user) return "Sign in to enable push alerts";
    if (permission === "loading") return "Checking permission…";
    if (permission === "denied") return "Notifications are blocked";
    if (registered) return "Push alerts are on";
    if (permission === "granted") return "Permission granted — finish setup";
    return "Push alerts are off";
  })();

  const onEnable = async () => {
    if (sessionOffline && !user) {
      setRetryingSession(true);
      try {
        await refreshMe();
      } finally {
        setRetryingSession(false);
      }
      return;
    }

    if (!user) {
      router.push({
        pathname: "/sign-in",
        params: { next: "/notification-settings" },
      });
      return;
    }

    if (permission === "denied") {
      await Linking.openSettings();
      return;
    }

    const ok = await register();
    await refreshPermission();
    if (ok) {
      toast.success("Push notifications enabled");
    } else {
      toast.error("Could not enable push notifications");
    }
  };

  const buttonLabel = (() => {
    if (sessionOffline && !user) return "Try again";
    if (!user) return "Sign in";
    if (permission === "denied") return "Open settings";
    if (registered) return "Enabled";
    return "Enable push notifications";
  })();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Flex direction="row" alignItems="center" style={styles.topBar}>
        <IconButton
          icon={<ChevronLeftIcon />}
          variant="surface"
          size="sm"
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          style={styles.chromeBtn}
        />
        <Typography weight="semibold" size="text-lg" style={styles.topTitle}>
          Push alerts
        </Typography>
        <View style={styles.sideSlot} />
      </Flex>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              Math.max(insets.bottom, theme.space(2)) + theme.space(2),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {sessionOffline && !user ? (
          <Empty
            title="You're offline"
            description="We couldn't restore your session. Check your connection and try again."
          >
            <Button
              fullWidth
              loading={retryingSession}
              onPress={() => {
                void onEnable();
              }}
            >
              Try again
            </Button>
          </Empty>
        ) : (
          <>
            <Flex gap={1}>
              <Typography weight="semibold" size="text-xl">
                Reservation alerts
              </Typography>
              <Typography size="text-md" color="muted">
                Get notified about confirmations, reminders, waitlist openings,
                and other updates for your bookings.
              </Typography>
            </Flex>

            <View style={styles.card}>
              <Typography size="text-sm" color="muted" weight="medium">
                Status
              </Typography>
              <Typography
                weight="semibold"
                size="text-md"
                style={styles.status}
              >
                {statusLabel}
              </Typography>

              <Button
                fullWidth
                loading={registering || retryingSession}
                disabled={
                  registering || (registered && permission === "granted")
                }
                onPress={() => {
                  void onEnable();
                }}
              >
                {buttonLabel}
              </Button>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    paddingHorizontal: space(2),
    paddingBottom: space(1.5),
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
  },
  chromeBtn: {
    width: space(5),
    height: space(5),
    borderRadius: radius.full,
  },
  sideSlot: {
    width: space(5),
    height: space(5),
  },
  content: {
    paddingHorizontal: space(2),
    paddingTop: space(1),
    gap: space(3),
  },
  card: {
    gap: space(1.5),
    padding: space(2),
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  status: {
    marginBottom: space(0.5),
  },
}));
