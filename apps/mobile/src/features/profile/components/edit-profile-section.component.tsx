import { type ReactNode } from "react";

import { Flex, Typography } from "@/components";

export type EditProfileSectionProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function EditProfileSection({
  title,
  description,
  children,
}: EditProfileSectionProps) {
  return (
    <Flex gap={1.5}>
      <Flex gap={0.5}>
        <Typography size="text-lg" weight="semibold">
          {title}
        </Typography>
        <Typography size="text-sm" color="secondary">
          {description}
        </Typography>
      </Flex>
      <Flex gap={2}>{children}</Flex>
    </Flex>
  );
}
