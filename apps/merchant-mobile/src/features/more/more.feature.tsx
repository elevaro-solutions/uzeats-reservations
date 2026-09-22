import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { toast } from "sonner-native";

import { BellIcon, ClipboardClockIcon, LogOutIcon } from "@/assets";
import {
  Button,
  Dialog,
  Flex,
  InlineAlert,
  Typography,
  UserAvatar,
} from "@/components";
import { RestaurantSwitcher } from "@/features/restaurants";
import { useAuth } from "@/graphql";
import { getGraphQLErrorMessage } from "@/lib/graphql-errors";

import { AccountMenuRow } from "./components";

function roleLabel(role?: string | null): string {
  switch (role) {
    case "restaurant_owner":
      return "Owner";
    case "staff":
      return "Staff";
    case "admin":
      return "Admin";
    default:
      return role ?? "Partner";
  }
}

export function MoreFeature() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      toast.error("Couldn't sign out", {
        description: getGraphQLErrorMessage(err, "Please try again"),
      });
      setLoggingOut(false);
      setConfirmLogout(false);
    }
  }

  const displayName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ");

  const partnerHubMessage =
    user?.role === "staff"
      ? "Billing and adding restaurants are available to owners in Partner Hub."
      : user?.role === "restaurant_owner"
        ? "Billing, venue setup, and marketing live in Partner Hub on the web. This app is for day-of service."
        : null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Flex
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        gap={1.5}
        style={styles.header}
      >
        <Typography weight="bold" size="text-lg" style={styles.title}>
          Account
        </Typography>
        <Flex style={styles.switcherWrap}>
          <RestaurantSwitcher compact />
        </Flex>
      </Flex>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + theme.space(4) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Flex
          direction="row"
          alignItems="flex-start"
          gap={1.5}
          style={styles.profile}
        >
          <UserAvatar
            firstName={user?.firstName}
            lastName={user?.lastName}
            size="lg"
          />
          <Flex flex={1} gap={0.25}>
            <Typography weight="semibold" size="text-lg" numberOfLines={1}>
              {displayName || "Partner"}
            </Typography>
            {user?.email ? (
              <Typography size="text-sm" color="secondary" numberOfLines={1}>
                {user.email}
              </Typography>
            ) : null}
            <Typography size="text-sm" color="muted">
              {roleLabel(user?.role)}
            </Typography>
          </Flex>
        </Flex>

        <Typography
          weight="medium"
          size="text-sm"
          color="secondary"
          style={styles.linksTitle}
        >
          Quick links
        </Typography>
        <View style={styles.menuGroup}>
          <AccountMenuRow
            label="Notifications"
            icon={<BellIcon size={20} color={theme.colors.textSecondary} />}
            onPress={() => router.push("/notifications")}
            showDivider
          />
          <AccountMenuRow
            label="Waitlist"
            icon={
              <ClipboardClockIcon
                size={20}
                color={theme.colors.textSecondary}
              />
            }
            onPress={() => router.push("/waitlist")}
          />
        </View>

        {partnerHubMessage ? (
          <InlineAlert
            tone="info"
            title="Partner Hub"
            message={partnerHubMessage}
            style={styles.hubAlert}
          />
        ) : null}

        <Button
          fullWidth
          size="lg"
          color="error"
          variant="text"
          startIcon={<LogOutIcon />}
          onPress={() => setConfirmLogout(true)}
          style={styles.logout}
        >
          Log out
        </Button>
      </ScrollView>

      <Dialog
        visible={confirmLogout}
        onClose={() => {
          if (!loggingOut) setConfirmLogout(false);
        }}
        loading={loggingOut}
        title="Log out?"
        description="You'll need to sign in again to manage reservations and the floor."
        actions={
          <Flex gap={1}>
            <Button
              fullWidth
              size="lg"
              color="error"
              loading={loggingOut}
              onPress={() => {
                void handleLogout();
              }}
            >
              Log out
            </Button>
            <Button
              fullWidth
              size="md"
              variant="text"
              color="secondary"
              disabled={loggingOut}
              onPress={() => setConfirmLogout(false)}
            >
              Stay signed in
            </Button>
          </Flex>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: space(2),
    paddingBottom: space(1.5),
    paddingTop: space(1),
  },
  title: {
    flexShrink: 0,
  },
  switcherWrap: {
    flexShrink: 1,
    minWidth: 0,
    maxWidth: "62%",
  },
  content: {
    paddingHorizontal: space(2),
  },
  profile: {
    padding: space(2),
    marginTop: space(0.5),
    marginBottom: space(3),
    borderRadius: radius.lg,
    backgroundColor: colors.slate2,
  },
  linksTitle: {
    marginBottom: space(1),
  },
  menuGroup: {
    borderRadius: radius.lg,
    backgroundColor: colors.slate2,
    overflow: "hidden",
  },
  hubAlert: {
    marginTop: space(3),
  },
  logout: {
    marginTop: space(3),
  },
}));
