import { ScrollView } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { SearchIcon, StarIcon } from "@/assets";
import {
  Button,
  Chip,
  Divider,
  Empty,
  Flex,
  InlineAlert,
  Input,
  Loader,
  Typography,
  UserAvatar,
} from "@/components";
import { Skeleton } from "@/components/skeleton";
import type { TypographySize, TypographyWeight } from "@/components/typography";

const TYPE_SIZES: TypographySize[] = [
  "text-xs",
  "text-sm",
  "text-md",
  "text-lg",
  "text-xl",
  "display-xs",
  "display-sm",
  "display-md",
];

const TYPE_WEIGHTS: TypographyWeight[] = [
  "regular",
  "medium",
  "semibold",
  "bold",
];

export function DemoFeature() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Flex gap={2}>
        <Typography size="display-xs" weight="bold">
          Component kit
        </Typography>
        <Typography color="secondary">
          DM Sans · Forest & Gold · soft radius
        </Typography>

        <Divider spacing={1} />

        <Typography weight="semibold">Typography scale</Typography>
        <Flex gap={1.5}>
          {TYPE_SIZES.map((size) => (
            <Flex key={size} gap={0.5}>
              <Typography size="text-xs" color="muted" weight="medium">
                {size}
              </Typography>
              <Flex gap={0.5}>
                {TYPE_WEIGHTS.map((weight) => (
                  <Typography key={weight} size={size} weight={weight}>
                    {weight} — Book a table tonight
                  </Typography>
                ))}
              </Flex>
            </Flex>
          ))}
        </Flex>

        <Typography size="text-sm" color="secondary">
          Secondary body · accent below
        </Typography>
        <Typography size="text-sm" color="accent">
          Accent gold
        </Typography>

        <Typography weight="semibold">Buttons</Typography>
        <Flex gap={1} direction="row" flexWrap="wrap">
          <Button>Book a table</Button>
          <Button variant="outlined" color="secondary">
            Cancel
          </Button>
          <Button variant="ghost" color="primary">
            Ghost
          </Button>
          <Button color="error" size="sm">
            Leave waitlist
          </Button>
        </Flex>

        <Typography weight="semibold">Input</Typography>
        <Input label="Party size" placeholder="2" helperText="Guests" />
        <Input
          label="Notes"
          error
          helperText="Required"
          placeholder="Allergy…"
        />

        <Typography weight="semibold">Chips</Typography>
        <Flex gap={1} direction="row" flexWrap="wrap">
          <Chip selected icon={<SearchIcon />}>
            Italian
          </Chip>
          <Chip icon={<StarIcon />}>Outdoor</Chip>
          <Chip>$$</Chip>
        </Flex>

        <Typography weight="semibold">Feedback</Typography>
        <InlineAlert
          tone="success"
          title="Confirmed"
          message="Table for 2 at 7:30 PM."
        />
        <InlineAlert
          tone="warning"
          message="Deposit required for this seating."
        />
        <InlineAlert
          tone="error"
          title="Unavailable"
          message="That slot just filled."
        />

        <Typography weight="semibold">Avatar / Loader / Skeleton</Typography>
        <Flex gap={1.5} direction="row" alignItems="center">
          <UserAvatar firstName="Ada" lastName="Lovelace" />
          <Loader size="small" />
          <Skeleton width={120} height={16} />
        </Flex>

        <Empty title="No results" description="Try another neighborhood.">
          <Button size="sm">Clear filters</Button>
        </Empty>
      </Flex>
    </ScrollView>
  );
}

const styles = StyleSheet.create(({ space, colors }) => ({
  content: {
    padding: space(2),
    paddingBottom: space(6),
    backgroundColor: colors.background,
  },
}));
