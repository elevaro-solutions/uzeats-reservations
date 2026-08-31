import { Circle, Path, Rect } from "react-native-svg";

import { IconPropsType } from "@/types";
import { SvgWrapper } from "@/assets/icons/components/svg-wrapper.component";

/** Icons used for Accessibility and Amenities detail sections. */

export function AccessibilityIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Circle cx={16} cy={4} r={1} />
      <Path d="M18 19l1-7-6 1M5 8l3-3 5.5 3-2.36 3.5M4.24 14.5a5 5 0 006.88 6M13.76 17.5a5 5 0 00-6.88-6" />
    </SvgWrapper>
  );
}

export function PrivateDiningIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14" />
      <Path d="M2 20h20" />
      <Path d="M14 12v.01" />
    </SvgWrapper>
  );
}

export function OutdoorSeatingIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z" />
      <Path d="M7 16v6" />
      <Path d="M13 19v3" />
      <Path d="M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5" />
    </SvgWrapper>
  );
}

export function BarSeatingIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M8 22h8" />
      <Path d="M12 11v11" />
      <Path d="m19 3-7 8-7-8Z" />
    </SvgWrapper>
  );
}

export function ParkingIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Rect x={3} y={3} width={18} height={18} rx={2} />
      <Path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
    </SvgWrapper>
  );
}

export function KidsMenuIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Circle cx={12} cy={12} r={10} />
      <Path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <Path d="M9 9h.01" />
      <Path d="M15 9h.01" />
    </SvgWrapper>
  );
}

export function LiveEntertainmentIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M9 18V5l12-2v13" />
      <Circle cx={6} cy={18} r={3} />
      <Circle cx={18} cy={16} r={3} />
    </SvgWrapper>
  );
}

export function CheckIcon(props: IconPropsType) {
  return (
    <SvgWrapper {...props}>
      <Path d="M20 6 9 17l-5-5" />
    </SvgWrapper>
  );
}
