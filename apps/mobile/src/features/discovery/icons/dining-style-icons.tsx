import { Circle, Path } from "react-native-svg";

import { IconPropsType } from "@/types";
import { SvgWrapper } from "@/assets/icons/components/svg-wrapper.component";

/** Dining-style Lucide icons for discovery tiles and filter chips. */

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

export function CroissantIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M10.2 18H4.774a1.5 1.5 0 0 1-1.352-.97 11 11 0 0 1 .132-6.487" />
      <Path d="M18 10.2V4.774a1.5 1.5 0 0 0-.97-1.352 11 11 0 0 0-6.486.132" />
      <Path d="M18 5a4 3 0 0 1 4 3 2 2 0 0 1-2 2 10 10 0 0 0-5.139 1.42" />
      <Path d="M5 18a3 4 0 0 0 3 4 2 2 0 0 0 2-2 10 10 0 0 1 1.42-5.14" />
      <Path d="M8.709 2.554a10 10 0 0 0-6.155 6.155 1.5 1.5 0 0 0 .676 1.626l9.807 5.42a2 2 0 0 0 2.718-2.718l-5.42-9.807a1.5 1.5 0 0 0-1.626-.676" />
    </SvgWrapper>
  );
}

export function RoseIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M17 10h-1a4 4 0 1 1 4-4v.534" />
      <Path d="M17 6h1a4 4 0 0 1 1.42 7.74l-2.29.87a6 6 0 0 1-5.339-10.68l2.069-1.31M4.5 17c2.8-.5 4.4 0 5.5.8s1.8 2.2 2.3 3.7c-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2M9.77 12C4 15 2 22 2 22" />
      <Circle cx={17} cy={8} r={2} />
    </SvgWrapper>
  );
}

/** Official Lucide `music` (exact path data). */
export function MusicIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M9 18V5l12-2v13" />
      <Circle cx={6} cy={18} r={3} />
      <Circle cx={18} cy={16} r={3} />
    </SvgWrapper>
  );
}

/** Official Lucide `piano` (exact path data) — keep for quick swap. */
export function PianoIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M18.5 8c-1.4 0-2.6-.8-3.2-2A6.87 6.87 0 0 0 2 9v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8.5C22 9.6 20.4 8 18.5 8" />
      <Path d="M2 14h20" />
      <Path d="M6 14v4" />
      <Path d="M10 14v4" />
      <Path d="M14 14v4" />
      <Path d="M18 14v4" />
    </SvgWrapper>
  );
}

export function ArrowRightIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M5 12h14" />
      <Path d="m12 5 7 7-7 7" />
    </SvgWrapper>
  );
}
