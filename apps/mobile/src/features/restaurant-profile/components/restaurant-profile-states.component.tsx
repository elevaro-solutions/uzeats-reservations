import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Button, Empty, Flex, InlineAlert, Skeleton } from "@/components";

export function RestaurantProfileLoading() {
  const { theme } = useUnistyles();

  return (
    <Flex flex={1} style={styles.root}>
      <StatusBar style="dark" />
      <Skeleton height={theme.space(40)} radius="lg" />
      <Flex gap={2} style={styles.body}>
        <Skeleton height={28} width="60%" />
        <Skeleton height={18} width="80%" />
        <Skeleton height={48} />
        <Skeleton height={40} />
        <Skeleton height={120} />
      </Flex>
    </Flex>
  );
}

export type RestaurantProfileErrorProps = {
  message: string;
  onRetry: () => void;
};

export function RestaurantProfileError({
  message,
  onRetry,
}: RestaurantProfileErrorProps) {
  return (
    <Flex gap={2} style={styles.body}>
      <StatusBar style="dark" />
      <InlineAlert
        tone="error"
        title="Couldn't load restaurant"
        message={message}
      />
      <Button variant="outlined" color="secondary" onPress={onRetry}>
        Try again
      </Button>
    </Flex>
  );
}

export function RestaurantProfileNotFound() {
  const router = useRouter();

  return (
    <Flex flex={1} justifyContent="center" style={styles.body}>
      <StatusBar style="dark" />
      <Empty
        title="Restaurant not found"
        description="It may have been removed or is no longer listed."
      >
        <Button
          variant="outlined"
          color="secondary"
          onPress={() => router.back()}
        >
          Go back
        </Button>
      </Empty>
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, colors }) => ({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    padding: space(2),
    flex: 1,
    backgroundColor: colors.background,
  },
}));
