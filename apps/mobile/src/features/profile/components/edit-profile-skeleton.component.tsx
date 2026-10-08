import { StyleSheet } from "react-native-unistyles";

import { Flex } from "@/components";
import { Skeleton } from "@/components/skeleton";

export function EditProfileSkeleton() {
  return (
    <Flex gap={4} style={styles.wrap}>
      <Flex alignItems="center" gap={1.5}>
        <Skeleton width={80} height={80} radius="full" />
        <Skeleton width={128} height={16} />
      </Flex>
      <Flex gap={1.5}>
        <Skeleton width={120} height={22} />
        <Skeleton width="70%" height={16} />
        <Skeleton height={48} />
        <Skeleton height={48} />
        <Skeleton height={48} />
      </Flex>
      <Flex gap={1.5}>
        <Skeleton width={88} height={22} />
        <Skeleton width="55%" height={16} />
        <Skeleton height={48} />
      </Flex>
    </Flex>
  );
}

const styles = StyleSheet.create(({ space }) => ({
  wrap: {
    paddingHorizontal: space(2),
    paddingTop: space(2),
  },
}));
