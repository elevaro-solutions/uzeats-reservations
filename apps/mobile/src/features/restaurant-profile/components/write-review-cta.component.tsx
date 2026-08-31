import { useRouter } from "expo-router";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { StarIcon } from "@/assets";
import { Button, Flex, Typography } from "@/components";

export type WriteReviewCtaState =
  | "eligible"
  | "already_reviewed"
  | "not_eligible"
  | "sign_in_required";

export type WriteReviewCtaProps = {
  state: WriteReviewCtaState;
  restaurantId: string;
  onPress: () => void;
};

export function WriteReviewCta({
  state,
  restaurantId,
  onPress,
}: WriteReviewCtaProps) {
  const router = useRouter();
  const { theme } = useUnistyles();

  if (state === "not_eligible") {
    return (
      <Typography size="text-sm" color="muted">
        Reviews are available after your visit.
      </Typography>
    );
  }

  if (state === "already_reviewed") {
    return (
      <Flex direction="row" alignItems="center" gap={1} style={styles.statusRow}>
        <StarIcon size={16} filled color={theme.colors.success} />
        <Typography size="text-sm" color="secondary">
          You&apos;ve already reviewed this restaurant
        </Typography>
      </Flex>
    );
  }

  if (state === "sign_in_required") {
    return (
      <Flex gap={1.5}>
        <Typography size="text-sm" color="secondary">
          Sign in to share your experience
        </Typography>
        <Button
          color="secondary"
          fullWidth
          onPress={() =>
            router.push({
              pathname: "/sign-in",
              params: { next: `/restaurant/${restaurantId}` },
            })
          }
        >
          Sign in
        </Button>
      </Flex>
    );
  }

  return (
    <Button color="secondary" fullWidth onPress={onPress}>
      Add your review
    </Button>
  );
}

const styles = StyleSheet.create(({ space }) => ({
  statusRow: {
    paddingVertical: space(0.5),
  },
}));
