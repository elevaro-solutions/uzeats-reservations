export type TypographyWeight = "regular" | "medium" | "semibold" | "bold";

/** Named faces registered in `src/app/_layout.tsx` via useFonts. */
export function getFontFamily(weight: TypographyWeight): string {
  const faces: Record<TypographyWeight, string> = {
    regular: "DMSans",
    medium: "DMSans Medium",
    semibold: "DMSans Semibold",
    bold: "DMSans Bold",
  };

  return faces[weight];
}
