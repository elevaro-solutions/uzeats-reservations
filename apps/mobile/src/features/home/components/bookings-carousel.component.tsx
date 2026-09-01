import { Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { StyleSheet } from "react-native-unistyles";

import { Flex, RemoteImage, Typography } from "@/components";

export type BookingCarouselItem = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  photo?: string | null;
  whenLabel: string;
  partySize: number;
};

export type BookingsCarouselProps = {
  items: BookingCarouselItem[];
};

export function BookingsCarousel({ items }: BookingsCarouselProps) {
  const router = useRouter();

  if (items.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {items.map((item) => (
        <Pressable
          key={item.id}
          style={styles.card}
          onPress={() =>
            router.push({
              pathname: "/reservations/[id]",
              params: { id: item.id },
            })
          }
        >
          <Flex direction="row" gap={1.5} alignItems="center">
            {item.photo ? (
              <RemoteImage
                uri={item.photo}
                style={styles.thumb}
                recyclingKey={item.id}
              />
            ) : (
              <Flex style={styles.thumbPlaceholder} />
            )}
            <Flex gap={0.25} style={styles.meta}>
              <Typography weight="semibold" numberOfLines={1}>
                {item.restaurantName}
              </Typography>
              <Typography size="text-sm" color="secondary" numberOfLines={1}>
                {item.whenLabel}
              </Typography>
              <Typography size="text-xs" color="muted">
                {item.partySize} guests
              </Typography>
            </Flex>
          </Flex>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  scroll: {
    paddingHorizontal: space(2),
    gap: space(1.5),
  },
  card: {
    width: 280,
    padding: space(1.5),
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primarySubtle,
  },
  thumb: {
    width: space(7),
    height: space(7),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  thumbPlaceholder: {
    width: space(7),
    height: space(7),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  meta: {
    flex: 1,
  },
}));
