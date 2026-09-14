import { type ReactElement } from "react";
import { Linking, Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import {
  GlobeIcon,
  InstagramIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
} from "@/assets";
import { Flex, Typography } from "@/components";
import { IconPropsType } from "@/types";

import {
  HELP_ADDRESS_DISPLAY,
  HELP_INSTAGRAM_HANDLE,
  HELP_INSTAGRAM_URL,
  HELP_PHONE_DISPLAY,
  HELP_PHONE_E164,
  HELP_SUPPORT_EMAIL,
  HELP_WEBSITE_LABEL,
  HELP_WEBSITE_URL,
} from "../helpers/help-center.content";

type ContactTile = {
  label: string;
  value: string;
  icon: ReactElement<IconPropsType>;
  onPress: () => void;
  accessibilityLabel: string;
};

function openUrl(url: string) {
  Linking.openURL(url).catch(() => undefined);
}

function buildMapsUrl(): string {
  return `https://maps.google.com/?q=${encodeURIComponent(HELP_ADDRESS_DISPLAY)}`;
}

function ContactTileCard({ tile }: { tile: ContactTile }) {
  return (
    <Pressable
      onPress={tile.onPress}
      accessibilityRole="button"
      accessibilityLabel={tile.accessibilityLabel}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
    >
      <View style={styles.iconWell}>{tile.icon}</View>
      <Typography weight="semibold" size="text-sm" numberOfLines={1}>
        {tile.label}
      </Typography>
      <Typography size="text-xs" color="muted" numberOfLines={2}>
        {tile.value}
      </Typography>
    </Pressable>
  );
}

export function HelpContactSection() {
  const { theme } = useUnistyles();
  const iconColor = theme.colors.primary;

  const tiles: ContactTile[] = [
    {
      label: "Email",
      value: HELP_SUPPORT_EMAIL,
      icon: <MailIcon size={20} color={iconColor} />,
      onPress: () => openUrl(`mailto:${HELP_SUPPORT_EMAIL}`),
      accessibilityLabel: `Email ${HELP_SUPPORT_EMAIL}`,
    },
    {
      label: "Phone",
      value: HELP_PHONE_DISPLAY,
      icon: <PhoneIcon size={20} color={iconColor} />,
      onPress: () => openUrl(`tel:${HELP_PHONE_E164}`),
      accessibilityLabel: `Call ${HELP_PHONE_DISPLAY}`,
    },
    {
      label: "Website",
      value: HELP_WEBSITE_LABEL,
      icon: <GlobeIcon size={20} color={iconColor} />,
      onPress: () => openUrl(HELP_WEBSITE_URL),
      accessibilityLabel: `Open ${HELP_WEBSITE_LABEL}`,
    },
    {
      label: "Instagram",
      value: HELP_INSTAGRAM_HANDLE,
      icon: <InstagramIcon size={20} color={iconColor} />,
      onPress: () => openUrl(HELP_INSTAGRAM_URL),
      accessibilityLabel: `Open Instagram ${HELP_INSTAGRAM_HANDLE}`,
    },
  ];

  const rows = [tiles.slice(0, 2), tiles.slice(2, 4)];

  return (
    <Flex gap={1.25}>
      {rows.map((row, rowIndex) => (
        <Flex key={rowIndex} direction="row" gap={1.25}>
          {row.map((tile) => (
            <View key={tile.label} style={styles.tileWrap}>
              <ContactTileCard tile={tile} />
            </View>
          ))}
        </Flex>
      ))}

      <Pressable
        onPress={() => openUrl(buildMapsUrl())}
        accessibilityRole="button"
        accessibilityLabel={`Open map for ${HELP_ADDRESS_DISPLAY}`}
        style={({ pressed }) => [
          styles.addressCard,
          pressed && styles.tilePressed,
        ]}
      >
        <View style={styles.iconWell}>
          <MapPinIcon size={20} color={iconColor} />
        </View>
        <Flex flex={1} gap={0.25} style={styles.addressCopy}>
          <Typography weight="semibold" size="text-sm">
            Address
          </Typography>
          <Typography size="text-xs" color="muted">
            {HELP_ADDRESS_DISPLAY}
          </Typography>
        </Flex>
      </Pressable>
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, colors, radius, shadows }) => ({
  tileWrap: {
    flex: 1,
  },
  tile: {
    flex: 1,
    gap: space(0.75),
    padding: space(1.75),
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate3,
    backgroundColor: colors.background,
    ...shadows.soft,
  },
  tilePressed: {
    backgroundColor: colors.slate2,
  },
  iconWell: {
    width: space(4.5),
    height: space(4.5),
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.slate2,
    marginBottom: space(0.5),
  },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(1.5),
    padding: space(1.75),
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate3,
    backgroundColor: colors.background,
    ...shadows.soft,
  },
  addressCopy: {
    minWidth: 0,
  },
}));
