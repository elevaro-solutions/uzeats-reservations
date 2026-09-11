import { Path } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export type SparklesIconProps = IconPropsType & {
  filled?: boolean;
};

const SPARKLES_FILLED =
  "M23.003 12a2.002 2.002 0 01-1.633 1.966l-5.556 1.05a1.002 1.002 0 00-.798.798l-1.05 5.555A2.001 2.001 0 0112 23.003a2 2 0 01-1.966-1.633l-1.051-5.556a1 1 0 00-.797-.798l-5.556-1.05a2 2 0 01-.17-3.892l.17-.04 5.556-1.051a1 1 0 00.797-.797l1.05-5.556.04-.17a2.001 2.001 0 013.893.17l1.05 5.556a1.002 1.002 0 00.798.797l5.555 1.05A2.003 2.003 0 0123.003 12z";

export function SparklesIcon({ filled = false, ...props }: SparklesIconProps) {
  if (filled) {
    return (
      <SvgWrapper {...props} filled>
        <Path d={SPARKLES_FILLED} />
      </SvgWrapper>
    );
  }

  return (
    <SvgWrapper {...props}>
      <Path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <Path d="M20 3v4" />
      <Path d="M22 5h-4" />
      <Path d="M4 17v2" />
      <Path d="M5 18H3" />
    </SvgWrapper>
  );
}
