import { Circle, Path } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export type AwardIconProps = IconPropsType & {
  filled?: boolean;
};

const AWARD_FILLED =
  "M16.566 13.303a7 7 0 10-9.133 0L6.025 21.24l-.002.011a1.5 1.5 0 002.397 1.434L12.003 20l3.579 2.686a1.5 1.5 0 002.274-.55c.13-.276.171-.594.12-.895l-1.41-7.938zm-1.829 1.141A6.977 6.977 0 0112 15a6.977 6.977 0 01-2.738-.556L8.215 20.34l2.59-1.94a2.005 2.005 0 012.395-.002l2.584 1.94-1.047-5.893z";

export function AwardIcon({ filled = false, ...props }: AwardIconProps) {
  if (filled) {
    return (
      <SvgWrapper {...props} filled>
        <Path fillRule="evenodd" clipRule="evenodd" d={AWARD_FILLED} />
      </SvgWrapper>
    );
  }

  return (
    <SvgWrapper {...props}>
      <Path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526" />
      <Circle cx={12} cy={8} r={6} />
    </SvgWrapper>
  );
}
