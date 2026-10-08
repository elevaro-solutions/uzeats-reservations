import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { PencilIcon } from "@/assets";
import { Flex, IconButton, Typography, UserAvatar } from "@/components";

export type ProfileIdentityCardProps = {
  firstName: string;
  lastName: string;
  email?: string | null;
  avatarUrl?: string | null;
  address?: {
    line1?: string | null;
    city?: string | null;
    state?: string | null;
  } | null;
  onEdit: () => void;
};

function IdentityMetaRow({ label, value }: { label: string; value: string }) {
  return (
    <Flex direction="row" alignItems="flex-start" gap={1.5}>
      <Typography
        size="text-xs"
        color="muted"
        weight="medium"
        style={styles.metaLabel}
      >
        {label}
      </Typography>
      <Typography size="text-sm" numberOfLines={2} style={styles.metaValue}>
        {value}
      </Typography>
    </Flex>
  );
}

export function ProfileIdentityCard({
  firstName,
  lastName,
  email,
  avatarUrl,
  address,
  onEdit,
}: ProfileIdentityCardProps) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const addressDisplay = address?.line1
    ? [address.line1, address.city, address.state].filter(Boolean).join(", ")
    : "";

  return (
    <View style={styles.card}>
      <Flex gap={2} style={styles.body}>
        <Flex direction="row" alignItems="flex-start" gap={1.5}>
          <UserAvatar
            size="lg"
            firstName={firstName}
            lastName={lastName}
            avatarUrl={avatarUrl}
          />
          <Flex gap={0.25} style={styles.copy}>
            <Typography weight="semibold" size="text-lg" numberOfLines={1}>
              {fullName}
            </Typography>
            {email ? (
              <Typography size="text-sm" color="secondary" numberOfLines={1}>
                {email}
              </Typography>
            ) : null}
          </Flex>
          <IconButton
            icon={<PencilIcon />}
            variant="surface"
            size="sm"
            onPress={onEdit}
            accessibilityLabel="Edit personal info"
          />
        </Flex>

        {addressDisplay ? (
          <>
            <View style={styles.divider} />
            <IdentityMetaRow label="Address" value={addressDisplay} />
          </>
        ) : null}
      </Flex>
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate3,
    backgroundColor: colors.background,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    overflow: "hidden",
  },
  body: {
    padding: space(2.5),
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  divider: {
    height: 1,
    backgroundColor: colors.slate3,
    marginHorizontal: -space(2.5),
  },
  metaLabel: {
    width: space(9),
  },
  metaValue: {
    flex: 1,
    minWidth: 0,
  },
}));
