import { useRouter } from "expo-router";
import { StyleSheet } from "react-native-unistyles";

import { Button, Empty, Flex } from "@/components";
import { useAuth } from "@/graphql";

export function ReservationsFeature() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return null;
  }

  return (
    <Flex flex={1} style={styles.screen} justifyContent="center">
      <Empty
        title={user ? "No reservations yet" : "Sign in to see reservations"}
        description={
          user
            ? "When you book a table, it will show up here."
            : "Your upcoming and past bookings will appear on this tab."
        }
      >
        {!user ? (
          <Button
            onPress={() =>
              router.push({
                pathname: "/sign-in",
                params: { next: "/reservations" },
              })
            }
          >
            Sign in
          </Button>
        ) : null}
      </Empty>
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, colors }) => ({
  screen: {
    padding: space(2),
    backgroundColor: colors.background,
  },
}));
