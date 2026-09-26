import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MoreHorizontalIcon } from "@/assets";
import { Button, Flex, IconButton } from "@/components";

import { reservationActionIcon } from "../helpers/reservation-action-icon.helpers";
import type { ReservationAction } from "../helpers/reservation-status.helpers";

export type ReservationDetailFooterProps = {
  primary: ReservationAction | null;
  hasSecondary: boolean;
  loading?: boolean;
  onPrimary: () => void;
  onMore: () => void;
};

export function ReservationDetailFooter({
  primary,
  hasSecondary,
  loading,
  onPrimary,
  onMore,
}: ReservationDetailFooterProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();

  if (!primary && !hasSecondary) return null;

  return (
    <View
      style={[
        styles.footer,
        { paddingBottom: Math.max(insets.bottom, theme.space(2)) },
      ]}
    >
      <Flex direction="row" alignItems="center" gap={1}>
        {primary ? (
          <View style={styles.primaryBtn}>
            <Button
              fullWidth
              size="xl"
              loading={loading}
              startIcon={reservationActionIcon(primary.status)}
              onPress={onPrimary}
            >
              {primary.label}
            </Button>
          </View>
        ) : null}
        {hasSecondary ? (
          <IconButton
            icon={<MoreHorizontalIcon />}
            variant="surface"
            size="md"
            disabled={loading}
            onPress={onMore}
            accessibilityLabel="More actions"
            style={styles.moreBtn}
          />
        ) : null}
      </Flex>
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors, radius, shadows }) => ({
  footer: {
    paddingHorizontal: space(2),
    paddingTop: space(1.5),
    borderTopWidth: 1,
    borderTopColor: colors.slate3,
    backgroundColor: colors.background,
    ...shadows.stickyFooter,
  },
  primaryBtn: {
    flex: 1,
  },
  moreBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.slate5,
    backgroundColor: colors.white,
  },
}));
