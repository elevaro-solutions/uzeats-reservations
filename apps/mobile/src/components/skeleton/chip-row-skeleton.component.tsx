import { Flex } from "@/components/flex";

import { Skeleton } from "./skeleton.component";

export type ChipRowSkeletonProps = {
  widths: readonly number[];
  height?: number;
  rows?: 1 | 2;
  wrap?: boolean;
};

export function ChipRowSkeleton({
  widths,
  height = 36,
  rows = 1,
  wrap = false,
}: ChipRowSkeletonProps) {
  if (rows === 2) {
    const midpoint = Math.ceil(widths.length / 2);
    const row1 = widths.slice(0, midpoint);
    const row2 = widths.slice(midpoint);

    return (
      <Flex gap={1}>
        <Flex direction="row" gap={1} flexWrap={wrap ? "wrap" : undefined}>
          {row1.map((width, index) => (
            <Skeleton key={`row1-${index}`} width={width} height={height} radius="lg" />
          ))}
        </Flex>
        {row2.length > 0 ? (
          <Flex direction="row" gap={1} flexWrap={wrap ? "wrap" : undefined}>
            {row2.map((width, index) => (
              <Skeleton key={`row2-${index}`} width={width} height={height} radius="lg" />
            ))}
          </Flex>
        ) : null}
      </Flex>
    );
  }

  return (
    <Flex direction="row" gap={1} flexWrap={wrap ? "wrap" : undefined}>
      {widths.map((width, index) => (
        <Skeleton key={index} width={width} height={height} radius="lg" />
      ))}
    </Flex>
  );
}
