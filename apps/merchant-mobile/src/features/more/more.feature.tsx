import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { toast } from "sonner-native";

import { LogOutIcon } from "@/assets";
import { Button, Flex, Typography, UserAvatar } from "@/components";
import { RestaurantSwitcher } from "@/features/restaurants";
import { useAuth } from "@/graphql";
import { getGraphQLErrorMessage } from "@/lib/graphql-errors";

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
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      toast.error("Couldn't sign out", {
        description: getGraphQLErrorMessage(err, "Please try again"),
      });
    } finally {
      setLoggingOut(false);
    }
  }

  const displayName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Typography weight="bold" size="text-xl" style={styles.title}>
        More
      </Typography>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + theme.space(3) },
        ]}
      >
        <Flex direction="row" alignItems="center" gap={1.5} style={styles.profile}>
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

        <Typography weight="medium" size="text-sm" color="secondary" style={styles.label}>
          Active restaurant
        </Typography>
        <RestaurantSwitcher />

        {user?.role === "staff" ? (
          <Typography size="text-sm" color="muted" style={styles.note}>
            Billing and adding restaurants are available to owners in Partner
            Hub.
          </Typography>
        ) : user?.role === "restaurant_owner" ? (
          <Typography size="text-sm" color="muted" style={styles.note}>
            Billing, venue setup, and marketing live in Partner Hub on the web.
            This app is for day-of service.
          </Typography>
        ) : null}

        <Button
          fullWidth
          size="xl"
          color="error"
          variant="outlined"
          loading={loggingOut}
          startIcon={<LogOutIcon />}
          onPress={() => {
            void handleLogout();
          }}
          style={styles.logout}
        >
          Log out
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors }) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    paddingHorizontal: space(2),
    paddingBottom: space(1.5),
  },
  content: {
    paddingHorizontal: space(2),
  },
  profile: {
    paddingVertical: space(2),
    marginBottom: space(1),
  },
  label: {
    marginBottom: space(0.75),
  },
  note: {
    marginBottom: space(2),
    marginTop: space(2),
  },
  logout: {
    marginTop: space(2),
  },
}));
