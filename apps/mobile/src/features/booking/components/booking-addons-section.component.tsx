import { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Flex, RemoteImage, Typography } from "@/components";

import { formatCents } from "../helpers/booking-pricing.helpers";
import type {
  BookableExperience,
  BookablePackage,
  PrivateDiningSpace,
} from "../types";

export type BookingAddonsSectionProps = {
  packages: BookablePackage[];
  experiences: BookableExperience[];
  privateSpaces: PrivateDiningSpace[];
  selectedPackageId: string | null;
  selectedExperienceId: string | null;
  selectedPrivateSpaceId: string | null;
  onSelectPackage: (id: string | null) => void;
  onSelectExperience: (id: string | null) => void;
  onSelectPrivateSpace: (id: string | null) => void;
};

export function BookingAddonsSection({
  packages,
  experiences,
  privateSpaces,
  selectedPackageId,
  selectedExperienceId,
  selectedPrivateSpaceId,
  onSelectPackage,
  onSelectExperience,
  onSelectPrivateSpace,
}: BookingAddonsSectionProps) {
  const hasAny =
    packages.length > 0 || experiences.length > 0 || privateSpaces.length > 0;
  if (!hasAny) return null;

  return (
    <Flex gap={2}>
      {packages.length > 0 ? (
        <AddonGroup title="Packages">
          {packages.map((pkg) => (
            <AddonCard
              key={pkg.id}
              id={pkg.id}
              title={pkg.title}
              subtitle={pkg.description ?? undefined}
              priceLabel={formatCents(pkg.priceCents)}
              photoUrl={pkg.photoUrl}
              selected={selectedPackageId === pkg.id}
              onPress={() =>
                onSelectPackage(selectedPackageId === pkg.id ? null : pkg.id)
              }
            />
          ))}
        </AddonGroup>
      ) : null}

      {experiences.length > 0 ? (
        <AddonGroup title="Experiences">
          {experiences.map((exp) => (
            <AddonCard
              key={exp.id}
              id={exp.id}
              title={exp.title}
              subtitle={exp.description ?? undefined}
              priceLabel={formatCents(exp.ticketPriceCents)}
              photoUrl={exp.photoUrl}
              selected={selectedExperienceId === exp.id}
              onPress={() =>
                onSelectExperience(
                  selectedExperienceId === exp.id ? null : exp.id,
                )
              }
            />
          ))}
        </AddonGroup>
      ) : null}

      {privateSpaces.length > 0 ? (
        <AddonGroup title="Private dining">
          {privateSpaces.map((space) => (
            <AddonCard
              key={space.id}
              id={space.id}
              title={space.name}
              subtitle={space.description ?? undefined}
              priceLabel={formatCents(space.rentalFeeCents)}
              photoUrl={space.photoUrl}
              selected={selectedPrivateSpaceId === space.id}
              onPress={() =>
                onSelectPrivateSpace(
                  selectedPrivateSpaceId === space.id ? null : space.id,
                )
              }
            />
          ))}
        </AddonGroup>
      ) : null}
    </Flex>
  );
}

function AddonGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Flex gap={1}>
      <Typography weight="medium" size="text-sm" color="secondary">
        {title}
      </Typography>
      {children}
    </Flex>
  );
}

function AddonCard({
  title,
  subtitle,
  priceLabel,
  photoUrl,
  selected,
  onPress,
}: {
  id: string;
  title: string;
  subtitle?: string;
  priceLabel: string;
  photoUrl?: string | null;
  selected: boolean;
  onPress: () => void;
}) {
  const { theme } = useUnistyles();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        selected && {
          borderColor: theme.colors.primary,
          backgroundColor: theme.colors.primary1,
        },
      ]}
    >
      <Flex direction="row" gap={1.5} alignItems="center">
        {photoUrl ? (
          <RemoteImage uri={photoUrl} style={styles.photo} recyclingKey={title} />
        ) : (
          <View style={styles.photoPlaceholder} />
        )}
        <Flex gap={0.25} style={styles.meta}>
          <Typography weight="semibold">{title}</Typography>
          {subtitle ? (
            <Typography size="text-xs" color="secondary" numberOfLines={2}>
              {subtitle}
            </Typography>
          ) : null}
          <Typography size="text-sm" weight="medium" color="primary">
            {priceLabel}
          </Typography>
        </Flex>
      </Flex>
    </Pressable>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  card: {
    padding: space(1.5),
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  photo: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
  },
  photoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.slate3,
  },
  meta: {
    flex: 1,
  },
}));
