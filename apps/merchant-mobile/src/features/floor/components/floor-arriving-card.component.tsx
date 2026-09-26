import { Pressable } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { CheckIcon, ClockIcon, UsersIcon } from "@/assets";
import { Flex, Typography, UserAvatar } from "@/components";
import { formatSlotDateTime, guestDisplayName } from "@/lib/helpers";

export type FloorArrivingCardItem = {
  id: string;
  partySize: number;
  slotStart: string;
  diner?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null;
};

export type FloorArrivingCardProps = {
  item: FloorArrivingCardItem;
  timeZone?: string;
  selected?: boolean;
  onPress: () => void;
};

export function FloorArrivingCard({
  item,
  timeZone,
  selected = false,
  onPress,
}: FloorArrivingCardProps) {
  const { theme } = useUnistyles();
  const name = guestDisplayName(item.diner);
  const partyLabel =
    item.partySize === 1 ? "1 guest" : `${item.partySize} guests`;
  const slotLabel = formatSlotDateTime(item.slotStart, timeZone);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${name}, ${partyLabel}, ${slotLabel}${
        selected ? ", selected" : ""
      }`}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.pressed,
      ]}
    >
      <Flex direction="row" alignItems="center" gap={1.5}>
        <UserAvatar
          firstName={item.diner?.firstName ?? undefined}
          lastName={item.diner?.lastName ?? undefined}
          size="md"
          variant="subtle"
        />
        <Flex flex={1} gap={0.5} style={styles.copy}>
          <Typography weight="semibold" size="text-md" numberOfLines={1}>
            {name}
          </Typography>
          <Flex direction="row" alignItems="center" gap={1} style={styles.meta}>
            <Flex direction="row" alignItems="center" gap={0.5}>
              <UsersIcon size={14} color={theme.colors.textMuted} />
              <Typography size="text-sm" color="muted">
                {partyLabel}
              </Typography>
            </Flex>
            <Typography size="text-sm" color="muted">
              ·
            </Typography>
            <Flex
              direction="row"
              alignItems="center"
              gap={0.5}
              style={styles.metaShrink}
            >
              <ClockIcon size={14} color={theme.colors.textMuted} />
              <Typography size="text-sm" color="muted" numberOfLines={1}>
                {slotLabel}
              </Typography>
            </Flex>
          </Flex>
        </Flex>
        {selected ? (
          <CheckIcon size={18} color={theme.colors.primary} />
        ) : null}
      </Flex>
    </Pressable>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  card: {
    minHeight: space(8),
    paddingVertical: space(1.5),
    paddingHorizontal: space(2),
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  cardSelected: {
    backgroundColor: colors.primary1,
    borderColor: colors.primary3,
  },
  pressed: {
    opacity: 0.85,
  },
  copy: {
    minWidth: 0,
  },
  meta: {
    flexWrap: "wrap",
    minWidth: 0,
  },
  metaShrink: {
    minWidth: 0,
    flexShrink: 1,
  },
}));
