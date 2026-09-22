import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { ChevronLeftIcon } from "@/assets";
import { Button, Empty, Flex, IconButton, InlineAlert, Typography } from "@/components";

export type ReservationDetailChromeProps = {
  onBack: () => void;
};

export function ReservationDetailChrome({
  onBack,
}: ReservationDetailChromeProps) {
  return (
    <Flex direction="row" alignItems="center" style={styles.topBar}>
      <IconButton
        icon={<ChevronLeftIcon />}
        variant="surface"
        size="sm"
        onPress={onBack}
        accessibilityLabel="Go back"
        style={styles.chromeBtn}
      />
      <Typography weight="semibold" size="text-lg" style={styles.topTitle}>
        Reservation
      </Typography>
      <View style={styles.chromeBtn} />
    </Flex>
  );
}

export type ReservationDetailErrorStateProps = {
  message: string;
  onRetry: () => void;
};

export function ReservationDetailErrorState({
  message,
  onRetry,
}: ReservationDetailErrorStateProps) {
  return (
    <View style={styles.pad}>
      <InlineAlert tone="error" message={message} />
      <Button
        fullWidth
        size="lg"
        variant="outlined"
        style={styles.retryBtn}
        onPress={onRetry}
      >
        Try again
      </Button>
    </View>
  );
}

export type ReservationDetailNotFoundProps = {
  onBack: () => void;
};

export function ReservationDetailNotFound({
  onBack,
}: ReservationDetailNotFoundProps) {
  return (
    <View style={styles.pad}>
      <Empty
        title="Reservation not found"
        description="It may have been deleted, or you may not have access to this booking."
      >
        <Button size="md" variant="outlined" onPress={onBack}>
          Go back
        </Button>
      </Empty>
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  topBar: {
    paddingHorizontal: space(2),
    paddingBottom: space(1.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.secondarySubtle,
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
  },
  chromeBtn: {
    width: space(5),
    height: space(5),
    borderRadius: radius.full,
  },
  pad: {
    padding: space(2),
    gap: space(1.5),
  },
  retryBtn: {
    marginTop: space(1.5),
  },
}));
