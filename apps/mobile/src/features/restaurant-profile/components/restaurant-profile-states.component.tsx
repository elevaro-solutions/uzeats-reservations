import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChevronLeftIcon } from "@/assets";
import {
  Button,
  Empty,
  Flex,
  IconButton,
  InlineAlert,
} from "@/components";
import { Skeleton } from "@/components/skeleton";

export function RestaurantProfileLoading() {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const heroHeight = theme.space(40) + insets.top;
  const footerPad = Math.max(insets.bottom, theme.space(2)) + theme.space(9);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <View
        pointerEvents="box-none"
        style={[styles.overlayBar, { paddingTop: insets.top + theme.space(1) }]}
      >
        <Flex
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <IconButton
            icon={<ChevronLeftIcon />}
            variant="surface"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.chrome}
          />
          <Flex direction="row" alignItems="center" gap={1}>
            <Skeleton width={44} height={44} radius="full" />
            <Skeleton width={44} height={44} radius="full" />
          </Flex>
        </Flex>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: footerPad }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { height: heroHeight }]}>
          <Skeleton height={heroHeight} />
        </View>

        <View style={styles.sheet}>
          <Flex gap={2} style={styles.body}>
            <Flex gap={1.5}>
              <Skeleton height={30} width="68%" />
              <Skeleton height={20} width="52%" />
              <Skeleton height={20} width="88%" />
              <Skeleton height={48} radius="md" />
            </Flex>

            <Flex direction="row" gap={1} style={styles.actions}>
              <View style={styles.actionSlot}>
                <Skeleton height={62} radius="md" />
              </View>
              <View style={styles.actionSlot}>
                <Skeleton height={62} radius="md" />
              </View>
              <View style={styles.actionSlot}>
                <Skeleton height={62} radius="md" />
              </View>
            </Flex>

            <View style={styles.tabs}>
              <Flex direction="row" gap={2} style={styles.tabsRow}>
                <Skeleton height={20} width={64} />
                <Skeleton height={20} width={52} />
                <Skeleton height={20} width={68} />
                <Skeleton height={20} width={56} />
              </Flex>
            </View>

            <Flex gap={2} style={styles.panel}>
              <Skeleton height={18} width="36%" />
              <Skeleton height={14} width="100%" />
              <Skeleton height={14} width="94%" />
              <Skeleton height={14} width="78%" />
              <Skeleton height={88} radius="md" />
              <Skeleton height={18} width="42%" />
              <Skeleton height={64} radius="md" />
            </Flex>
          </Flex>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, theme.space(2)) },
        ]}
      >
        <Skeleton height={48} radius="md" />
      </View>
    </View>
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
    <Flex gap={2} style={styles.errorBody}>
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
    <Flex flex={1} justifyContent="center" style={styles.errorBody}>
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

const styles = StyleSheet.create(({ space, colors, radius, shadows }) => ({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  overlayBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: space(2),
    paddingBottom: space(1),
  },
  chrome: {
    backgroundColor: colors.background,
    opacity: 0.94,
    borderRadius: radius.full,
  },
  hero: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: colors.slate3,
  },
  sheet: {
    marginTop: -space(2.5),
    backgroundColor: colors.background,
    borderTopLeftRadius: space(3),
    borderTopRightRadius: space(3),
    overflow: "hidden",
  },
  body: {
    paddingHorizontal: space(2),
    paddingTop: space(2.5),
    paddingBottom: space(2),
  },
  actions: {
    marginTop: space(0.5),
  },
  actionSlot: {
    flex: 1,
  },
  tabs: {
    marginHorizontal: -space(2),
    marginTop: space(0.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.slate3,
    minHeight: 44,
    justifyContent: "center",
  },
  tabsRow: {
    paddingHorizontal: space(2),
    paddingVertical: space(1.5),
    alignItems: "center",
  },
  panel: {
    paddingTop: space(0.5),
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    paddingHorizontal: space(2),
    paddingTop: space(1.5),
    borderTopWidth: 1,
    borderTopColor: colors.slate3,
    backgroundColor: colors.background,
    ...shadows.stickyFooter,
  },
  errorBody: {
    padding: space(2),
    flex: 1,
    backgroundColor: colors.background,
  },
}));
