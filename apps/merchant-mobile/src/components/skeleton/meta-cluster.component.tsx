import { Flex } from "@/components";

import { Skeleton } from "./skeleton.component";

export type MetaClusterProps = {
  textWidth: number;
};

/** Icon + label bone used by ops list card skeletons (reservations, waitlist). */
export function MetaCluster({ textWidth }: MetaClusterProps) {
  return (
    <Flex direction="row" alignItems="center" gap={0.5}>
      <Skeleton width={14} height={14} radius="sm" />
      <Skeleton width={textWidth} height={12} radius="md" />
    </Flex>
  );
}
