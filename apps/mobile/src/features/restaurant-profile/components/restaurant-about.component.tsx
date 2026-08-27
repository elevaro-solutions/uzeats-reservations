import { useState } from "react";

import { Button, Flex, Typography } from "@/components";

const DESCRIPTION_TRUNCATE_LENGTH = 180;

export type RestaurantAboutProps = {
  description: string;
};

export function RestaurantAbout({ description }: RestaurantAboutProps) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = description.trim();

  if (!trimmed) return null;

  const isLong = trimmed.length > DESCRIPTION_TRUNCATE_LENGTH;

  return (
    <Flex gap={0.75}>
      <Typography weight="semibold" size="text-lg">
        About
      </Typography>
      <Typography color="secondary" size="text-sm">
        {expanded || !isLong
          ? trimmed
          : `${trimmed.slice(0, DESCRIPTION_TRUNCATE_LENGTH).trim()}…`}
      </Typography>
      {isLong ? (
        <Button
          size="sm"
          variant="text"
          color="primary"
          onPress={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : "Show more"}
        </Button>
      ) : null}
    </Flex>
  );
}
