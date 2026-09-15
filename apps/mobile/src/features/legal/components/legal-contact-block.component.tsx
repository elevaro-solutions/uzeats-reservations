import { Linking, Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { MailIcon, MapPinIcon, PhoneIcon } from "@/assets";
import { Flex, Typography } from "@/components";

import {
  COMPANY_ADDRESS_DISPLAY,
  COMPANY_PHONE_DISPLAY,
  COMPANY_PHONE_E164,
  SUPPORT_EMAIL,
} from "../helpers/legal.constants";

function openUrl(url: string) {
  Linking.openURL(url).catch(() => undefined);
}

export function LegalContactBlock() {
  const { theme } = useUnistyles();
  const iconColor = theme.colors.primary;

  return (
    <Flex gap={1}>
      <Pressable
        onPress={() => openUrl(`mailto:${SUPPORT_EMAIL}`)}
        accessibilityRole="link"
        accessibilityLabel={`Email ${SUPPORT_EMAIL}`}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <View style={styles.iconWell}>
          <MailIcon size={18} color={iconColor} />
        </View>
        <Flex flex={1} gap={0.25}>
          <Typography size="text-xs" color="muted">
            Email
          </Typography>
          <Typography size="text-sm" weight="medium" color="primary">
            {SUPPORT_EMAIL}
          </Typography>
        </Flex>
      </Pressable>

      <Pressable
        onPress={() => openUrl(`tel:${COMPANY_PHONE_E164}`)}
        accessibilityRole="link"
        accessibilityLabel={`Call ${COMPANY_PHONE_DISPLAY}`}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <View style={styles.iconWell}>
          <PhoneIcon size={18} color={iconColor} />
        </View>
        <Flex flex={1} gap={0.25}>
          <Typography size="text-xs" color="muted">
            Phone
          </Typography>
          <Typography size="text-sm" weight="medium" color="primary">
            {COMPANY_PHONE_DISPLAY}
          </Typography>
        </Flex>
      </Pressable>

      <Pressable
        onPress={() =>
          openUrl(
            `https://maps.google.com/?q=${encodeURIComponent(COMPANY_ADDRESS_DISPLAY)}`,
          )
        }
        accessibilityRole="link"
        accessibilityLabel={`Open map for ${COMPANY_ADDRESS_DISPLAY}`}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <View style={styles.iconWell}>
          <MapPinIcon size={18} color={iconColor} />
        </View>
        <Flex flex={1} gap={0.25}>
          <Typography size="text-xs" color="muted">
            Address
          </Typography>
          <Typography size="text-sm" weight="medium">
            {COMPANY_ADDRESS_DISPLAY}
          </Typography>
        </Flex>
      </Pressable>
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(1.5),
    paddingVertical: space(1.25),
    paddingHorizontal: space(1.5),
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate3,
    backgroundColor: colors.background,
  },
  rowPressed: {
    backgroundColor: colors.slate2,
  },
  iconWell: {
    width: space(4.5),
    height: space(4.5),
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.slate2,
  },
}));
