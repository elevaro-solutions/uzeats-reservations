import { Path } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export function PartyPopperIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M5.8 11.3 2 22l10.7-3.79" />
      <Path d="M4 3h.01" />
      <Path d="M22 8h.01" />
      <Path d="M15 2h.01" />
      <Path d="M22 20h.01" />
      <Path d="m22 2-2 2.5" />
      <Path d="M22 8l-2-2.5" />
      <Path d="M8 22l2-2.5" />
      <Path d="M14 22l-2-2.5" />
    </SvgWrapper>
  );
}
