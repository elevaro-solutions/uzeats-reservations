import { useRouter } from "expo-router";
import { StyleSheet } from "react-native-unistyles";

import { Button, Flex, Typography, UserAvatar } from "@/components";
import { useAuth } from "@/graphql";

export function ProfileFeature() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  if (loading) return null;

  return (
    <Flex flex={1} gap={2} style={styles.screen}>
      <Typography size="display-xs" weight="bold">
        Profile
      </Typography>

      {user ? (
        <Flex gap={2} direction="row" alignItems="center">
          <UserAvatar
            size="lg"
            firstName={user.firstName}
            lastName={user.lastName}
          />
          <Flex gap={0.25}>
            <Typography weight="semibold" size="text-lg">
              {user.firstName} {user.lastName}
            </Typography>
            <Typography size="text-sm" color="secondary">
              {user.email}
            </Typography>
          </Flex>
        </Flex>
      ) : (
        <Flex gap={2}>
          <Typography color="secondary">
            You are browsing as a guest. Sign in to manage bookings and loyalty.
          </Typography>
          <Button
            fullWidth
            onPress={() =>
              router.push({
                pathname: "/sign-in",
                params: { next: "/profile" },
              })
            }
          >
            Sign in
          </Button>
          <Button
            fullWidth
            color="secondary"
            variant="outlined"
            onPress={() =>
              router.push({
                pathname: "/sign-up",
                params: { next: "/profile" },
              })
            }
          >
            Create account
          </Button>
        </Flex>
      )}

      {user ? (
        <Button
          color="secondary"
          variant="outlined"
          onPress={() => void logout()}
        >
          Sign out
        </Button>
      ) : null}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, colors }) => ({
  screen: {
    padding: space(2),
    backgroundColor: colors.background,
  },
}));
