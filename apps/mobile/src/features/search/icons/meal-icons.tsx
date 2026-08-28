import { Path, Circle } from "react-native-svg";

import { SvgWrapper } from "@/assets/icons/components/svg-wrapper.component";
import type { IconPropsType } from "@/types";

/** Official Lucide `coffee` (exact path data). */
export function CoffeeMealIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M10 2v2 M14 2v2 M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1 M6 2v2" />
    </SvgWrapper>
  );
}

/** Official Lucide `soup` (exact path data). */
export function SoupMealIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9z M7 21h10 M19.5 12L22 6 M16.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.73 1.62 M11.25 3c.27.1.8.53.74 1.36-.05.83-.93 1.2-.98 2.02-.06.78.33 1.24.72 1.62 M6.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.74 1.62" />
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
