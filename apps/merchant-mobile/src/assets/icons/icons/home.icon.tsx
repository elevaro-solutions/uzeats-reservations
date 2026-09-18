import { Path } from "react-native-svg";

import { IconPropsType } from "@/types";

import { SvgWrapper } from "../components/svg-wrapper.component";

export type HomeIconProps = IconPropsType & {
  filled?: boolean;
};

const HOME_FILLED =
  "M15.014 22h-.045.045zm-5.983 0H8.97a1.08 1.08 0 00.062 0zM15.014 22h-.045A1 1 0 0114 21v-7a1 1 0 00-1-1h-2a1 1 0 00-1 1v7a1 1 0 01-.969 1H5a3 3 0 01-3-3v-9a3 3 0 011.063-2.292l6.996-5.996a3 3 0 013.668-.166l.21.163 7 6 .122.108A3.002 3.002 0 0122 10v9a3 3 0 01-3 3H15.014z";

export function HomeIcon({ filled = false, ...props }: HomeIconProps) {
  if (filled) {
    return (
      <SvgWrapper {...props} filled>
        <Path fillRule="evenodd" clipRule="evenodd" d={HOME_FILLED} />
      </SvgWrapper>
    );
  }

  return (
    <SvgWrapper {...props}>
      <Path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <Path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </SvgWrapper>
  );
}
