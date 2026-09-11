import { Circle, Path } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export type UserIconProps = IconPropsType & {
  filled?: boolean;
};

export function UserIcon({ filled = false, ...props }: UserIconProps) {
  if (filled) {
    return (
      <SvgWrapper {...props} filled>
        <Path d="M17 7A5 5 0 117 7a5 5 0 0110 0z" />
        <Path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M19 22a1 1 0 001-1v-2a5 5 0 00-5-5H9a5 5 0 00-5 5v2a1 1 0 001 1h14z"
        />
      </SvgWrapper>
    );
  }

  return (
    <SvgWrapper {...props}>
      <Path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <Circle cx={12} cy={7} r={4} />
    </SvgWrapper>
  );
}
