import { ReactElement, ReactNode } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { FolderOpenIcon } from "@/assets";
import { renderIcon } from "@/lib/helpers";
import { IconPropsType } from "@/types";

import { Flex } from "../flex";
import { Typography } from "../typography";

export type EmptyProps = {
  title?: string;
  description?: string;
  children?: ReactNode;
  icon?: ReactElement<IconPropsType>;
  style?: StyleProp<ViewStyle>;
};

export function Empty({
  title = "Nothing here yet",
  description = "Check back soon or try a different search.",
  children,
  icon = <FolderOpenIcon />,
  style,
}: EmptyProps) {
  return (
    <Flex gap={2} alignItems="center" style={[styles.wrapper, style]}>
      {renderIcon({ icon, style: styles.icon })}
      <Flex gap={0.5} alignItems="center">
        <Typography align="center" size="text-lg" weight="semibold">
          {title}
        </Typography>
        <Typography size="text-sm" align="center" color="secondary">
          {description}
        </Typography>
      </Flex>
      {children ? (
        <Flex gap={1} direction="row" justifyContent="center">
          {children}
        </Flex>
      ) : null}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, colors }) => ({
  wrapper: {
    paddingVertical: space(2),
  },
  icon: {
    width: 40,
    height: 40,
    color: colors.primary,
  },
}));
