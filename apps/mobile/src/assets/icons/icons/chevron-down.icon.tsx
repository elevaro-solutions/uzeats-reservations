import { Path } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export function ChevronDownIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="m6 9 6 6 6-6" />
    </SvgWrapper>
  );
}
