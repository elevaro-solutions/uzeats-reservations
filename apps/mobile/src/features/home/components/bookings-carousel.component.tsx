import { Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { useRouter } from "expo-router";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { CalendarIcon, ChevronRightIcon, ClockIcon, UserIcon } from "@/assets";
import { Flex, RemoteImage, Typography } from "@/components";

export type BookingCarouselItem = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  photo?: string | null;
  addressLabel: string | null;
  dateLabel: string;
  timeLabel: string;
  partySize: number;
};

export type BookingsCarouselProps = {
  items: BookingCarouselItem[];
};

export function BookingsCarousel({ items }: BookingsCarouselProps) {
  const router = useRouter();
  const { theme } = useUnistyles();
  const { width: windowWidth } = useWindowDimensions();
  const padX = theme.space(2);
  const cardWidth = windowWidth - padX * 2;
  const cardGap = theme.space(1.5);

  if (items.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={cardWidth + cardGap}
      snapToAlignment="start"
      style={styles.carousel}
      contentContainerStyle={styles.scroll}
    >
      {items.map((item) => {
        const guestA11y = `${item.partySize} guest${item.partySize === 1 ? "" : "s"}`;
        const accessibilityLabel = [
          item.restaurantName,
          item.addressLabel,
          item.dateLabel,
          item.timeLabel,
          guestA11y,
        ]
          .filter(Boolean)
          .join(", ");

        return (
          <View key={item.id} style={[styles.shadow, { width: cardWidth }]}>
            <Pressable
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
              onPress={() =>
                router.push({
                  pathname: "/reservations/[id]",
                  params: { id: item.id },
                })
              }
              accessibilityRole="button"
              accessibilityLabel={accessibilityLabel}
            >
              <Flex gap={1.5}>
                <Flex direction="row" gap={1.5} alignItems="center">
                  {item.photo ? (
                    <RemoteImage
                      uri={item.photo}
                      style={styles.thumb}
                      recyclingKey={item.id}
                    />
                  ) : (
                    <View style={styles.thumbPlaceholder} />
                  )}
                  <Flex gap={0.25} style={styles.headerText}>
                    <Typography weight="semibold" numberOfLines={1}>
                      {item.restaurantName}
                    </Typography>
                    {item.addressLabel ? (
                      <Typography
                        size="text-sm"
                        color="muted"
                        numberOfLines={1}
                      >
                        {item.addressLabel}
                      </Typography>
                    ) : null}
                  </Flex>
                  <ChevronRightIcon size={18} color={styles.metaIcon.color} />
                </Flex>

                <View style={styles.metaWell}>
                  <Flex
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Flex direction="row" alignItems="center" gap={0.5}>
                      <CalendarIcon size={14} color={styles.metaIcon.color} />
                      <Typography
                        size="text-xs"
                        weight="medium"
                        color="secondary"
                        numberOfLines={1}
                      >
                        {item.dateLabel}
                      </Typography>
                    </Flex>
                    <Flex direction="row" alignItems="center" gap={0.5}>
                      <ClockIcon size={14} color={styles.metaIcon.color} />
                      <Typography
                        size="text-xs"
                        weight="medium"
                        color="secondary"
                        numberOfLines={1}
                      >
                        {item.timeLabel}
                      </Typography>
                    </Flex>
                    <Flex direction="row" alignItems="center" gap={0.5}>
                      <UserIcon size={14} color={styles.metaIcon.color} />
                      <Typography
                        size="text-xs"
                        weight="medium"
                        color="secondary"
                      >
                        {item.partySize}
                      </Typography>
                    </Flex>
                  </Flex>
                </View>
              </Flex>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  carousel: {
    flexGrow: 0,
    overflow: "visible",
  },
  scroll: {
    // Room for card shadow so ScrollView does not clip it
    paddingHorizontal: space(2),
    paddingTop: space(0.5),
    paddingBottom: space(1),
    gap: space(1.5),
    overflow: "visible",
  },
  shadow: {
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    shadowColor: colors.slate12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  card: {
    padding: space(1.5),
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate3,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  cardPressed: {
    opacity: 0.92,
  },
  thumb: {
    width: space(6),
    height: space(6),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  thumbPlaceholder: {
    width: space(6),
    height: space(6),
    borderRadius: radius.md,
    backgroundColor: colors.slate3,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  metaWell: {
    paddingHorizontal: space(1.5),
    paddingVertical: space(1),
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  metaIcon: {
    color: colors.textMuted,
  },
}));
