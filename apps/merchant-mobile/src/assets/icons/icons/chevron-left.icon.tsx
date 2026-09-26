import { Path } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export function ChevronLeftIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="m15 18-6-6 6-6" />
    </SvgWrapper>
  );
}
