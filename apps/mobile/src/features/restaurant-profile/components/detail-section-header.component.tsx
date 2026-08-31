import type { ReactNode } from "react";

import { Flex, Typography } from "@/components";

export type DetailSectionHeaderProps = {
  title: string;
};

export function DetailSectionHeader({ title }: DetailSectionHeaderProps) {
  return (
    <Typography size="text-md" weight="semibold" color="textPrimary">
      {title}
    </Typography>
  );
}

/** Thin open section wrapper: title + content, no card chrome. */
export function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Flex gap={1.5}>
      <DetailSectionHeader title={title} />
      {children}
    </Flex>
  );
}
