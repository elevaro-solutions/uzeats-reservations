import { getFontFamily } from "@/components/typography/helpers/get-font-family.helper";

export const FONT_FAMILY = {
  regular: getFontFamily("regular"),
  medium: getFontFamily("medium"),
  semibold: getFontFamily("semibold"),
  bold: getFontFamily("bold"),
} as const;
