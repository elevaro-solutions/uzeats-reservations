import { Path } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export function WineIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M8 22h8" />
      <Path d="M7 10h10" />
      <Path d="M12 15v7" />
      <Path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z" />
    </SvgWrapper>
  );
}
