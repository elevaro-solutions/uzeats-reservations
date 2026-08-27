import { Path, Circle } from "react-native-svg";

import { SvgWrapper } from "@/assets/icons/components/svg-wrapper.component";
import type { IconPropsType } from "@/types";

export function SunriseMealIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M12 2v2" />
      <Path d="m4.93 4.93 1.41 1.41" />
      <Path d="M20 12h2" />
      <Path d="m19.07 4.93-1.41 1.41" />
      <Path d="M15.95 14.95A4 4 0 0 0 12 12a4 4 0 0 0-3.95 2.95" />
      <Path d="M13 22H7" />
      <Path d="M17 22H5" />
      <Path d="M12 10a4 4 0 0 0-4 4h8a4 4 0 0 0-4-4Z" />
    </SvgWrapper>
  );
}

export function SunMealIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Circle cx={12} cy={12} r={4} />
      <Path d="M12 2v2" />
      <Path d="M12 20v2" />
      <Path d="m4.93 4.93 1.41 1.41" />
      <Path d="m17.66 17.66 1.41 1.41" />
      <Path d="M2 12h2" />
      <Path d="M20 12h2" />
      <Path d="m6.34 17.66-1.41 1.41" />
      <Path d="m19.07 4.93-1.41 1.41" />
    </SvgWrapper>
  );
}

export function MoonMealIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </SvgWrapper>
  );
}
