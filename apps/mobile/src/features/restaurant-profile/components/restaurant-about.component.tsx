import { useState } from "react";

import { Button, Flex, Typography } from "@/components";

import { DetailSection } from "./detail-section-header.component";

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
    <DetailSection title="About">
      <Flex gap={0.75}>
        <Typography color="secondary" size="text-sm" weight="regular">
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
    </DetailSection>
  );
}
